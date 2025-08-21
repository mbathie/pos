'use client'
import Link from 'next/link';
import { useGlobals } from '@/lib/globals'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import dayjs from 'dayjs';

export default function Cart({}) {
  const { cart, removeFromCart, resetCart, pushBreadcrumb } = useGlobals()

  if (cart.products.length < 1)
    return

  return (
    <div className="flex flex-col p-4 text-sm w-[380px] bg-muted rounded-tl-lg h-[calc(100vh-65px)]">
      <div className="space-y-1 w-full flex-1 overflow-y-auto">
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
                  <Trash2 className='size-4'/>
                </div>
                <div className='flex-1' />
                <div>${p.amount.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              {p.item.mods && p.item.mods.length > 0 && (
                <div className='text-xs ml-1 text-muted-foreground'>
                  {p.item.mods.map(mod => mod.name).join(', ')}
                </div>
              )}
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
                  <Trash2 className='size-4'/>
                </div>
              </div>
              <div className=''>{p.variations?.[0]?.times?.[0]?.start && dayjs(p.variations[0].times[0].start).format('ddd DD/MM/YY HH:mm A')}</div>

              {p.variations?.[0]?.prices?.map((price, i) => (
                <div key={i} className="flex">
                  <div>{price.qty}x {price.name}</div>
                  <div className="ml-auto">${parseFloat(price.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                  <Trash2 className='size-4'/>
                </div>
              </div>

              {p.variations?.map((v, vIdx) => (
                <div key={vIdx}>
                  {v.prices?.map((price, i) => (
                    <div key={i} className="flex">
                      <div>{price.qty}x {price.name}</div>
                      <div className="ml-auto opacity-40">${parseFloat(price.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                          return `$${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )

          else if (p.type=='general') return (
            <div key={p._id} className="flex flex-col space-y-1-">
              <div className="flex">
                <div>{p.name}</div>
                <div
                  className="ml-1 cursor-pointer mt-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCart(pIdx);
                  }}
                >
                  <Trash2 className="size-4" />
                </div>
              </div>
              {/* Display prices directly for general products */}
              {p.prices?.map((price, i) => (
                <div key={i} className="flex">
                  <div>{price.qty}x {price.name || 'Standard'}</div>
                  <div className="ml-auto">${parseFloat(price.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              ))}
            </div>

          )

          else if (p.type=='membership') return (
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
                  <Trash2 className='size-4'/>
                </div>
              </div>

              {p.variations?.map((v, vIdx) => (
                <div key={vIdx}>
                  {v.prices?.map((price, i) => (
                    <div key={i} className="flex">
                      <div>{price.qty}x {price.name} {v.unit && `(${v.unit})`}</div>
                      <div className="ml-auto">${parseFloat(price.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )

        })}
      </div>
      


      <div className='flex flex-col mt-6 flex-shrink-0 text-sm'>
        <div className='flex flex-col text-sm'>
          <div className='flex'>
            <div className=''>Subtotal</div>
            <div className='ml-auto'>
              ${cart.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className='flex'>
            <div className=''>Tax</div>
            <div className='ml-auto'>
              ${cart.tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className='flex font-semibold'>
            <div className='uppercase'>Total</div>
            <div className='ml-auto'>
              ${cart.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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