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
      <SheetContent className="w-[400px] sm:w-[540px]">

        <SheetHeader className=''>
          <SheetTitle>
            <div className='flex items-center space-x-1'>
              <div>{product?.name?.length > 20 ? `${product.name.substring(0, 20)}...` : product?.name}</div>
              <div className="relative size-6 ml-1">
              </div>
            </div>
          </SheetTitle>
          <SheetDescription>
            Description goes here
          </SheetDescription>
        </SheetHeader>

        <div className='flex flex-col mx-4 gap-2'>

          <div className='flex flex-col gap-4 text-sm'>

            {product.variations.map((variation, vIdx) => {
              return (
                <div key={vIdx} className='w-full'>

                  <div className='flex flex-col gap-2 w-full'>
                    {variation.prices?.map((price, priceIdx) => (
                      <div key={priceIdx} className='flex'>
                        <div className='flex gap-2 w-full items-center'>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQty({ type: '-', vIdx, priceIdx })}
                            disabled={!price.qty}
                          >
                            <Minus />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQty({ type: '+', vIdx, priceIdx })}
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
                    {variation.times?.map((time, timeIdx) => {
                      const start = new Date(time.start);
                      const repeatInterval = time.repeatInterval || 0;
                      const repeatCnt = time.repeatCnt || 1;
                      const last = new Date(start);
                      last.setDate(start.getDate() + (repeatInterval * (repeatCnt - 1)));

                      return (
                        <div key={timeIdx} className="">
                          <div className='flex'>
                            <div className='mr-auto'>First class</div>
                            <div>{dayjs(start).format('ddd DD/MM/YY HH:mm A')}</div>
                          </div>
                          <div className='flex'>
                            <div className='mr-auto'>Repeats every</div>
                            <div>{repeatInterval === 7 ? 'Weekly' : `${repeatInterval} days`}</div>
                          </div>
                          <div className='flex'>
                            <div className='mr-auto'>Last class</div>
                            <div>{dayjs(last).format('ddd DD/MM/YY HH:mm A')}</div>
                          </div>
                        </div>
                      );
                    })}

                  </div>

                </div>
              )
            })}


          </div>


        </div>

        <SheetFooter>
          <div className='flex'>
            <div className='uppercase font-semibold'>total</div>
            <div className='ml-auto'>
              ${total.toFixed(2)}
            </div>
          </div>

          <SheetClose asChild>
            <Button 
              type="submit" 
              disabled={!total}
              onClick={async () => {
                const _product = await calcCartValueCourse({product})
                addToCart(_product)
              }}
            >
              Add
            </Button>
          </SheetClose>
        </SheetFooter>



      </SheetContent>
    </Sheet>
  );
}
