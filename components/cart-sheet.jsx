'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart } from "lucide-react"
import { useGlobals } from '@/lib/globals'
import { useState, useEffect } from 'react'
import Cart from '@/components/cart'

export function CartSheet() {
  const { getCurrentCart, carts } = useGlobals()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const cart = getCurrentCart()

  // Prevent hydration mismatch by waiting for client mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Show cart icon if current cart has items OR if there are saved carts
  // Don't show if cart is stale
  if (cart?.stale || (!cart?.products?.length && carts.length <= 1)) return null

  const itemCount = cart.products.reduce((sum, p) => {
    if (p.type === 'shop') return sum + (p.qty || 1)
    if (p.type === 'class' || p.type === 'general') {
      return sum + (p.prices?.reduce((priceSum, price) => priceSum + (price.qty || 0), 0) || 0)
    }
    return sum + 1
  }, 0)

  // Count saved carts (carts with savedAt timestamp)
  const savedCartsCount = carts.filter(c => c.savedAt).length

  return (
    <>
      <div
        className="flex items-center gap-1 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <ShoppingCart className="size-5" />
        {itemCount > 0 ? (
          <Badge
            className="h-5 px-1.5 flex items-center justify-center"
            variant="default"
          >
            {itemCount}
          </Badge>
        ) : savedCartsCount > 0 ? (
          <Badge
            className="h-5 px-1.5 flex items-center justify-center bg-blue-500 hover:bg-blue-600"
          >
            {savedCartsCount}
          </Badge>
        ) : null}
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
            {itemCount > 0 ? (
              <Badge
                className="h-5 px-1.5 flex items-center justify-center"
                variant="default"
              >
                {itemCount}
              </Badge>
            ) : savedCartsCount > 0 ? (
              <Badge
                className="h-5 px-1.5 flex items-center justify-center bg-blue-500 hover:bg-blue-600"
              >
                {savedCartsCount}
              </Badge>
            ) : null}
          </div>



          <Cart asSheet={true} onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}