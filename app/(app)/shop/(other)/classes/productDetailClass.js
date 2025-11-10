'use client'

import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { Minus, Plus, CalendarIcon } from "lucide-react"
import { useGlobals } from '@/lib/globals'
import { useState, useEffect } from 'react'
import { calcCartValueClass, cleanupProduct } from '@/lib/product'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useClass } from './useClass'
import dayjs from 'dayjs'

export default function ProductDetail({ product, setProduct, setOpen, open, onAddToCart, isPartOfGroup = false }) {

  if (!product) return null;

  const { addToCart } = useGlobals()
  const { getAvailableDates, getTimesForDate } = useClass({ product, setProduct })
  const [total, setTotal] = useState(0)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTimes, setSelectedTimes] = useState([]) // Array of { ...time, quantities: { [priceIdx]: qty } }
  const [availableDates, setAvailableDates] = useState([])
  const [timesForSelectedDate, setTimesForSelectedDate] = useState([])
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Calculate total based on selected times and their quantities
  useEffect(() => {
    let subtotal = 0;
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
    setTotal(subtotal);
  }, [selectedTimes, product.prices])
  
  // Get available dates when product changes
  useEffect(() => {
    if (product?.schedule) {
      const dates = getAvailableDates(product.schedule);
      setAvailableDates(dates);
    }
  }, [product?.schedule])
  
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
    <Sheet open={open} onOpenChange={setOpen}>
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

          {/* Time Slots with +/- buttons per price */}
          {selectedDate && timesForSelectedDate.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Available Times for {dayjs(selectedDate).format('dddd, MMMM D')}
              </h3>
              <ScrollArea className="h-[400px] border rounded-md p-3">
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
                            {product.prices?.map((price, priceIdx) => {
                              const qty = selectedTime?.quantities?.[priceIdx] || 0;
                              const atCapacity = totalQtyForTime >= time.available;

                              return (
                                <div key={priceIdx} className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    className="cursor-pointer"
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
                                  >
                                    <Minus />
                                  </Button>
                                  <Button
                                    size="icon"
                                    className="cursor-pointer"
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
                                  >
                                    <Plus />
                                  </Button>
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
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
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
            <Button
              type="submit"
              className='cursor-pointer'
              disabled={selectedTimes.length === 0}
              onClick={async () => {
                // Convert new data structure to cart format
                // Calculate total quantities per price across all selected times
                const priceQuantities = {};
                selectedTimes.forEach(time => {
                  if (time.quantities) {
                    Object.entries(time.quantities).forEach(([priceIdx, qty]) => {
                      priceQuantities[priceIdx] = (priceQuantities[priceIdx] || 0) + qty;
                    });
                  }
                });

                // Prepare product for cart with qty fields
                const cartProduct = {
                  ...product,
                  prices: product.prices.map((price, idx) => ({
                    ...price,
                    qty: priceQuantities[idx] || 0
                  })),
                  selectedTimes: selectedTimes.map(({ datetime, time, label, available, conflict, conflictReason }) => ({
                    datetime, time, label, available, conflict, conflictReason
                  }))
                };

                const _product = await calcCartValueClass({product: cartProduct})
                const _productCleaned = await cleanupProduct({product:_product})

                await onAddToCart(_productCleaned)
              }}
            >
              {isPartOfGroup ? 'Ok' : 'Add'}
            </Button>
          ) : (
            <SheetClose asChild>
              <Button
                type="submit"
                className='cursor-pointer'
                disabled={selectedTimes.length === 0}
                onClick={async () => {
                  // Convert new data structure to cart format
                  // Calculate total quantities per price across all selected times
                  const priceQuantities = {};
                  selectedTimes.forEach(time => {
                    if (time.quantities) {
                      Object.entries(time.quantities).forEach(([priceIdx, qty]) => {
                        priceQuantities[priceIdx] = (priceQuantities[priceIdx] || 0) + qty;
                      });
                    }
                  });

                  // Prepare product for cart with qty fields
                  const cartProduct = {
                    ...product,
                    prices: product.prices.map((price, idx) => ({
                      ...price,
                      qty: priceQuantities[idx] || 0
                    })),
                    selectedTimes: selectedTimes.map(({ datetime, time, label, available, conflict, conflictReason }) => ({
                      datetime, time, label, available, conflict, conflictReason
                    }))
                  };

                  const _product = await calcCartValueClass({product: cartProduct})
                  const _productCleaned = await cleanupProduct({product:_product})

                  await addToCart(_productCleaned)
                }}
              >
                Add
              </Button>
            </SheetClose>
          )}
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}