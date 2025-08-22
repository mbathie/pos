'use client'

import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { ChevronRight, Minus, Plus, Folder, Check } from "lucide-react"
// import { Checkbox } from "@/components/ui/checkbox"
import { useGlobals } from '@/lib/globals'
import { useState, useEffect } from 'react'
import { calcCartValueGeneral } from '@/lib/product'

export default function ProductDetail({ open, setOpen, product, setQty }) {
  if (!product) return null;

  const { addToCart } = useGlobals()
  const [total, setTotal] = useState(0)


  useEffect(() => {
    async function fetch() {
      if (product) {
        const t = await calcCartValueGeneral({ product });
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
          <div className='text-sm font-medium mb-2'>Select Options</div>

          <div className='flex flex-col gap-3 text-sm'>
            
            {product.prices?.map((price, pIdx) => {
              return (
                <div key={price.name + price.value} className='flex gap-2 items-center'>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQty({ type: '-', pIdx })}
                    disabled={!price.qty}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQty({ type: '+', pIdx })}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <span className="font-medium">{price.name || 'Standard'}</span>
                  <div className='flex-1' />
                  <div className='flex gap-2 items-center'>
                    <span className="text-muted-foreground">{price.qty || 0}x</span>
                    <span className="font-semibold">${parseFloat(price.value).toFixed(2)}</span>
                  </div>
                </div>
              )
            })}

            {(!product.prices || product.prices.length === 0) && (
              <div className="text-muted-foreground text-center py-4">
                No prices available for this product
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

          <SheetClose asChild>
            <Button 
              type="submit" 
              disabled={!total}
              onClick={async () => {
                const _product = await calcCartValueGeneral({product})

                // Filter out prices with no quantity
                _product.prices = _product.prices?.filter(price => (price.qty ?? 0) > 0) || []

                await addToCart(_product)
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
