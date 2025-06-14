'use client'
import Link from 'next/link';
import { useState } from 'react';
import { useGlobals } from '@/lib/globals'
import { ShoppingCart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader,
  SheetTitle, SheetDescription, SheetFooter, SheetClose
} from "@/components/ui/sheet"
import { Separator } from '@radix-ui/react-separator'

export default function Cart({}) {
  const { cart, removeFromCart, pushBreadcrumb } = useGlobals()
  const [open, setOpen] = useState(false);

  if (cart.products.length < 1)
    return

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div className='flex space-x-1 relative cursor-pointer' onClick={() => setOpen(true)}>
          <div><ShoppingCart className='size-4.5'/></div>
          <span className="text-xs relative -top-0.5">{cart?.products?.length}</span>
        </div>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Sale Items</SheetTitle>
          <SheetDescription>Review before handling payment</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 text-sm">
          <div className="space-y-2 w-full">
            {cart?.products?.map((p, i) => {

              // for shop product item
              return (
                <div key={i} className="flex flex-col">
                  <div className="flex">
                    <div>{p.qty}x {p.name}</div>
                    <div className='ml-1'> ({p.item.variation})</div>
                    <div className='flex-1' />
                    <div>${p.amount.subtotal.toFixed(2)}</div>
                    <div
                      className='ml-2 cursor-pointer mt-0.5'
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(p._id);
                      }}
                    >
                      <X className='size-4'/>
                    </div>
                  </div>
                  <div className='flex flex-row text-xs ml-7 italic'>
                    {p.item.mods && p.item.mods.map((mod, i) => (
                      <span key={i}>
                        {mod.name}{i < p.item.mods.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>

              );
            })}

            {/* for membership item */}

            {/* for casual entry item */}

            {/* for class / course item  */}

          </div>
        </div>

        <SheetFooter>
          <div className='flex flex-col'>
            <div className='flex'>
              <div className=''>Subtotal</div>
              <div className='ml-auto'>
                ${cart.subtotal.toFixed(2)}
              </div>
            </div>
            <div className='flex'>
              <div className=''>Tax</div>
              <div className='ml-auto'>
                ${cart.tax.toFixed(2)}
              </div>
            </div>
            <Separator className="my-2 border-t border-muted" />
            <div className='flex font-bold'>
              <div className='uppercase'>total</div>
              <div className='ml-auto'>
                ${cart.total.toFixed(2)}
              </div>
            </div>
          </div>


          <SheetClose asChild>
            <Link href="/shop/retail/payment" passHref>
              <Button
                type="submit"
                className="w-full"
                disabled={!cart.products.length}
                onClick={() => pushBreadcrumb({ href: '/shop/retail/payment', name: "Payment" })}
              >
                Payment
              </Button>
            </Link>
          </SheetClose>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  )
}