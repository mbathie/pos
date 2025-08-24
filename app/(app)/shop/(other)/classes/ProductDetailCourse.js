'use client'

import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { ChevronRight, Minus, Plus, Folder, Check } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useGlobals } from '@/lib/globals'
import { useState, useEffect } from 'react'
import { calcCartValueCourse } from '@/lib/product'
import { useClass } from './useClass'
import dayjs from 'dayjs';

export default function ProductDetail({ open, setOpen, product, setProduct }) {

  if (!product) return null;

  console.log(product)

  const { setQty } = useClass({product, setProduct})

  const { addToCart } = useGlobals()
  const [total, setTotal] = useState(0)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null)


  useEffect(() => {
    async function fetch() {
      if (product) {
        const t = await calcCartValueCourse({ product });
        setTotal(t.amount.subtotal);
      }
    }
    fetch()

  }, [product])
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-[700px] flex flex-col h-full">


        <SheetHeader className=''>
          <SheetTitle>
            <div className='flex items-center space-x-1'>
              <div>{product?.name?.length > 20 ? `${product.name.substring(0, 20)}...` : product?.name}</div>
              <div className="relative size-6 ml-1">
              </div>
            </div>
          </SheetTitle>
          <SheetDescription>
            {product.desc?.length > 100 ? `${product.desc.substring(0, 100)}...` : product.desc}
          </SheetDescription>
        </SheetHeader>

        <div className='flex flex-col mx-4 gap-2'>

          <div className='flex flex-col gap-4 text-sm'>

            {/* Course pricing - moved to top like classes */}
            {product.prices && product.prices.length > 0 ? (
              <div className='w-full'>
                <div className='flex flex-col gap-2 w-full'>
                  {product.prices.map((price, priceIdx) => (
                    <div key={priceIdx} className='flex'>
                      <div className='flex gap-2 w-full items-center'>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQty({ type: '-', vIdx: 0, priceIdx })}
                          disabled={!price.qty}
                        >
                          <Minus />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQty({ type: '+', vIdx: 0, priceIdx })}
                          disabled={
                            product.prices.reduce((sum, p) => sum + (p.qty ?? 0), 0) >= (product.available || 999)
                          }
                        >
                          <Plus />
                        </Button>
                        {price.name}
                        <div className='flex-1' />
                        {price.qty || 0}x
                        ${parseFloat(price.value).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className='text-center py-8 text-muted-foreground'>
                No pricing available for this course
              </div>
            )}

            {/* Course schedule info */}
            {product.schedule && (
              <div className='p-3 bg-muted rounded-md text-sm'>
                <div className='font-semibold mb-2'>Course Schedule</div>
                {product.schedule.startDate && (
                  <div>Starts: {dayjs(product.schedule.startDate).format('DD/MM/YYYY')}</div>
                )}
                {product.schedule.endDate && (
                  <div>Ends: {dayjs(product.schedule.endDate).format('DD/MM/YYYY')}</div>
                )}
                
                {/* Days of the week */}
                {product.schedule.daysOfWeek && (
                  <div className='mt-2'>
                    Days: {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                      .filter((_, idx) => product.schedule.daysOfWeek[idx])
                      .join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Time slot selection for courses - only show if prices have been selected */}
            {product.prices?.some(p => p.qty > 0) && product.schedule?.times && product.schedule.times.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Select Time Slot</h3>
                <ScrollArea className="h-[150px] border rounded-md p-3">
                  <div className="space-y-2">
                    {product.schedule.times.map((time, idx) => {
                      const timeStr = typeof time === 'string' ? time : time.time;
                      const label = typeof time === 'object' ? time.label : '';
                      const timeId = `time-${idx}`;
                      
                      return (
                        <div
                          key={timeId}
                          className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md"
                        >
                          <Checkbox
                            id={timeId}
                            checked={selectedTimeSlot === timeId}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTimeSlot(timeId);
                                setProduct(draft => {
                                  draft.selectedTimeSlot = { time: timeStr, label };
                                });
                              } else {
                                setSelectedTimeSlot(null);
                                setProduct(draft => {
                                  draft.selectedTimeSlot = null;
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={timeId}
                            className="flex-1 flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span>{timeStr}</span>
                              {label && (
                                <Badge variant="secondary">{label}</Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {(product.available ?? product.capacity ?? 0) > 0 
                                ? `${product.available ?? product.capacity ?? 0} spots` 
                                : 'Full'}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

          </div>

        </div>

        <SheetFooter>
          <div className='flex gap-2 w-full'>
            <div className='flex flex-col w-full'>
              {/* Grand Total for cart */}
              <div className='flex justify-between text-lg font-bold border-gray-200 pt-2'>
                <span>TOTAL</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <Button
                onClick={async () => {
                  // Check if time slot is selected for courses with multiple times
                  if (product.schedule?.times?.length > 1 && !product.selectedTimeSlot) {
                    return; // Don't proceed without time slot selection
                  }
                  
                  // Clean up the product before adding to cart
                  const cleanProduct = {
                    ...product,
                    // Ensure prices have qty values
                    prices: product.prices?.map(p => ({
                      ...p,
                      qty: p.qty || 0
                    })) || [],
                    // Include selected time slot
                    selectedTimeSlot: product.selectedTimeSlot
                  };
                  
                  // Only add if there's something selected
                  const hasItems = cleanProduct.prices.some(p => p.qty > 0);
                  if (hasItems) {
                    // Calculate the amount for the cart
                    const productWithAmount = await calcCartValueCourse({ product: cleanProduct });
                    addToCart(productWithAmount);
                    setOpen(false);
                  }
                }}
                disabled={
                  !product.prices?.some(p => p.qty > 0) || 
                  (product.schedule?.times?.length > 1 && !selectedTimeSlot)
                }
                className='w-full mt-2'
              >
                Add
              </Button>
            </div>
          </div>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  )
}