'use client'

import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { Minus, Plus } from "lucide-react"
import { useGlobals } from '@/lib/globals'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'

export default function ProductDetailMembership({ product, setProduct, setOpen, open }) {
  
  const { addToCart } = useGlobals()
  const [total, setTotal] = useState(0)

  // Calculate total whenever product or quantities change
  useEffect(() => {
    if (product?.prices) {
      const subtotal = product.prices.reduce((sum, price) => {
        const qty = price.qty || 0;
        const amount = parseFloat(price.value || 0);
        return sum + (qty * amount);
      }, 0);
      setTotal(subtotal);
    }
  }, [product?.prices])

  const updateQuantity = (priceIdx, change) => {
    setProduct(draft => {
      if (!draft.prices[priceIdx].qty) {
        draft.prices[priceIdx].qty = 0;
      }
      draft.prices[priceIdx].qty = Math.max(0, draft.prices[priceIdx].qty + change);
    });
  };

  if (!product) return null;
  
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
              <div>{product?.name?.length > 30 ? `${product.name.substring(0, 30)}...` : product?.name}</div>
            </div>
          </SheetTitle>
          <SheetDescription>
            {product.desc?.length > 150 ? `${product.desc.substring(0, 150)}...` : product.desc}
          </SheetDescription>
        </SheetHeader>

        <div className='flex flex-col mx-4 gap-2'>
          <div className='flex flex-col gap-2 text-sm w-full'>
            {/* Display prices with quantity selectors */}
            {product?.prices?.map((price, priceIdx) => {
              const billingLabel = price.billingFrequency ? 
                `/${price.billingFrequency === 'yearly' ? 'year' : 
                  price.billingFrequency === 'monthly' ? 'month' : 
                  price.billingFrequency === 'fortnightly' ? '2 weeks' : 
                  'week'}` : '';
              
              return (
                <div key={priceIdx} className='flex'>
                  <div className='flex gap-2 w-full items-center'>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(priceIdx, -1)}
                      disabled={!price.qty}
                    >
                      <Minus />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(priceIdx, 1)}
                    >
                      <Plus />
                    </Button>

                    {price.name}
                    {price.minor && (
                      <Badge variant="secondary" className="text-xs ml-1">Minor</Badge>
                    )}
                    <div className='flex-1' />
                    {price.qty || 0}x
                    ${parseFloat(price.value || 0).toFixed(2)}{billingLabel}
                  </div>
                </div>
              )
            })}

            {(!product?.prices || product.prices.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No pricing options available
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="mt-auto">
          <div className='flex w-full'>
            <div className='uppercase font-semibold'>TOTAL</div>
            <div className='ml-auto font-semibold'>
              ${total.toFixed(2)}
            </div>
          </div>

          <SheetClose asChild>
            <Button 
              type="submit" 
              disabled={!total || total === 0}
              onClick={async () => {
                // Create a cleaned product for the cart
                const cartProduct = {
                  ...product,
                  prices: product.prices?.filter(price => (price.qty ?? 0) > 0) || [],
                  amount: {
                    subtotal: total,
                    total: total
                  }
                };

                // Only add to cart if there are selected items
                if (cartProduct.prices.length > 0) {
                  await addToCart(cartProduct);
                }
              }}
              className="w-full"
            >
              Add
            </Button>
          </SheetClose>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}