'use client'
import Link from 'next/link';
import { useGlobals } from '@/lib/globals'
import { Trash2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import CourseScheduleDialog from '@/components/CourseScheduleDialog';

export default function Cart({ asSheet = false, onClose }) {
  const { cart, removeFromCart, resetCart } = useGlobals()
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)

  if (cart.products.length < 1 && !asSheet)
    return null

  return (
    <div className="flex flex-col h-full text-sm bg-muted w-[380px] rounded-tl-lg">
      <div className="space-y-1 w-full flex-1 overflow-y-auto p-4">
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
                <div>{p.name}</div>
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
              
              {/* Display course schedule info */}
              {p.schedule && (
                <div className='text-xs text-muted-foreground flex items-center'>
                  <div className='flex items-center gap-2'>
                    <span>
                      {p.schedule.startDate && dayjs(p.schedule.startDate).format('DD/MM/YY')} - 
                      {p.schedule.endDate && dayjs(p.schedule.endDate).format(' DD/MM/YY')}
                    </span>
                    {p.selectedTimeSlot && (
                      <>
                        <span>@ {p.selectedTimeSlot.time}</span>
                        {p.selectedTimeSlot.label && (
                          <Badge variant="secondary" className="text-xs">
                            {p.selectedTimeSlot.label}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-2 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCourse(p);
                      setScheduleDialogOpen(true);
                    }}
                  >
                    <Info className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Display prices from root level */}
              {p.prices?.filter(price => price.qty > 0).map((price, i) => (
                <div key={i} className="flex">
                  <div>{price.qty}x {price.name}</div>
                  <div className="ml-auto">${(price.qty * parseFloat(price.value)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              ))}
            </div>
          )

          else if (p.type=='class') return (
            <div key={pIdx} className="flex flex-col space-y-1">
              <div className="flex">
                <div>{p.name}</div>
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

              {/* Display prices */}
              {p.prices?.map((price, i) => (
                <div key={i} className="flex">
                  <div>{price.qty}x {price.name}</div>
                  <div className="ml-auto opacity-40">${parseFloat(price.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              ))}
              
              {/* Display selected times */}
              {p.selectedTimes?.map((time, tIdx) => {
                // Extract datetime and label from object format
                const datetime = time.datetime;
                const label = time.label;
                
                return (
                  <div key={tIdx} className='flex items-center'>
                    <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{dayjs(datetime).format('ddd DD/MM/YY HH:mm A')}</span>
                      {label && (
                        <Badge variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      )}
                    </div>
                    <div className=''>
                      {(() => {
                        const lineTotal = p.prices?.reduce((sum, price) => {
                          return sum + ((price.qty ?? 0) * parseFloat(price.value ?? 0));
                        }, 0);
                        return `$${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      })()}
                    </div>
                  </div>
                );
              })}
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
                <div>{p.name}</div>
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
      


      <div className='border-t p-4 flex flex-col flex-shrink-0 text-sm'>
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
              onClick={() => {
                if (asSheet && onClose) onClose()
              }}
            >
              Payment
            </Button>
          </Link>

          <Button
            type="submit"
            className="w-full"
            variant="destructive"
            disabled={!cart.products.length}
            onClick={() => {
              resetCart()
              if (asSheet && onClose) onClose()
            }}
          >
            Clear Cart
          </Button>
        </div>
      </div>

      {/* Course Schedule Dialog */}
      <CourseScheduleDialog 
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        course={selectedCourse}
      />

    </div>

  )
}