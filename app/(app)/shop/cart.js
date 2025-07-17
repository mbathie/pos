'use client'
import Link from 'next/link';
import { useGlobals } from '@/lib/globals'
import { Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import dayjs from 'dayjs';

export default function Cart({}) {
  const { cart, removeFromCart, resetCart, pushBreadcrumb } = useGlobals()

  if (cart.products.length < 1)
    return

  return (
    <div className="flex flex-col overflow-y-auto p-4 text-sm w-[380px] bg-muted rounded-tl-lg">
      <div className="space-y-1 w-full *:even:bg-accent">
        {cart?.products?.map((p, pIdx) => {

          // for shop product item
          if (p.type == 'shop' ) return (
            <div key={pIdx} className="flex flex-col">
              <div className="flex">
                <div className='flex'>
                  {p.qty}x {p.name}
                </div>
                <div className='ml-1'> ({p.item.variation})</div>
                <div
                  className='ml-2 cursor-pointer mt-0.5'
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCart(pIdx);
                  }}
                >
                  <Trash className='size-4'/>
                </div>
                <div className='flex-1' />
                <div>${p.amount.subtotal.toFixed(2)}</div>
              </div>
              <div className='flex flex-row text-xs ml-1'>
                {p.item.mods && p.item.mods.map((mod, pIdx) => (
                  <span key={pIdx}>
                    {mod.name}{pIdx < p.item.mods.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            </div>

          );

          else if (p.type=='course') return (
            <div key={pIdx} className="flex flex-col space-y-1">
              <div className="flex">
                <div className="font-semibold">{p.name}</div>
                <div
                  className='ml-2 cursor-pointer mt-0.5'
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCart(pIdx);
                  }}
                >
                  <Trash className='size-4'/>
                </div>
              </div>
              <div className=''>{p.variations?.[0]?.times?.[0]?.start && dayjs(p.variations[0].times[0].start).format('ddd DD/MM/YY HH:mm A')}</div>

              {p.variations?.[0]?.prices?.map((price, i) => (
                <div key={i} className="flex">
                  <div>{price.qty}x {price.name}</div>
                  <div className="ml-auto">${parseFloat(price.value).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )

          else if (p.type=='class') return (
            <div key={pIdx} className="flex flex-col space-y-1">
              <div className="flex">
                <div className="font-semibold">{p.name}</div>
                <div
                  className='ml-1 cursor-pointer mt-0.5'
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCart(pIdx);
                  }}
                >
                  <Trash className='size-4'/>
                </div>
              </div>

              {p.variations?.map((v, vIdx) => (
                <div key={vIdx}>
                  {v.prices?.map((price, i) => (
                    <div key={i} className="flex">
                      <div>{price.qty}x {price.name}</div>
                      <div className="ml-auto opacity-40">${parseFloat(price.value).toFixed(2)}</div>
                    </div>
                  ))}

                  {v.timesCalc?.filter(t => t.selected)?.map((time, tIdx) => (
                    <div key={tIdx} className='flex'>
                      <div className="mr-auto">
                        {dayjs(time.value).format('ddd DD/MM/YY HH:mm A')}
                      </div>
                      <div className=''>
                        {(() => {
                          const lineTotal = v.prices?.reduce((sum, price) => {
                            return sum + ((price.qty ?? 0) * parseFloat(price.value ?? 0));
                          }, 0);
                          return `$${lineTotal.toFixed(2)}`;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )

          else if (p.type=='casual') return (
            <div key={p._id} className="flex flex-col space-y-1 px-4">
              <div className="flex">
                <div className="font-semibold">{p.name}</div>
                <div
                  className="ml-1 cursor-pointer mt-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCart(pIdx);
                  }}
                >
                  <Trash className="size-4" />
                </div>
              </div>
              {p.variations?.map((v, vIdx) => (
                <div key={vIdx}>
                  {v.prices?.map((price, i) => (
                    <div key={i} className="flex">
                      <div>{price.qty}x {price.name}</div>
                      <div className="ml-auto">${parseFloat(price.value).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

          )

        })}
      </div>
      


      <div className='flex flex-col mt-6 mt-auto text-sm'>
        <div className='flex flex-col text-sm'>
          <div className='flex'>
            <div className=''>Subtotal</div>
            <div className='ml-auto'>
              ${cart.subtotal.toFixed(2)}
            </div>
          </div>
          {cart.discount && (
            <div className='flex text-green-600'>
              <div className=''>Discount ({cart.discount.name})</div>
              <div className='ml-auto'>
                -${cart.discountAmount.toFixed(2)}
              </div>
            </div>
          )}
          <div className='flex'>
            <div className=''>Tax</div>
            <div className='ml-auto'>
              ${cart.tax.toFixed(2)}
            </div>
          </div>
          <div className='flex font-semibold'>
            <div className='uppercase'>Total</div>
            <div className='ml-auto'>
              ${cart.total.toFixed(2)}
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-2 mt-2'>
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

          <Button
            type="submit"
            className="w-full"
            variant="destructive"
            disabled={!cart.products.length}
            onClick={() => resetCart()}
          >
            Clear Cart
          </Button>
        </div>
      </div>


    </div>

  )
}