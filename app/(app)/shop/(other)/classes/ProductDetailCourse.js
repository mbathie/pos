'use client'

import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { ChevronRight, Minus, Plus, Folder, Check } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
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

            {/* Course schedule info - moved above pricing */}
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
                
                {/* Times */}
                {product.schedule.times && product.schedule.times.length > 0 && (
                  <div className='mt-1'>
                    Times: {product.schedule.times.map(t => {
                      if (typeof t === 'string') return t;
                      return t.label ? `${t.time} (${t.label})` : t.time;
                    }).join(', ')}
                  </div>
                )}
                
                {product.available !== undefined && (
                  <div className='mt-2'>Available Spots: {product.available}</div>
                )}
              </div>
            )}

            {/* Course pricing - uses root-level prices */}
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
                  // Clean up the product before adding to cart
                  const cleanProduct = {
                    ...product,
                    // Ensure prices have qty values
                    prices: product.prices?.map(p => ({
                      ...p,
                      qty: p.qty || 0
                    })) || []
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
                disabled={!product.prices?.some(p => p.qty > 0)}
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