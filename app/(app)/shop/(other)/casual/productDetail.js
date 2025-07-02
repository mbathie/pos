'use client'

import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { ChevronRight, Minus, Plus, Folder, Check } from "lucide-react"
// import { Checkbox } from "@/components/ui/checkbox"
import { useGlobals } from '@/lib/globals'
import { useState, useEffect } from 'react'
import { calcCartValueCasual } from '@/lib/product'

export default function ProductDetail({ open, setOpen, product, setQty }) {
  if (!product) return null;

  const { addToCart } = useGlobals()
  const [total, setTotal] = useState(0)


  useEffect(() => {
    async function fetch() {
      if (product) {
        const t = await calcCartValueCasual({ product });
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
          {/* <div className='text-sm'>Variations</div> */}

          <div className='flex flex-col gap-4 text-sm'>
            
            {product.variations.map((v, vIdx) => {
              return (
                <div key={v.name+v.unit} className='flex flex-col gap-2'>
                  {v.name} {v.unit}

                  {v.prices.map((p, pIdx) => {
                    return (
                      <div key={p.name+p.value}>
                        <div className='flex gap-2 items-center'>
                          {/* <Checkbox
                            checked={p.selected}
                            onClick={() => onSelectPrice({ vIdx, pIdx })}
                          /> */}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQty({ type: '-', vIdx, pIdx })}
                            disabled={!p.qty}
                          >
                            <Minus />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQty({ type: '+', vIdx, pIdx })}
                          >
                            <Plus />
                          </Button>


                          {p.name}
                          <div className='flex-1' />
                          <div className='flex gap-2'>
                            <div>{p.qty || 0}x </div>
                            <div>${parseFloat(p.value).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}


          </div>

            {/* <div className='flex flex-col gap-2'>
              <div className='text-sm'>Qty</div>
              <div className='flex gap-2'>
                <Button variant="" size="sm" onClick={() => setQty({ type: '-' })}><Minus /></Button>
                <Button variant="" size="sm" onClick={() => setQty({ type: '+' })}><Plus /></Button>
                <div className='ml-auto'>{product?.qty || 0}</div>
              </div>
            </div> */}


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
                const _product = await calcCartValueCasual({product})

                _product.variations = _product.variations?.map(v => ({
                  ...v,
                  prices: v.prices?.filter(price => (price.qty ?? 0) > 0) || []
                }))

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
