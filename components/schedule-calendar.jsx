'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const TYPE_COLORS = {
  class: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  course: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  group: 'bg-green-500/20 text-green-400 border-green-500/30',
  default: 'bg-primary/20 text-primary border-primary/30'
}

export function ScheduleCalendar({ className, onEventClick, compact = false }) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(dayjs())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [daySheetOpen, setDaySheetOpen] = useState(false)

  // Fetch events for the current month
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      try {
        const month = currentDate.format('YYYY-MM')
        const res = await fetch(`/api/calendar?month=${month}`)
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events || [])
        }
      } catch (error) {
        console.error('Error fetching calendar events:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [currentDate])

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped = {}
    for (const event of events) {
      const day = dayjs(event.datetime).format('YYYY-MM-DD')
      if (!grouped[day]) {
        grouped[day] = []
      }
      grouped[day].push(event)
    }
    return grouped
  }, [events])

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const startOfMonth = currentDate.startOf('month')
    const endOfMonth = currentDate.endOf('month')
    const startDay = startOfMonth.day() // 0-6 (Sunday-Saturday)
    const daysInMonth = endOfMonth.date()

    const days = []

    // Add empty cells for days before the start of the month
    for (let i = 0; i < startDay; i++) {
      const prevMonthDay = startOfMonth.subtract(startDay - i, 'day')
      days.push({
        date: prevMonthDay,
        isCurrentMonth: false,
        key: prevMonthDay.format('YYYY-MM-DD')
      })
    }

    // Add days of the current month
    for (let i = 1; i <= daysInMonth; i++) {
      const day = currentDate.date(i)
      days.push({
        date: day,
        isCurrentMonth: true,
        key: day.format('YYYY-MM-DD')
      })
    }

    // Add empty cells for days after the end of the month to complete the grid
    const remainingCells = 42 - days.length // 6 rows × 7 days
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonthDay = endOfMonth.add(i, 'day')
      days.push({
        date: nextMonthDay,
        isCurrentMonth: false,
        key: nextMonthDay.format('YYYY-MM-DD')
      })
    }

    return days
  }, [currentDate])

  const goToPreviousMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'))
  }

  const goToNextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'))
  }

  const goToToday = () => {
    setCurrentDate(dayjs())
  }

  const handleMonthChange = (month) => {
    setCurrentDate(currentDate.month(parseInt(month)))
  }

  const handleYearChange = (year) => {
    setCurrentDate(currentDate.year(parseInt(year)))
  }

  // Generate year options (5 years back, 5 years forward)
  const currentYear = dayjs().year()
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  const handleDayClick = (day) => {
    const dayKey = day.date.format('YYYY-MM-DD')
    const dayEvents = eventsByDay[dayKey] || []
    if (dayEvents.length > 0 || !compact) {
      setSelectedDay({ ...day, events: dayEvents })
      setDaySheetOpen(true)
    }
  }

  const handleEventClick = (event) => {
    if (onEventClick) {
      onEventClick(event)
    } else {
      // Default: navigate to schedule page
      router.push(`/manage/schedules/${event.scheduleId}`)
    }
  }

  const getTypeColor = (type) => {
    return TYPE_COLORS[type] || TYPE_COLORS.default
  }

  const isToday = (day) => {
    return day.date.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Select value={currentDate.month().toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, idx) => (
                <SelectItem key={month} value={idx.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={currentDate.year().toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="cursor-pointer"
          >
            Today
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            className="cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            className="cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-muted/50 shrink-0">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground border-b"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 grid-rows-6 flex-1">
          {calendarDays.map((day) => {
            const dayKey = day.key
            const dayEvents = eventsByDay[dayKey] || []
            const hasEvents = dayEvents.length > 0

            return (
              <div
                key={dayKey}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'p-1 border-b border-r cursor-pointer transition-colors hover:bg-muted/50 overflow-hidden',
                  !day.isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                  isToday(day) && 'bg-primary/5'
                )}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full',
                      isToday(day) && 'bg-primary text-primary-foreground'
                    )}
                  >
                    {day.date.date()}
                  </span>
                  {hasEvents && (
                    <span className="text-xs text-muted-foreground">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Events */}
                <div className="space-y-0.5 overflow-hidden">
                  {dayEvents.slice(0, compact ? 2 : 3).map((event, idx) => (
                    <div
                      key={event._id || idx}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEventClick(event)
                      }}
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded truncate border cursor-pointer hover:opacity-80',
                        getTypeColor(event.product?.type)
                      )}
                      title={`${event.product?.name} - ${dayjs(event.datetime).format('h:mm A')}`}
                    >
                      {compact ? (
                        <span className="font-medium">{dayjs(event.datetime).format('HH:mm')}</span>
                      ) : (
                        <>
                          <span className="font-medium">{dayjs(event.datetime).format('h:mm A')}</span>
                          <span className="ml-1 opacity-80">{event.companyName || event.product?.name}</span>
                        </>
                      )}
                    </div>
                  ))}
                  {dayEvents.length > (compact ? 2 : 3) && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayEvents.length - (compact ? 2 : 3)} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day Detail Sheet */}
      <Sheet open={daySheetOpen} onOpenChange={setDaySheetOpen}>
        <SheetContent className="sm:max-w-[700px] flex flex-col h-full">

          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CalendarIcon className="size-5" />
              {selectedDay?.date.format('dddd, MMMM D, YYYY')}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 mt-6 space-y-3">
            {selectedDay?.events?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No scheduled events for this day
              </p>
            ) : (
              selectedDay?.events?.map((event, idx) => (
                <Card
                  key={event._id || idx}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    handleEventClick(event)
                    setDaySheetOpen(false)
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {event.product?.thumbnail && (
                        <img
                          src={event.product.thumbnail}
                          alt={event.product.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {event.companyName || event.product?.name}
                          </span>
                          <Badge variant="outline" className={cn('text-xs', getTypeColor(event.product?.type))}>
                            {event.product?.type}
                          </Badge>
                        </div>
                        {event.companyName && (
                          <div className="text-xs text-muted-foreground">
                            {event.product?.name}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {dayjs(event.datetime).format('h:mm A')}
                          {event.duration && ` · ${event.duration} min`}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {event.customerCount} / {event.capacity || '∞'} booked
                          {event.label && ` · ${event.label}`}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
    </div>
  )
}
