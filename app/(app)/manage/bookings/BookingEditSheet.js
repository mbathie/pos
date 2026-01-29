'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/action-button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { IconButton } from '@/components/control-button'
import { CalendarIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useGlobals } from '@/lib/globals'
import dayjs from 'dayjs'

export default function BookingEditSheet({ open, setOpen, booking, onUpdate }) {
  const { location } = useGlobals()
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [availableDates, setAvailableDates] = useState([])
  const [timesForSelectedDate, setTimesForSelectedDate] = useState([])
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [product, setProduct] = useState(null)

  // Open schedule state
  const [customTime, setCustomTime] = useState('')
  const [customDuration, setCustomDuration] = useState(null)
  const [participantQty, setParticipantQty] = useState(1)
  const [existingScheduleData, setExistingScheduleData] = useState({ classes: [] })
  const [openScheduleAvailable, setOpenScheduleAvailable] = useState(0)

  // Helper function to check if a day is closed at the location
  const isDayClosed = (date) => {
    if (!location?.storeHours) return false

    const dayOfWeek = date.getDay()
    const storeHour = location.storeHours.find(h => h.d === dayOfWeek)

    // Day is closed if there are no store hours or both open and close are empty
    if (!storeHour || (!storeHour.open && !storeHour.close)) {
      return true
    }

    return false
  }

  // Helper function to check if a specific date is in closedDays
  const isSpecificDateClosed = (date) => {
    if (!location?.closedDays || location.closedDays.length === 0) return false

    const dateStr = dayjs(date).format('YYYY-MM-DD')

    return location.closedDays.some(closedDay => {
      const startDate = dayjs(closedDay.startDate).format('YYYY-MM-DD')
      const endDate = dayjs(closedDay.endDate).format('YYYY-MM-DD')

      return dateStr >= startDate && dateStr <= endDate
    })
  }

  // Initialize with booking's current date/time when sheet opens
  useEffect(() => {
    if (open && booking?.datetime) {
      setSelectedDate(new Date(booking.datetime))
      setCustomTime(dayjs(booking.datetime).format('HH:mm'))
      setParticipantQty(booking.totalQty || 1)
      setSelectedTime({
        datetime: booking.datetime,
        time: dayjs(booking.datetime).format('h:mm A')
      })
    }
  }, [open, booking?.datetime, booking?.totalQty])

  // Set duration from product when loaded (duration is fixed at product level)
  useEffect(() => {
    if (product?.duration?.minute) {
      setCustomDuration(product.duration.minute)
    } else if (booking?.duration) {
      setCustomDuration(booking.duration)
    }
  }, [product?.duration?.minute, booking?.duration])

  // Fetch product data when sheet opens
  useEffect(() => {
    const fetchProduct = async () => {
      if (!open || !booking?.schedule?.product?._id) return

      try {
        setLoading(true)
        const res = await fetch(`/api/products/${booking.schedule.product._id}`)
        if (res.ok) {
          const data = await res.json()
          const productData = data.product
          setProduct(productData)

          // For non-open schedule, calculate available dates
          if (!productData.openSchedule && productData.schedule?.startDate && productData.schedule?.daysOfWeek?.length) {
            const dates = calculateAvailableDates(productData.schedule)
            setAvailableDates(dates)
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [open, booking?.schedule?.product?._id])

  // Fetch existing schedule data for open schedule products
  useEffect(() => {
    const fetchScheduleData = async () => {
      if (product?.openSchedule && product?._id) {
        try {
          const res = await fetch(`/api/products/${product._id}/schedules`)
          if (res.ok) {
            const data = await res.json()
            setExistingScheduleData(data)
          }
        } catch (error) {
          console.error('Error fetching schedule data:', error)
        }
      }
    }
    fetchScheduleData()
  }, [product?._id, product?.openSchedule])

  // Update available spots when date/time changes for open schedule
  useEffect(() => {
    if (!product?.openSchedule || !selectedDate || !customTime) {
      setOpenScheduleAvailable(product?.capacity || booking?.schedule?.capacity || 0)
      return
    }

    const datetime = dayjs(selectedDate).format('YYYY-MM-DD') + 'T' + customTime
    const searchDatetime = new Date(datetime).toISOString()

    // Check if this is the current booking's slot
    const isCurrentSlot = booking?.datetime && new Date(booking.datetime).toISOString() === searchDatetime

    const matchingClass = existingScheduleData.classes?.find(cls => {
      const clsDatetime = new Date(cls.datetime).toISOString()
      return clsDatetime === searchDatetime
    })

    if (matchingClass) {
      // Add back current booking's participants if same slot
      const available = isCurrentSlot
        ? (matchingClass.available ?? 0) + (booking?.totalQty || 0)
        : (matchingClass.available ?? 0)
      setOpenScheduleAvailable(available)
    } else {
      setOpenScheduleAvailable(product?.capacity || booking?.schedule?.capacity || 0)
    }
  }, [selectedDate, customTime, existingScheduleData, product?.openSchedule, product?.capacity, booking])

  // Fetch times when date changes (for non-open schedule)
  useEffect(() => {
    const fetchTimes = async () => {
      if (!selectedDate || !product || product.openSchedule || !product.schedule) return

      try {
        const times = await getTimesForDate(selectedDate, product.schedule, product._id, participantQty)
        setTimesForSelectedDate(times)
      } catch (error) {
        console.error('Error fetching times:', error)
        setTimesForSelectedDate([])
      }
    }

    fetchTimes()
  }, [selectedDate, product, participantQty])

  // Calculate available dates from schedule config (for non-open schedule)
  const calculateAvailableDates = (schedule) => {
    if (!schedule?.startDate || !schedule?.daysOfWeek?.length) {
      return []
    }

    const dates = []
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const sixMonthsLater = new Date()
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6)

    const start = new Date(schedule.startDate)
    const current = new Date(Math.max(start, now))

    while (current <= sixMonthsLater) {
      const dayOfWeek = current.getDay()
      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1

      const dayConfig = schedule.daysOfWeek.find(d => d.dayIndex === adjustedDayOfWeek)
      if (dayConfig && dayConfig.times?.some(t => t.selected)) {
        dates.push(dayjs(current).format('YYYY-MM-DD'))
      }

      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  // Get times for a specific date (for non-open schedule)
  const getTimesForDate = async (date, schedule, productId, requiredCapacity) => {
    if (!date || !schedule?.daysOfWeek?.length) return []

    const times = []
    const dayOfWeek = date.getDay()
    const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    const dayConfig = schedule.daysOfWeek.find(d => d.dayIndex === adjustedDayOfWeek)
    if (!dayConfig || !dayConfig.times?.some(t => t.selected)) {
      return []
    }

    const res = await fetch(`/api/products/${productId}/schedules`)
    const scheduleData = res.ok ? await res.json() : { classes: [] }

    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    const selectedDateStr = dayjs(date).format('YYYY-MM-DD')
    const todayStr = dayjs(now).format('YYYY-MM-DD')
    const isToday = selectedDateStr === todayStr

    dayConfig.times.forEach(timeItem => {
      if (!timeItem.selected) return

      const timeStr = timeItem.time
      const timeLabel = timeItem.label || ''

      if (timeStr) {
        const [hours, minutes] = timeStr.split(':')
        const classDateTime = new Date(date)
        classDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

        if (isToday && classDateTime < thirtyMinutesAgo) return

        const iso = classDateTime.toISOString()

        const match = scheduleData.classes?.find(s => {
          return new Date(s.datetime).toISOString() === iso
        })

        const bookedCount = match?.customers?.length || 0
        const capacity = booking?.schedule?.capacity || product?.capacity || 20
        const available = capacity - bookedCount

        const isCurrentSlot = booking?.datetime && new Date(booking.datetime).toISOString() === iso
        const effectiveAvailable = isCurrentSlot ? available + (booking?.totalQty || 0) : available

        times.push({
          datetime: iso,
          time: dayjs(classDateTime).format('h:mm A'),
          label: timeLabel,
          available: effectiveAvailable,
          isCurrentSlot,
          hasEnoughCapacity: effectiveAvailable >= requiredCapacity
        })
      }
    })

    return times.sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
  }

  const handleSave = async () => {
    let newDatetime

    if (product?.openSchedule) {
      if (!selectedDate || !customTime || !customDuration) {
        return { error: true, message: 'Please select date, time, and duration' }
      }
      newDatetime = dayjs(selectedDate).format('YYYY-MM-DD') + 'T' + customTime
      newDatetime = new Date(newDatetime).toISOString()
    } else {
      if (!selectedTime?.datetime) {
        return { error: true, message: 'Please select a time slot' }
      }
      newDatetime = selectedTime.datetime
    }

    // Check if it's the same datetime and qty
    const sameDateTime = new Date(newDatetime).toISOString() === new Date(booking.datetime).toISOString()
    const sameQty = participantQty === booking.totalQty

    if (sameDateTime && sameQty) {
      setOpen(false)
      return { error: false }
    }

    try {
      // Get price per participant for invoice updates
      const pricePerParticipant = product?.prices?.[0]?.value || 0

      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: booking.scheduleId,
          oldDatetime: booking.datetime,
          newDatetime,
          newQty: participantQty,
          pricePerParticipant,
          duration: product?.openSchedule ? customDuration : undefined
        })
      })

      if (!res.ok) {
        const data = await res.json()
        return { error: true, message: data.error || 'Failed to update booking' }
      }

      toast.success('Booking updated successfully')
      setOpen(false)
      onUpdate?.(newDatetime)
      return { error: false }
    } catch (error) {
      return { error: true, message: error.message }
    }
  }

  if (!booking) return null

  const isOpenSchedule = product?.openSchedule
  const capacity = product?.capacity || booking?.schedule?.capacity || 20

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-[75vw] sm:max-w-[75vw] overflow-y-auto p-4">
        <SheetHeader className="m-0 p-0 mt-4">
          <SheetTitle>Edit Booking</SheetTitle>
          <SheetDescription>
            Change the date, time, and participants for this booking
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {/* Current Booking Info */}
          <div className="p-3 bg-muted/50 rounded-md space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>Currently: {dayjs(booking.datetime).format('dddd, MMMM D, YYYY [at] h:mm A')}</span>
            </div>
          </div>

          {/* Date Selector */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Select Date</h3>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal cursor-pointer",
                    !selectedDate && "text-muted-foreground"
                  )}
                  disabled={loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? dayjs(selectedDate).format('MMM D, YYYY') : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date)
                    if (!isOpenSchedule) {
                      setSelectedTime(null)
                    }
                    setCalendarOpen(false)
                  }}
                  disabled={(date) => {
                    // Past dates are always disabled
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    if (date < today) return true

                    // For open schedule, check store hours and closed days
                    if (isOpenSchedule) {
                      // Disable if the day is closed at the location
                      if (isDayClosed(date)) return true
                      // Disable if the date is in closedDays
                      if (isSpecificDateClosed(date)) return true
                      return false
                    }

                    // For regular schedule, only allow dates with scheduled times
                    const dateStr = dayjs(date).format('YYYY-MM-DD')
                    return !availableDates.includes(dateStr)
                  }}
                  initialFocus
                  fromDate={new Date()}
                  toDate={(() => {
                    const date = new Date()
                    date.setMonth(date.getMonth() + 6)
                    return date
                  })()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Open Schedule: Custom Time and Duration */}
          {isOpenSchedule && selectedDate && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Time for {dayjs(selectedDate).format('dddd, MMMM D')}
              </h3>
              <div className="border rounded-md space-y-3 p-3">
                {/* Time and Duration Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Start Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          type="time"
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          className="pl-7 h-8 w-32"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Duration</Label>
                      <div className="h-8 flex items-center text-sm">
                        {customDuration} min
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm",
                    participantQty > openScheduleAvailable
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  )}>
                    {openScheduleAvailable} spot{openScheduleAvailable !== 1 ? 's' : ''} available
                  </span>
                </div>

                {/* Participants */}
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs text-muted-foreground">Participants</Label>
                  <div className="flex items-center gap-2">
                    <IconButton
                      icon="minus"
                      onClick={() => setParticipantQty(Math.max(1, participantQty - 1))}
                      disabled={participantQty <= 1}
                    />
                    <IconButton
                      icon="plus"
                      onClick={() => setParticipantQty(participantQty + 1)}
                      disabled={participantQty >= openScheduleAvailable}
                    />
                    <span className="flex-1">
                      {product?.prices?.[0]?.name || 'Participant'}
                      {product?.prices?.[0]?.minor && (
                        <Badge variant="secondary" className="text-xs ml-1">Minor</Badge>
                      )}
                    </span>
                    <span className="w-12 text-center">{participantQty}x</span>
                    <span className="w-24 text-right">
                      {(() => {
                        const qtyDiff = participantQty - (booking?.totalQty || 0)
                        const priceDiff = qtyDiff * (product?.prices?.[0]?.value || 0)
                        if (priceDiff === 0) return '$0.00'
                        return priceDiff > 0 ? `+$${priceDiff.toFixed(2)}` : `-$${Math.abs(priceDiff).toFixed(2)}`
                      })()}
                    </span>
                  </div>
                </div>

                {/* Warning when insufficient spots */}
                {participantQty > openScheduleAvailable && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    <strong>Insufficient spots available.</strong> This time slot only has {openScheduleAvailable} spot{openScheduleAvailable !== 1 ? 's' : ''} remaining.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Non-Open Schedule: Time Slots */}
          {!isOpenSchedule && selectedDate && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Available Times for {dayjs(selectedDate).format('dddd, MMMM D')}
              </h3>

              {/* Participants Selector */}
              <div className="border rounded-md p-3 mb-3">
                <Label className="text-xs text-muted-foreground">Participants</Label>
                <div className="flex items-center gap-2 mt-1">
                  <IconButton
                    icon="minus"
                    onClick={() => setParticipantQty(Math.max(1, participantQty - 1))}
                    disabled={participantQty <= 1}
                  />
                  <IconButton
                    icon="plus"
                    onClick={() => setParticipantQty(participantQty + 1)}
                    disabled={participantQty >= capacity}
                  />
                  <span className="flex-1">
                    {product?.prices?.[0]?.name || 'Participant'}
                    {product?.prices?.[0]?.minor && (
                      <Badge variant="secondary" className="text-xs ml-1">Minor</Badge>
                    )}
                  </span>
                  <span className="w-12 text-center">{participantQty}x</span>
                  <span className="w-24 text-right">
                    {(() => {
                      const qtyDiff = participantQty - (booking?.totalQty || 0)
                      const priceDiff = qtyDiff * (product?.prices?.[0]?.value || 0)
                      if (priceDiff === 0) return '$0.00'
                      return priceDiff > 0 ? `+$${priceDiff.toFixed(2)}` : `-$${Math.abs(priceDiff).toFixed(2)}`
                    })()}
                  </span>
                </div>
              </div>

              {timesForSelectedDate.length === 0 ? (
                <div className="p-4 border rounded-md bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground">
                    No available times for this date
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {timesForSelectedDate.map((time) => {
                      const isSelected = selectedTime?.datetime === time.datetime

                      return (
                        <button
                          key={time.datetime}
                          onClick={() => time.hasEnoughCapacity && setSelectedTime(time)}
                          disabled={!time.hasEnoughCapacity}
                          className={cn(
                            "w-full p-3 border rounded-md text-left transition-colors cursor-pointer",
                            isSelected && "border-primary bg-primary/5",
                            !isSelected && time.hasEnoughCapacity && "hover:bg-muted/50",
                            !time.hasEnoughCapacity && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{time.time}</span>
                              {time.label && (
                                <Badge variant="secondary" className="text-xs">{time.label}</Badge>
                              )}
                              {time.isCurrentSlot && (
                                <Badge variant="outline" className="text-xs">Current</Badge>
                              )}
                            </div>
                            <span className={cn(
                              "text-sm",
                              time.hasEnoughCapacity ? "text-muted-foreground" : "text-destructive"
                            )}>
                              {time.available} available
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="cursor-pointer flex-1"
          >
            Cancel
          </Button>
          <ActionButton
            action={handleSave}
            requireAreYouSure
            areYouSureDescription={(() => {
              const qtyDiff = participantQty - (booking?.totalQty || 0)
              const pricePerParticipant = product?.prices?.[0]?.value || 0
              const priceDiff = qtyDiff * pricePerParticipant

              // Get the new datetime for display
              let newDatetime
              if (isOpenSchedule) {
                newDatetime = dayjs(selectedDate).format('YYYY-MM-DD') + 'T' + customTime
              } else {
                newDatetime = selectedTime?.datetime
              }
              const newDateFormatted = newDatetime ? dayjs(newDatetime).format('ddd, MMM D, YYYY [at] h:mm A') : ''
              const oldDateFormatted = dayjs(booking?.datetime).format('ddd, MMM D, YYYY [at] h:mm A')

              // Check what's changing
              const dateChanged = newDatetime && new Date(newDatetime).toISOString() !== new Date(booking?.datetime).toISOString()
              const qtyChanged = qtyDiff !== 0

              let message = ''

              // Date/time change info
              if (dateChanged) {
                message += `Reschedule to: ${newDateFormatted}\n\n`
              }

              // Qty change info
              if (qtyChanged) {
                message += `Participants: ${booking?.totalQty || 0} → ${participantQty}`
                if (qtyDiff > 0) {
                  message += ` (+${qtyDiff})`
                } else {
                  message += ` (${qtyDiff})`
                }
                message += `\nInvoice adjustment: ${priceDiff >= 0 ? '+' : '-'}$${Math.abs(priceDiff).toFixed(2)}`
                message += `\n\nThe existing invoice will be voided and a new invoice will be sent.`
              } else if (dateChanged) {
                message += `Participants: ${participantQty} (no change)`
              }

              return message || 'No changes detected.'
            })()}
            disabled={
              isOpenSchedule
                ? !selectedDate || !customTime || !customDuration || participantQty > openScheduleAvailable
                : !selectedTime
            }
            className="cursor-pointer flex-1"
          >
            Save Changes
          </ActionButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
