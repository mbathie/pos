'use client'

import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { Minus, Plus, CalendarIcon, X } from "lucide-react"
import { useGlobals } from '@/lib/globals'
import { useState, useEffect } from 'react'
import { calcCartValueClass, cleanupProduct } from '@/lib/product'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
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
  const [selectedTimes, setSelectedTimes] = useState([])
  const [availableDates, setAvailableDates] = useState([])
  const [timesForSelectedDate, setTimesForSelectedDate] = useState([])
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Calculate total
  useEffect(() => {
    async function fetch() {
      if (product) {
        const t = await calcCartValueClass({ product });
        setTotal(t.amount.subtotal);
      }
    }
    fetch()
  }, [product, product?.prices, selectedTimes])
  
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

        <div className='flex flex-col mx-4 gap-2'>

          <div className='flex flex-col gap-2 text-sm w-full'>

            {/* Display prices with quantity selectors */}
            {product.prices?.map((price, priceIdx) => (
              <div key={priceIdx} className='flex'>
                <div className='flex gap-2 w-full items-center'>
                  {!isPartOfGroup && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProduct(draft => {
                          if (!draft.prices[priceIdx].qty) {
                            draft.prices[priceIdx].qty = 0;
                          }
                          if (draft.prices[priceIdx].qty > 0) {
                            draft.prices[priceIdx].qty--;
                          }
                        });
                      }}
                      disabled={!price.qty}
                    >
                      <Minus />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProduct(draft => {
                        if (!draft.prices[priceIdx].qty) {
                          draft.prices[priceIdx].qty = 0;
                        }
                        if (isPartOfGroup && draft.prices[priceIdx].qty >= 1) {
                          // For group products, limit to 1
                          return;
                        }
                        draft.prices[priceIdx].qty++;
                      });
                    }}
                  >
                    <Plus />
                  </Button>

                  {price.name}
                  {price.minor && (
                    <Badge variant="secondary" className="text-xs ml-1">Minor</Badge>
                  )}
                  <div className='flex-1' />
                  {price.qty || 0}x
                  <span className={isPartOfGroup ? 'line-through text-muted-foreground' : ''}>
                    ${parseFloat(price.value || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            {/* Show date and time selector if any price has quantity > 0 */}
            {product.prices?.some(p => p.qty > 0) && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Select Date</h3>
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
                          setCalendarOpen(false); // Auto-close on selection
                        }}
                        disabled={(date) => {
                          // Disable dates that don't have classes
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

                {/* Show times for selected date */}
                {selectedDate && timesForSelectedDate.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Available Times for {dayjs(selectedDate).format('dddd, MMMM D')}
                    </h3>
                    <ScrollArea className="h-[200px] border rounded-md p-3">
                      <div className="space-y-2">
                        {timesForSelectedDate.map((time) => (
                          <div
                            key={time.datetime}
                            className={cn(
                              "flex items-center space-x-3 p-2 hover:bg-muted rounded-md",
                              time.conflict && "opacity-60"
                            )}
                          >
                            <Checkbox
                              id={time.datetime}
                              checked={selectedTimes.some(t => t.datetime === time.datetime)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTimes([...selectedTimes, time]);
                                } else {
                                  setSelectedTimes(selectedTimes.filter(t => t.datetime !== time.datetime));
                                }
                                setProduct(draft => {
                                  draft.selectedTimes = checked
                                    ? [...selectedTimes, time]
                                    : selectedTimes.filter(t => t.datetime !== time.datetime);
                                });
                              }}
                              disabled={time.available <= 0 || time.conflict}
                            />
                            <label
                              htmlFor={time.datetime}
                              className={cn(
                                "flex-1 flex items-center justify-between cursor-pointer",
                                time.conflict && "line-through text-muted-foreground"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span>{time.time}</span>
                                {time.label && (
                                  <Badge variant="secondary">{time.label}</Badge>
                                )}
                                {time.conflict && (
                                  <Badge variant="destructive" className="text-xs">{time.conflictReason}</Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {time.conflict
                                  ? 'Unavailable'
                                  : time.available > 0
                                    ? `${time.available} spots`
                                    : 'Full'
                                }
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Show selected times summary */}
                {selectedTimes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Selected Classes</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTimes.map((time) => (
                        <Badge 
                          key={time.datetime} 
                          variant="outline" 
                          className="pr-1 flex items-center gap-1 cursor-pointer"
                        >
                          <span>
                            {dayjs(time.datetime).format('MMM D, h:mm A')}
                            {time.label && ` - ${time.label}`}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => {
                              const updatedTimes = selectedTimes.filter(t => t.datetime !== time.datetime);
                              setSelectedTimes(updatedTimes);
                              setProduct(draft => {
                                draft.selectedTimes = updatedTimes;
                              });
                            }}
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

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
              disabled={(() => {
                // Check if we have selected prices and times
                const hasSelectedPrices = product.prices?.some(p => (p.qty || 0) > 0);
                const hasSelectedTimes = selectedTimes && selectedTimes.length > 0;

                // Need both: selected prices AND selected times
                return !hasSelectedPrices || !hasSelectedTimes;
              })()}
              onClick={async () => {
                // Prepare product for cart
                const cartProduct = {
                  ...product,
                  selectedTimes: selectedTimes, // Already in the correct format
                  prices: product.prices?.filter(p => (p.qty || 0) > 0)
                };

                const _product = await calcCartValueClass({product: cartProduct})
                const _productCleaned = await cleanupProduct({product:_product})

                await onAddToCart(_productCleaned)
                // Don't call setOpen(false) here - let the parent component handle it
              }}
            >
              {isPartOfGroup ? 'Ok' : 'Add'}
            </Button>
          ) : (
            <SheetClose asChild>
              <Button
                type="submit"
                className='cursor-pointer'
                disabled={(() => {
                  // Check if we have selected prices and times
                  const hasSelectedPrices = product.prices?.some(p => (p.qty || 0) > 0);
                  const hasSelectedTimes = selectedTimes && selectedTimes.length > 0;

                  // Need both: selected prices AND selected times
                  return !hasSelectedPrices || !hasSelectedTimes;
                })()}
                onClick={async () => {
                  // Prepare product for cart
                  const cartProduct = {
                    ...product,
                    selectedTimes: selectedTimes, // Already in the correct format
                    prices: product.prices?.filter(p => (p.qty || 0) > 0)
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