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

  // Show visual indicator for stale carts
  const isStale = cart.stale

  // Don't show cart if empty or if it's stale (unless it's being used as a sheet)
  if ((cart.products.length < 1 || isStale) && !asSheet)
    return null

  // Group products by gId (for grouped products)
  const groupedProducts = []
  const processedGIds = new Set()

  cart?.products?.forEach((p, pIdx) => {
    if (p.gId && !processedGIds.has(p.gId)) {
      // This is the first product of a group - collect all products with same gId
      processedGIds.add(p.gId)
      const groupProducts = cart.products
        .map((prod, idx) => ({ ...prod, originalIndex: idx }))
        .filter(prod => prod.gId === p.gId)

      groupedProducts.push({
        type: 'grouped',
        gId: p.gId,
        groupId: p.groupId,
        groupName: p.groupName,
        groupAmount: p.groupAmount, // in dollars
        groupThumbnail: p.groupThumbnail,
        products: groupProducts
      })
    } else if (!p.gId) {
      // Regular product (not part of a group)
      groupedProducts.push({
        type: 'regular',
        product: p,
        originalIndex: pIdx
      })
    }
  })

  return (
    <div className="flex flex-col h-full text-sm bg-muted w-[380px] rounded-tl-lg">
      {isStale && (
        <div className="bg-green-100 text-green-800 text-xs px-4 py-2 border-b border-green-200">
          ✅ Transaction completed - Cart available for review
        </div>
      )}
      <div className="space-y-1 w-full flex-1 overflow-y-auto p-4">
        {groupedProducts.map((item, itemIdx) => {
          if (item.type === 'grouped') {
            // Render group
            const groupTotal = (item.groupAmount || 0) // Group amount is already in dollars
            return (
              <div key={`group-${item.gId}`} className="flex flex-col border-l-2 border-primary pl-2 space-y-1">
                {/* Group header with name, total price, and delete */}
                <div className="flex">
                  <div className='flex'>
                    {item.groupName}
                  </div>
                  <div
                    className='ml-2 cursor-pointer mt-0.5'
                    onClick={(e) => {
                      e.stopPropagation();
                      // Remove all products with this gId
                      const indicesToRemove = item.products.map(p => p.originalIndex).sort((a, b) => b - a)
                      indicesToRemove.forEach(idx => removeFromCart(idx));
                    }}
                  >
                    <Trash2 className='size-4'/>
                  </div>
                  <div className='flex-1' />
                  <div>${groupTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>

                {/* Display individual products within the group */}
                {item.products.map((product, productIdx) => (
                  <div key={productIdx} className="flex flex-col ml-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <div className='flex-1'>
                        {product.name}
                        {product.selectedTimes && product.selectedTimes.length > 0 && (
                          <span className="ml-1 text-xs">
                            ({product.selectedTimes.length} session{product.selectedTimes.length !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                      {/* Show individual price crossed out if it exists */}
                      {product.amount?.total != null && (
                        <div className='line-through text-xs'>
                          ${(product.amount.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>

                    {/* Show selected times for classes if applicable */}
                    {product.selectedTimes?.map((time, timeIdx) => (
                      <div key={timeIdx} className="text-xs text-muted-foreground ml-2">
                        {new Date(time.datetime).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                        {time.label && ` - ${time.label}`}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          }

          // Render regular product
          const p = item.product
          const pIdx = item.originalIndex

          // for shop product item
          if (p.type == 'shop' ) return (
            <div key={pIdx} className="flex flex-col">
              <div className="flex">
                <div className='flex'>
                  {p.qty}x {p.name}
                </div>
                {p.item?.variation && <div className='ml-1'> ({p.item.variation})</div>}
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
                {p.amount?.total != null && <div>${p.amount.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
              </div>
              {p.item?.mods && p.item.mods.length > 0 && (
                <div className='text-xs ml-1 text-muted-foreground'>
                  {p.item.mods.map(mod => mod.name).join(', ')}
                </div>
              )}
            </div>

          );

          // Old nested group handling removed - groups are now flat with gId

          if (p.type=='course') return (
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

              {/* Display prices directly for membership products */}
              {p.prices?.filter(price => price.qty > 0).map((price, i) => (
                <div key={i} className="flex">
                  <div>{price.qty}x {price.name}</div>
                  <div className="ml-auto">${(price.qty * parseFloat(price.value)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
          <Link href="/shop/payment" passHref>
            <Button
              type="submit"
              className="w-full"
              disabled={!cart.products.length || isStale}
              onClick={() => {
                if (asSheet && onClose) onClose()
              }}
            >
              {isStale ? 'Transaction Completed' : 'Payment'}
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
            {isStale ? 'Clear Transaction' : 'Clear Cart'}
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