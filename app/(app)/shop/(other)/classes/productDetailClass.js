'use client'

import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { CalendarIcon, Clock } from "lucide-react"
import { useGlobals } from '@/lib/globals'
import { useState, useEffect } from 'react'
import { calcCartValueClass, cleanupProduct } from '@/lib/product'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { IconButton, SelectionCheck } from '@/components/control-button'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { useClass } from './useClass'
import dayjs from 'dayjs'

export default function ProductDetail({ product, setProduct, setOpen, open, onAddToCart, isPartOfGroup = false, groupHasPriceOverride = true }) {

  if (!product) return null;

  const { addToCart, location } = useGlobals()
  const { getAvailableDates, getTimesForDate } = useClass({ product, setProduct })
  const [total, setTotal] = useState(0)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTimes, setSelectedTimes] = useState([]) // Array of { ...time, quantities: { [priceIdx]: qty } }
  const [availableDates, setAvailableDates] = useState([])
  const [timesForSelectedDate, setTimesForSelectedDate] = useState([])
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Open schedule state
  const [customTime, setCustomTime] = useState('')
  const [customDuration, setCustomDuration] = useState(product?.duration?.minute || null)
  const [priceQuantities, setPriceQuantities] = useState({})
  const [existingScheduleData, setExistingScheduleData] = useState({ classes: [] })
  const [openScheduleAvailable, setOpenScheduleAvailable] = useState(product?.capacity || 0)

  // Alert dialog state
  const [showOverlapAlert, setShowOverlapAlert] = useState(false)

  // Initialize price quantities for group products
  useEffect(() => {
    if (isPartOfGroup && product?.groupQty && product?.prices?.length > 0) {
      // Set the first price tier to the group quantity
      setPriceQuantities({ 0: product.groupQty });
    }
  }, [isPartOfGroup, product?.groupQty, product?.prices])

  // Fetch existing schedule data for open schedule products
  useEffect(() => {
    const fetchScheduleData = async () => {
      if (product?.openSchedule && product?._id) {
        try {
          const res = await fetch(`/api/products/${product._id}/schedules`);
          if (res.ok) {
            const data = await res.json();
            setExistingScheduleData(data);
          }
        } catch (error) {
          console.error('Error fetching schedule data:', error);
        }
      }
    };
    fetchScheduleData();
  }, [product?._id, product?.openSchedule])

  // Update available spots when date/time changes for open schedule
  useEffect(() => {
    if (!product?.openSchedule || !selectedDate || !customTime) {
      setOpenScheduleAvailable(product?.capacity || 0);
      return;
    }

    // Build the datetime string to match
    const datetime = dayjs(selectedDate).format('YYYY-MM-DD') + 'T' + customTime;
    const searchDatetime = new Date(datetime).toISOString();

    // Find matching class in existing schedule data
    const matchingClass = existingScheduleData.classes?.find(cls => {
      const clsDatetime = new Date(cls.datetime).toISOString();
      return clsDatetime === searchDatetime;
    });

    if (matchingClass) {
      // Use the available spots from existing booking
      setOpenScheduleAvailable(matchingClass.available ?? 0);
    } else {
      // No existing booking, full capacity available
      setOpenScheduleAvailable(product?.capacity || 0);
    }
  }, [selectedDate, customTime, existingScheduleData, product?.openSchedule, product?.capacity])

  // Restore selectedDate and selectedTimes from previously configured product
  // OR pre-select date/time from group's scheduled date/time
  useEffect(() => {
    if (product?.selectedTimes && product.selectedTimes.length > 0) {
      // Restore selected times
      setSelectedTimes(product.selectedTimes);

      // Extract and restore selected date from the first selected time
      if (product.selectedTimes[0]?.datetime) {
        const date = new Date(product.selectedTimes[0].datetime);
        setSelectedDate(date);
      }
    } else if (product?.groupScheduledDate && isPartOfGroup) {
      // Pre-select the group's scheduled date for group products
      setSelectedDate(new Date(product.groupScheduledDate));

      // Pre-select the group's scheduled time for openSchedule products
      if (product?.groupScheduledTime && product.openSchedule) {
        setCustomTime(product.groupScheduledTime);
      }
    }
  }, [product?._id, product?.groupScheduledDate, product?.groupScheduledTime, isPartOfGroup, product?.openSchedule])

  // Auto-select time slot when times are loaded and group scheduled time matches
  useEffect(() => {
    if (!isPartOfGroup || !product?.groupScheduledTime || product?.openSchedule) return;
    if (selectedTimes.length > 0) return; // Already has a selection
    if (timesForSelectedDate.length === 0) return;

    // Convert group time (HH:mm format like "11:00") to match the time format in timesForSelectedDate
    const groupTime = product.groupScheduledTime;
    const [hours, minutes] = groupTime.split(':').map(Number);
    const groupDate = product.groupScheduledDate ? new Date(product.groupScheduledDate) : null;

    if (!groupDate) return;

    // Build expected ISO datetime for matching
    const expectedDateTime = new Date(groupDate);
    expectedDateTime.setHours(hours, minutes, 0, 0);
    const expectedIso = expectedDateTime.toISOString();

    // Find matching time slot
    const matchingTime = timesForSelectedDate.find(t => t.datetime === expectedIso);

    if (matchingTime && !matchingTime.conflict) {
      const groupQty = product.groupQty || 1;
      // Auto-select if there's enough capacity
      if (matchingTime.available >= groupQty) {
        setSelectedTimes([{
          ...matchingTime,
          quantities: { 0: groupQty }
        }]);
      }
    }
  }, [timesForSelectedDate, isPartOfGroup, product?.groupScheduledTime, product?.groupScheduledDate, product?.openSchedule, product?.groupQty])

  // Helper function to check if a day is closed at the location
  const isDayClosed = (date) => {
    if (!location?.storeHours) return false;

    const dayOfWeek = date.getDay();
    const storeHour = location.storeHours.find(h => h.d === dayOfWeek);

    // Day is closed if there are no store hours or both open and close are empty
    if (!storeHour || (!storeHour.open && !storeHour.close)) {
      return true;
    }

    return false;
  }

  // Helper function to check if a specific date is in closedDays
  const isSpecificDateClosed = (date) => {
    if (!location?.closedDays || location.closedDays.length === 0) return false;

    const dateStr = dayjs(date).format('YYYY-MM-DD');

    return location.closedDays.some(closedDay => {
      const startDate = dayjs(closedDay.startDate).format('YYYY-MM-DD');
      const endDate = dayjs(closedDay.endDate).format('YYYY-MM-DD');

      return dateStr >= startDate && dateStr <= endDate;
    });
  }

  // Calculate total quantity purchased
  const totalQuantity = product.openSchedule
    ? Object.values(priceQuantities).reduce((sum, q) => sum + q, 0)
    : selectedTimes.reduce((sum, time) => {
        if (time.quantities) {
          return sum + Object.values(time.quantities).reduce((s, q) => s + q, 0);
        }
        return sum;
      }, 0);

  // Check if minimum purchase requirement is met
  const minPurchase = product.minPurchase || null;
  const meetsMinPurchase = minPurchase === null || totalQuantity >= minPurchase;

  // Calculate total based on selected times and their quantities OR open schedule quantities
  useEffect(() => {
    let subtotal = 0;
    if (product.openSchedule) {
      // Calculate from priceQuantities for open schedule
      Object.entries(priceQuantities).forEach(([priceIdx, qty]) => {
        const price = product.prices[parseInt(priceIdx)];
        if (price && qty > 0) {
          subtotal += price.value * qty;
        }
      });
    } else {
      // Calculate from selectedTimes for regular schedule
      selectedTimes.forEach(time => {
        if (time.quantities) {
          Object.entries(time.quantities).forEach(([priceIdx, qty]) => {
            const price = product.prices[parseInt(priceIdx)];
            if (price && qty > 0) {
              subtotal += price.value * qty;
            }
          });
        }
      });
    }
    setTotal(subtotal);
  }, [selectedTimes, priceQuantities, product.prices, product.openSchedule])
  
  // Get available dates when product changes
  useEffect(() => {
    if (product?.schedule) {
      const dates = getAvailableDates(product.schedule);
      setAvailableDates(dates);
    } else {
      setAvailableDates([]);
    }
  }, [product?._id, product?.schedule])
  
  // Get times for selected date
  useEffect(() => {
    const fetchTimes = async () => {
      if (selectedDate && product?.schedule) {
        const times = await getTimesForDate(selectedDate, product.schedule);
        setTimesForSelectedDate(times);
      } else {
        setTimesForSelectedDate([]);
      }
    };
    fetchTimes();
  }, [selectedDate, product?.schedule])
  
  return (
    <>
    <Sheet open={open} onOpenChange={(newOpen) => {
      // Don't allow closing the sheet if alert is showing
      if (!newOpen && showOverlapAlert) {
        return;
      }
      setOpen(newOpen);
    }} modal={false}>
      <SheetContent className="sm:max-w-[700px] flex flex-col h-full">

        <SheetHeader className=''>
          <SheetTitle>
            <div className='flex items-center space-x-2'>
              {product.thumbnail && (
                <img
                  src={product.thumbnail}
                  alt={product.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              )}
              <div>{product?.name?.length > 20 ? `${product.name.substring(0, 20)}...` : product?.name}</div>
            </div>
          </SheetTitle>
          <SheetDescription>
            {product.desc?.length > 100 ? `${product.desc.substring(0, 100)}...` : product.desc}
          </SheetDescription>
        </SheetHeader>

        <div className='flex flex-col mx-4 gap-4'>

          {/* Date Selector */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Select Date</h3>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
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
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => {
                    // For openSchedule products, disable based on location hours and closed days
                    if (product.openSchedule) {
                      // Disable past dates
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (date < today) return true;

                      // Disable if the day is closed at the location
                      if (isDayClosed(date)) return true;

                      // Disable if the date is in closedDays
                      if (isSpecificDateClosed(date)) return true;

                      return false;
                    }

                    // For regular scheduled products, use availableDates
                    const dateStr = dayjs(date).format('YYYY-MM-DD');
                    return !availableDates.includes(dateStr);
                  }}
                  initialFocus
                  fromDate={new Date()}
                  toDate={(() => {
                    const date = new Date();
                    date.setMonth(date.getMonth() + 6);
                    return date;
                  })()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Open Schedule: Custom Time and Duration Inputs */}
          {product.openSchedule && selectedDate && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Custom Time for {dayjs(selectedDate).format('dddd, MMMM D')}
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
                      <Label className="text-xs text-muted-foreground">Duration (min)</Label>
                      <div className="h-8 flex items-center text-sm font-medium">
                        {customDuration || '-'}
                      </div>
                    </div>
                  </div>
                  {product.capacity && (
                    <span className={cn(
                      "text-sm",
                      Object.values(priceQuantities).reduce((sum, q) => sum + q, 0) > openScheduleAvailable
                        ? "text-destructive font-medium"
                        : "text-muted-foreground"
                    )}>
                      {openScheduleAvailable} spot{openScheduleAvailable !== 1 ? 's' : ''} available
                    </span>
                  )}
                </div>

                {/* Participants Selection */}
                <div className="space-y-2 pl-2">
                  {product.prices?.map((price, priceIdx) => {
                    const qty = priceQuantities[priceIdx] || 0;
                    const totalQty = Object.values(priceQuantities).reduce((sum, q) => sum + q, 0);
                    const atCapacity = openScheduleAvailable <= 0 || totalQty >= openScheduleAvailable;

                    return (
                      <div key={priceIdx} className="flex items-center gap-2">
                        {!isPartOfGroup && (
                          <>
                            <IconButton
                              icon="minus"
                              onClick={() => {
                                setPriceQuantities(prev => ({
                                  ...prev,
                                  [priceIdx]: Math.max(0, (prev[priceIdx] || 0) - 1)
                                }));
                              }}
                              disabled={qty === 0}
                            />
                            <IconButton
                              icon="plus"
                              onClick={() => {
                                setPriceQuantities(prev => ({
                                  ...prev,
                                  [priceIdx]: (prev[priceIdx] || 0) + 1
                                }));
                              }}
                              disabled={atCapacity}
                            />
                          </>
                        )}
                        <span className="flex-1">
                          {price.name}
                          {price.minor && (
                            <Badge variant="secondary" className="text-xs ml-1">Minor</Badge>
                          )}
                        </span>
                        <span className="w-12 text-center">{qty}x</span>
                        <span className="w-16 text-right">${parseFloat(price.value || 0).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Warning when insufficient spots */}
                {Object.values(priceQuantities).reduce((sum, q) => sum + q, 0) > openScheduleAvailable && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    <strong>Insufficient spots available.</strong> This time slot only has {openScheduleAvailable} spot{openScheduleAvailable !== 1 ? 's' : ''} remaining, but {Object.values(priceQuantities).reduce((sum, q) => sum + q, 0)} {Object.values(priceQuantities).reduce((sum, q) => sum + q, 0) === 1 ? 'is' : 'are'} required.
                  </div>
                )}

                {/* Warning when minimum purchase not met */}
                {minPurchase && totalQuantity > 0 && totalQuantity < minPurchase && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-sm text-amber-700 dark:text-amber-400">
                    <strong>Minimum purchase required.</strong> You must purchase at least {minPurchase} spot{minPurchase !== 1 ? 's' : ''} for this class ({totalQuantity} selected).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No times available message */}
          {!product.openSchedule && selectedDate && timesForSelectedDate.length === 0 && (
            <div className="p-4 border rounded-md bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                No class times available for {dayjs(selectedDate).format('dddd, MMMM D')}.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please select a different date from the calendar.
              </p>
            </div>
          )}

          {/* Time Slots with +/- buttons per price */}
          {!product.openSchedule && selectedDate && timesForSelectedDate.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Available Times for {dayjs(selectedDate).format('dddd, MMMM D')}
              </h3>
              <ScrollArea className="h-[400px] py-3">
                <div className="space-y-4">
                  {timesForSelectedDate.map((time) => {
                    const selectedTime = selectedTimes.find(t => t.datetime === time.datetime);
                    const totalQtyForTime = selectedTime?.quantities
                      ? Object.values(selectedTime.quantities).reduce((sum, q) => sum + q, 0)
                      : 0;

                    return (
                      <div
                        key={time.datetime}
                        className={cn(
                          "p-3 border rounded-md space-y-2",
                          time.conflict && "opacity-60 bg-muted",
                          selectedTime && "bg-accent/5 border-primary"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{time.time}</span>
                            {time.label && (
                              <Badge variant="secondary" className="text-xs">{time.label}</Badge>
                            )}
                            {time.conflict && (
                              <Badge variant="destructive" className="text-xs">{time.conflictReason}</Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {time.conflict
                              ? 'Unavailable'
                              : `${time.available - totalQtyForTime}/${time.available} spots`
                            }
                          </span>
                        </div>

                        {!time.conflict && time.available > 0 && (
                          <div className="space-y-2 pl-2">
                            {isPartOfGroup ? (
                              // Checkbox for group products - select entire time slot
                              (() => {
                                const groupQty = product.groupQty || 1;
                                const insufficientSpots = groupQty > time.available;

                                return (
                                  <div className="flex items-center gap-3 py-2">
                                    <SelectionCheck
                                      checked={selectedTimes.some(t => t.datetime === time.datetime)}
                                      disabled={insufficientSpots}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          // Select this time slot, clear any others, set first price tier to group qty
                                          setSelectedTimes([{
                                            ...time,
                                            quantities: { 0: groupQty }
                                          }]);
                                        } else {
                                          // Deselect this time slot
                                          setSelectedTimes(prev => prev.filter(t => t.datetime !== time.datetime));
                                        }
                                      }}
                                    />
                                    <span
                                      className={`flex-1 text-sm ${insufficientSpots ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                      Select this time slot ({groupQty}x {product.prices?.[0]?.name || 'Adult'})
                                      {insufficientSpots && (
                                        <span className="text-xs text-destructive ml-2">
                                          (Insufficient spots)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              // Regular +/- buttons for non-group products
                              product.prices?.map((price, priceIdx) => {
                                const qty = selectedTime?.quantities?.[priceIdx] || 0;
                                const atCapacity = totalQtyForTime >= time.available;

                                return (
                                  <div key={priceIdx} className="flex items-center gap-2">
                                    <IconButton
                                      icon="minus"
                                      onClick={() => {
                                        setSelectedTimes(prev => {
                                          const existing = prev.find(t => t.datetime === time.datetime);
                                          if (existing) {
                                            const newQty = Math.max(0, (existing.quantities?.[priceIdx] || 0) - 1);
                                            if (newQty === 0) {
                                              // Remove this price from quantities
                                              const newQuantities = { ...existing.quantities };
                                              delete newQuantities[priceIdx];

                                              // If no quantities left, remove the time entirely
                                              if (Object.keys(newQuantities).length === 0) {
                                                return prev.filter(t => t.datetime !== time.datetime);
                                              }

                                              return prev.map(t =>
                                                t.datetime === time.datetime
                                                  ? { ...t, quantities: newQuantities }
                                                  : t
                                              );
                                            }
                                            return prev.map(t =>
                                              t.datetime === time.datetime
                                                ? { ...t, quantities: { ...t.quantities, [priceIdx]: newQty } }
                                                : t
                                            );
                                          }
                                          return prev;
                                        });
                                      }}
                                      disabled={qty === 0}
                                    />
                                    <IconButton
                                      icon="plus"
                                      onClick={() => {
                                        setSelectedTimes(prev => {
                                          const existing = prev.find(t => t.datetime === time.datetime);
                                          if (existing) {
                                            return prev.map(t =>
                                              t.datetime === time.datetime
                                                ? { ...t, quantities: { ...t.quantities, [priceIdx]: (t.quantities?.[priceIdx] || 0) + 1 } }
                                                : t
                                            );
                                          } else {
                                            return [...prev, { ...time, quantities: { [priceIdx]: 1 } }];
                                          }
                                        });
                                      }}
                                      disabled={atCapacity}
                                    />
                                    <span className="flex-1">
                                      {price.name}
                                      {price.minor && (
                                        <Badge variant="secondary" className="text-xs ml-1">Minor</Badge>
                                      )}
                                    </span>
                                    <span className="w-12 text-center">{qty}x</span>
                                    <span className="w-16 text-right">${parseFloat(price.value || 0).toFixed(2)}</span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Warning when minimum purchase not met */}
              {minPurchase && totalQuantity > 0 && totalQuantity < minPurchase && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-sm text-amber-700 dark:text-amber-400">
                  <strong>Minimum purchase required.</strong> You must purchase at least {minPurchase} spot{minPurchase !== 1 ? 's' : ''} for this class ({totalQuantity} selected).
                </div>
              )}
            </div>
          )}

        </div>

        <SheetFooter>
          <div className='flex'>
            <div className='uppercase font-semibold'>total</div>
            <div className='ml-auto'>
              ${total.toFixed(2)}
            </div>
          </div>

          {onAddToCart ? (
            <>
            <Button
              type="submit"
              className='cursor-pointer w-full'
              disabled={
                product.openSchedule
                  ? !selectedDate || !customTime || !customDuration || Object.values(priceQuantities).every(q => q === 0) || Object.values(priceQuantities).reduce((sum, q) => sum + q, 0) > openScheduleAvailable || !meetsMinPurchase
                  : selectedTimes.length === 0 || !meetsMinPurchase
              }
              onClick={async () => {
                if (product.openSchedule) {
                  // Check for overlaps
                  const datetime = dayjs(selectedDate).format('YYYY-MM-DD') + 'T' + customTime;
                  const overlapCheck = await fetch('/api/schedules/check-overlap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      productId: product._id,
                      datetime,
                      duration: customDuration
                    })
                  });

                  const { hasOverlap } = await overlapCheck.json();
                  if (hasOverlap) {
                    setShowOverlapAlert(true);
                    return;
                  }

                  // Prepare cart product for open schedule
                  const cartProduct = {
                    ...product,
                    prices: product.prices.map((price, idx) => ({
                      ...price,
                      qty: priceQuantities[idx] || 0
                    })),
                    selectedTimes: [{
                      datetime,
                      time: customTime,
                      label: '',
                      duration: customDuration
                    }]
                  };

                  const _product = await calcCartValueClass({product: cartProduct});
                  const _productCleaned = await cleanupProduct({product:_product});
                  await onAddToCart(_productCleaned);
                } else {
                  // Regular schedule logic
                  const quantities = {};
                  selectedTimes.forEach(time => {
                    if (time.quantities) {
                      Object.entries(time.quantities).forEach(([priceIdx, qty]) => {
                        quantities[priceIdx] = (quantities[priceIdx] || 0) + qty;
                      });
                    }
                  });

                  const cartProduct = {
                    ...product,
                    prices: product.prices.map((price, idx) => ({
                      ...price,
                      qty: quantities[idx] || 0
                    })),
                    selectedTimes: selectedTimes.map(({ datetime, time, label, available, conflict, conflictReason }) => ({
                      datetime, time, label, available, conflict, conflictReason
                    }))
                  };

                  const _product = await calcCartValueClass({product: cartProduct});
                  const _productCleaned = await cleanupProduct({product:_product});
                  await onAddToCart(_productCleaned);
                }
              }}
            >
              {isPartOfGroup ? 'Ok' : 'Add'}
            </Button>
            <Button
              variant="outline"
              className='cursor-pointer w-full'
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            </>
          ) : (
            <>
            <Button
              type="submit"
              className='cursor-pointer w-full'
              disabled={
                product.openSchedule
                  ? !selectedDate || !customTime || !customDuration || Object.values(priceQuantities).every(q => q === 0) || Object.values(priceQuantities).reduce((sum, q) => sum + q, 0) > openScheduleAvailable || !meetsMinPurchase
                  : selectedTimes.length === 0 || !meetsMinPurchase
              }
              onClick={async () => {
                if (product.openSchedule) {
                  // Check for overlaps
                  const datetime = dayjs(selectedDate).format('YYYY-MM-DD') + 'T' + customTime;
                  const overlapCheck = await fetch('/api/schedules/check-overlap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      productId: product._id,
                      datetime,
                      duration: customDuration
                    })
                  });

                  const { hasOverlap } = await overlapCheck.json();
                  if (hasOverlap) {
                    setShowOverlapAlert(true);
                    return;
                  }

                  // Prepare cart product for open schedule
                  const cartProduct = {
                    ...product,
                    prices: product.prices.map((price, idx) => ({
                      ...price,
                      qty: priceQuantities[idx] || 0
                    })),
                    selectedTimes: [{
                      datetime,
                      time: customTime,
                      label: '',
                      duration: customDuration
                    }]
                  };

                  const _product = await calcCartValueClass({product: cartProduct});
                  const _productCleaned = await cleanupProduct({product:_product});
                  await addToCart(_productCleaned);
                  setOpen(false); // Close sheet after successful add
                } else {
                  // Regular schedule logic
                  const quantities = {};
                  selectedTimes.forEach(time => {
                    if (time.quantities) {
                      Object.entries(time.quantities).forEach(([priceIdx, qty]) => {
                        quantities[priceIdx] = (quantities[priceIdx] || 0) + qty;
                      });
                    }
                  });

                  const cartProduct = {
                    ...product,
                    prices: product.prices.map((price, idx) => ({
                      ...price,
                      qty: quantities[idx] || 0
                    })),
                    selectedTimes: selectedTimes.map(({ datetime, time, label, available, conflict, conflictReason }) => ({
                      datetime, time, label, available, conflict, conflictReason
                    }))
                  };

                  const _product = await calcCartValueClass({product: cartProduct});
                  const _productCleaned = await cleanupProduct({product:_product});
                  await addToCart(_productCleaned);
                  setOpen(false); // Close sheet after successful add
                }
              }}
            >
              Add
            </Button>
            <Button
              variant="outline"
              className='cursor-pointer w-full'
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            </>
          )}
        </SheetFooter>

      </SheetContent>
    </Sheet>

    {/* Overlap Alert Dialog - Outside Sheet but prevents Sheet from closing */}
    <AlertDialog open={showOverlapAlert} onOpenChange={setShowOverlapAlert}>
      <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Schedule Conflict</AlertDialogTitle>
          <AlertDialogDescription>
            This class time overlaps with an existing scheduled class for this product.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}