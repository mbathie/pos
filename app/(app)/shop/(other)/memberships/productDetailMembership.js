'use client'

import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { Minus, Plus } from "lucide-react"
import { useGlobals } from '@/lib/globals'
import { useState, useEffect } from 'react'
import { calcCartValueMembership, cleanupProduct } from '@/lib/product'
import { useMembership } from './useMembership'

export default function ProductDetailMembership({ product, setProduct, setOpen, open }) {
  
  const { setQty } = useMembership({product, setProduct})
  
  const { addToCart } = useGlobals()
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function fetch() {
      if (product) {
        console.log(product)
        const t = await calcCartValueMembership({ product });
        console.log(t)
        setTotal(t.amount.subtotal);
      }
    }
    fetch()

  }, [product])

  if (!product) return null;
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-[400px] sm:w-[540px]">

        <SheetHeader className=''>
          <SheetTitle>
            <div className='flex items-center space-x-1'>
              <div>{product?.name?.length > 20 ? `${product.name.substring(0, 20)}...` : product?.name}</div>
              {/* <div className="relative size-6 ml-1">
                <img
                  src={`/api/icons/${product?.icon || 'store'}`}
                  alt=""
                  className="size-6"
                />
              </div> */}
            </div>
          </SheetTitle>
          <SheetDescription>
            {product.desc?.length > 100 ? `${product.desc.substring(0, 100)}...` : product.desc}
          </SheetDescription>
        </SheetHeader>

        <div className='flex flex-col mx-4 text-sm'>
          {product?.variations?.map((variation, vIdx) => {
            return (
              <div key={vIdx} className='space-y-4-'>
                {variation.prices?.map((price, priceIdx) => (
                  <div key={priceIdx} className='flex items-center justify-between py-1'>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        disabled={!price.qty || price.qty <= 0}
                        onClick={() => setQty(vIdx, priceIdx, Math.max(0, (price.qty || 0) - 1))}
                      >
                        <Minus className="size-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setQty(vIdx, priceIdx, (price.qty || 0) + 1)}
                      >
                        <Plus className="size-4" />
                      </Button>

                      <span className="font-medium">{price.name} {variation.unit && `(${variation.unit})`}</span>
                    </div>
                    
                    <div className='flex items-center gap-4'>
                      <span className="text-sm text-muted-foreground">
                        {price.qty || 0}x ${parseFloat(price.value).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
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
                const _product = await calcCartValueMembership({product})
                const _productCleaned = await cleanupProduct({product:_product})

                _product.variations = _product.variations?.map(v => ({
                  ...v,
                  prices: v.prices?.filter(price => (price.qty ?? 0) > 0) || []
                }));

                await addToCart(_productCleaned)
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