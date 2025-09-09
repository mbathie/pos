'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart } from "lucide-react"
import { useGlobals } from '@/lib/globals'
import { useState } from 'react'
import Cart from '@/components/cart'

export function CartSheet() {
  const { cart } = useGlobals()
  const [open, setOpen] = useState(false)
  
  // Don't show cart icon if empty or stale
  if (!cart?.products?.length || cart?.stale) return null

  const itemCount = cart.products.reduce((sum, p) => {
    if (p.type === 'shop') return sum + (p.qty || 1)
    if (p.type === 'class' || p.type === 'general') {
      return sum + (p.prices?.reduce((priceSum, price) => priceSum + (price.qty || 0), 0) || 0)
    }
    return sum + 1
  }, 0)

  return (
    <>
      <div
        className="flex items-center gap-1 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <ShoppingCart className="size-5" />
        {itemCount > 0 && (
          <Badge 
            className="h-5 px-1.5 flex items-center justify-center"
            variant="default"
          >
            {itemCount}
          </Badge>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[380px] p-0 m-0 flex flex-col h-full bg-background/0 border-none">
          <SheetHeader className="">
            <SheetTitle className=''></SheetTitle>
          </SheetHeader>

          <div 
            id="closecart" 
            className='absolute top-3.5 right-4 flex items-center gap-1 z-50 cursor-pointer'
            onClick={() => setOpen(false)}
          >
            <div><ShoppingCart className="size-5" /></div>
            <Badge 
              className="h-5 px-1.5 flex items-center justify-center"
              variant="default"
            >
              {itemCount}
            </Badge>
          </div>


          
          <Cart asSheet={true} onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}