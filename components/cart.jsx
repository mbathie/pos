'use client'
import Link from 'next/link';
import { useGlobals } from '@/lib/globals'
import { Trash2, Info, Save, Clock, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
dayjs.updateLocale('en', {
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: 'a few sec',
    m: '1 min',
    mm: '%d min',
    h: '1 hr',
    hh: '%d hrs',
    d: '1 day',
    dd: '%d days',
    M: '1 month',
    MM: '%d months',
    y: '1 year',
    yy: '%d years'
  }
});
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import CourseScheduleDialog from '@/components/CourseScheduleDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from 'sonner';

export default function Cart({ asSheet = false, onClose, onEditGroup }) {
  const {
    getCurrentCart,
    carts,
    currentCartIndex,
    removeFromCart,
    resetCart,
    saveCart,
    switchCart,
    deleteCart
  } = useGlobals()
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [originalTransaction, setOriginalTransaction] = useState(null)
  const [mounted, setMounted] = useState(false)

  // Wait for client-side mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Get current cart
  const cart = getCurrentCart()

  // Show visual indicator for stale carts
  const isStale = cart.stale

  // Check if we're editing a transaction
  const isEditingTransaction = !!cart.editingTransactionId

  // Fetch original transaction when editing
  useEffect(() => {
    if (cart.editingTransactionId) {
      fetchOriginalTransaction(cart.editingTransactionId)
    } else {
      setOriginalTransaction(null)
    }
  }, [cart.editingTransactionId])

  const fetchOriginalTransaction = async (transactionId) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`)
      if (response.ok) {
        const data = await response.json()
        setOriginalTransaction(data)
      }
    } catch (error) {
      console.error('Error fetching transaction:', error)
    }
  }

  // Calculate differential amounts when editing
  const originalTotal = originalTransaction?.total || 0
  const originalSubtotal = originalTransaction?.subtotal || 0
  const originalTax = originalTransaction?.tax || 0

  const differentialSubtotal = cart.subtotal - originalSubtotal
  const differentialTax = cart.tax - originalTax
  const differentialTotal = cart.total - originalTotal

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) return null

  // Don't show cart if empty and no saved carts (unless it's being used as a sheet)
  // Show cart if there are saved carts even when current cart is empty (to allow switching)
  if ((cart.products.length < 1 && carts.length <= 1) && !asSheet)
    return null
  if (isStale && !asSheet)
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
        selectedVariationName: p.selectedVariationName, // variation name for display
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

  // Format cart label for dropdown
  const formatCartLabel = (cart, index) => {
    if (!cart.savedAt) {
      return index === currentCartIndex ? 'Current Cart' : `Cart ${index + 1}`;
    }
    const date = dayjs(cart.savedAt);
    return `${date.format('h:mm A')} (${date.fromNow()}) - ${cart.products.length} item${cart.products.length !== 1 ? 's' : ''}`;
  };

  // Check if there are any saved carts (carts with savedAt timestamp)
  const hasSavedCarts = carts.some(c => c.savedAt);

  return (
    <div className="flex flex-col h-full text-sm bg-muted w-[380px] rounded-tl-lg" suppressHydrationWarning>
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
            const groupQty = item.products[0]?.groupQty || 1 // Get qty from first product
            return (
              <div key={`group-${item.gId}`} className="flex flex-col border-l-2 border-primary pl-2 space-y-1">
                {/* Group header with name, total price, edit, and delete */}
                <div className="flex" suppressHydrationWarning>
                  <div className='flex'>
                    {groupQty > 1 && <span>{groupQty}x&nbsp;</span>}
                    {item.groupName}
                    {item.selectedVariationName && (
                      <span className="text-muted-foreground"> - {item.selectedVariationName}</span>
                    )}
                  </div>
                  {onEditGroup ? (
                    <div
                      className='ml-2 cursor-pointer mt-0.5'
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditGroup(item);
                      }}
                    >
                      <Pencil className='size-4'/>
                    </div>
                  ) : null}
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
                  <div>${(groupTotal * groupQty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                      {/* Show individual price - crossed out only if group has override price */}
                      {product.amount?.subtotal != null && (
                        <div className={`text-xs ${product.groupHasPriceOverride !== false ? 'line-through' : ''}`}>
                          ${(product.amount.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>

                    {/* Show selected times for classes if applicable */}
                    {product.selectedTimes?.map((time, timeIdx) => (
                      <div key={timeIdx} className="text-xs text-muted-foreground ml-2" suppressHydrationWarning>
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
                {p.amount?.subtotal != null && <div>${p.amount.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
              </div>
              {p.item?.mods && p.item.mods.length > 0 && (
                <div className='text-xs ml-1 text-muted-foreground'>
                  {p.item.mods.map(mod => mod.qty > 1 ? `${mod.name} x${mod.qty}` : mod.name).join(', ')}
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
                    <span suppressHydrationWarning>
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
                      <span suppressHydrationWarning>{dayjs(datetime).format('ddd DD/MM/YY HH:mm A')}</span>
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
        {/* Only show totals and payment when cart has products */}
        {cart.products.length > 0 && (
          <>
            <div className='flex flex-col text-sm'>
              <div className='flex'>
                <div className=''>Subtotal</div>
                <div className='ml-auto'>
                  {isEditingTransaction ? (
                    differentialSubtotal.toLocaleString('en-US', { style: 'currency', currency: 'USD', signDisplay: 'always' })
                  ) : (
                    `$${cart.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </div>
              </div>
              <div className='flex'>
                <div className=''>Tax</div>
                <div className='ml-auto'>
                  {isEditingTransaction ? (
                    differentialTax.toLocaleString('en-US', { style: 'currency', currency: 'USD', signDisplay: 'always' })
                  ) : (
                    `$${cart.tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </div>
              </div>
              <div className='flex font-semibold'>
                <div className='uppercase'>Total</div>
                <div className='ml-auto'>
                  {isEditingTransaction ? (
                    differentialTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD', signDisplay: 'always' })
                  ) : (
                    `$${cart.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </div>
              </div>
            </div>

            <div className='flex flex-col gap-2 mt-2'>
              {/* Payment Button or Update Invoice Button */}
              {isEditingTransaction ? (
                <ActionButton
                  action={async () => {
                    try {
                      const response = await fetch(`/api/transactions/${cart.editingTransactionId}/update-invoice`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          differentialAmount: differentialTotal
                        })
                      });

                      const data = await response.json();

                      if (!response.ok) {
                        return {
                          error: true,
                          message: data.error || 'Failed to update invoice'
                        };
                      }

                      toast.success('Invoice updated successfully');

                      // Clear the cart and reset editing state
                      resetCart();

                      // Redirect to the transaction page
                      window.location.href = `/manage/transactions/${cart.editingTransactionId}`;

                      return { error: false };
                    } catch (error) {
                      console.error('Error updating invoice:', error);
                      return {
                        error: true,
                        message: 'Failed to update invoice'
                      };
                    }
                  }}
                  requireAreYouSure
                  areYouSureDescription={`This will ${differentialTotal >= 0 ? 'add' : 'subtract'} ${Math.abs(differentialTotal).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} ${differentialTotal >= 0 ? 'to' : 'from'} the existing invoice. This action cannot be undone.`}
                  className="w-full cursor-pointer"
                  disabled={!cart.products.length || isStale || differentialTotal === 0}
                >
                  Update Invoice
                </ActionButton>
              ) : (
                <Link href="/shop/payment" passHref>
                  <Button
                    type="submit"
                    className="w-full cursor-pointer"
                    disabled={!cart.products.length || isStale}
                    onClick={() => {
                      if (asSheet && onClose) onClose()
                    }}
                  >
                    {isStale ? 'Transaction Completed' : 'Payment'}
                  </Button>
                </Link>
              )}

              {/* Save Cart Button - only show if cart has items and isn't already saved */}
              {!cart.savedAt && !isStale && (
                <Button
                  type="button"
                  className="w-full cursor-pointer"
                  onClick={() => {
                    saveCart();
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Cart
                </Button>
              )}

              {/* Clear Cart Button */}
              <Button
                type="submit"
                className="w-full cursor-pointer"
                variant="destructive"
                onClick={() => {
                  resetCart()
                  if (asSheet && onClose) onClose()
                }}
              >
                {isStale ? 'Clear Transaction' : 'Clear Cart'}
              </Button>
            </div>
          </>
        )}

        {/* Cart Selector Dropdown - always show if there are multiple carts */}
        {carts.length > 1 && (
          <div className={`flex items-center gap-1 ${cart.products.length > 0 ? 'mt-2' : ''}`} suppressHydrationWarning>
            <Select value={String(currentCartIndex)} onValueChange={(value) => switchCart(parseInt(value))}>
              <SelectTrigger className="h-10 text-xs flex-1 bg-primary text-primary-foreground border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {carts.map((c, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {formatCartLabel(c, idx)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasSavedCarts && currentCartIndex !== 0 && cart.savedAt && (
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 cursor-pointer flex-shrink-0"
                onClick={() => deleteCart(currentCartIndex)}
                title="Delete this saved cart"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
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