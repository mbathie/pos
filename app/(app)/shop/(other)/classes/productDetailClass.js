'use client'

import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { Minus, Plus } from "lucide-react"
import { useGlobals } from '@/lib/globals'
import { useState, useEffect } from 'react'
import { calcCartValueClass, cleanupProduct } from '@/lib/product'
import MultiSelect from '@/components/multi-select'
import { useClass } from './useClass'

export default function ProductDetail({ product, setProduct, setOpen, open }) {
  
  if (!product) return null;

  const { setQty, onSelectTime } = useClass({product, setProduct})
  
  const { addToCart } = useGlobals()
  const [total, setTotal] = useState(0)

  // useEffect(() => {
  //   console.log('calling setTimes()')
  //   setTimes()
  // },[])

  useEffect(() => {
    console.log(product)
    async function fetch() {
      if (product) {
        const t = await calcCartValueClass({ product });
        // console.log(t)
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

          <div className='flex flex-col gap-2 text-sm w-full'>

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

                    {variation.prices?.some(p => p.qty > 0) && variation.times?.length > 0 && (
                      <>
                        {console.log('MultiSelect debug:', {
                          vIdx,
                          timesCalc: variation.timesCalc,
                          times: variation.times,
                          prices: variation.prices,
                        })}
                        <MultiSelect
                          options={variation.timesCalc}
                          onValueChange={(tcValues) => onSelectTime({ vIdx, tcValues })}
                          placeholder="Times..."
                          variant="inverted"
                          animation={2}
                          maxCount={1}
                          disableSelectAll={true}
                        />
                      </>
                    )}
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
                const _product = await calcCartValueClass({product})
                const _productCleaned = await cleanupProduct({product:_product})

                _product.variations = _product.variations?.map(v => ({
                  ...v,
                  prices: v.prices?.filter(price => (price.qty ?? 0) > 0) || []
                }));

                addToCart(_productCleaned)
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
