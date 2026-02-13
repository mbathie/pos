'use client'

import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { Minus, Plus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useGlobals } from '@/lib/globals'
import { useState, useEffect } from 'react'
import { calcCartValueCourse } from '@/lib/product'
import { useClass } from './useClass'
import dayjs from 'dayjs';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getCourseWeeks(schedule) {
  if (!schedule?.startDate || !schedule?.endDate) return { totalWeeks: 0, remainingWeeks: 0 };
  const startDate = new Date(schedule.startDate);
  const endDate = new Date(schedule.endDate);
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;

  const totalWeeks = Math.max(1, Math.ceil((endDate - startDate) / msPerWeek));
  const effectiveStart = now > startDate ? now : startDate;
  const remainingWeeks = Math.max(1, Math.ceil((endDate - effectiveStart) / msPerWeek));
  return { totalWeeks, remainingWeeks };
}

function extractSlots(daysOfWeek, schedule) {
  if (!daysOfWeek) return [];
  const slots = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const startDate = schedule?.startDate ? new Date(schedule.startDate) : now;
  const effectiveStart = now > startDate ? now : startDate;

  for (const day of daysOfWeek) {
    if (day.dayIndex < 0 || day.dayIndex > 6) continue; // skip template entries
    for (const t of day.times || []) {
      if (!t.selected) continue;
      // Calculate next occurrence date for this dayIndex
      // dayIndex: 0=Mon,1=Tue,...,6=Sun   JS getDay(): 0=Sun,1=Mon,...,6=Sat
      const targetJsDay = day.dayIndex === 6 ? 0 : day.dayIndex + 1;
      const d = new Date(effectiveStart);
      const currentJsDay = d.getDay();
      let daysUntil = (targetJsDay - currentJsDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 0; // same day is fine
      d.setDate(d.getDate() + daysUntil);

      slots.push({
        dayIndex: day.dayIndex,
        time: t.time,
        label: t.label || '',
        id: `${day.dayIndex}-${t.time}`,
        nextDate: d,
      });
    }
  }
  return slots;
}

export default function ProductDetail({ open, setOpen, product, setProduct, onAddToCart, isPartOfGroup = false, groupHasPriceOverride = true }) {

  if (!product) return null;

  const { setQty } = useClass({product, setProduct})
  const { addToCart } = useGlobals()
  const [total, setTotal] = useState(0)

  // Extract available day+time slots from schedule
  const availableSlots = extractSlots(product.schedule?.daysOfWeek, product.schedule);
  const selectedSlots = product.selectedSlots || [];

  // Week calculations
  const { totalWeeks, remainingWeeks } = getCourseWeeks(product.schedule);

  // Calculate total quantity purchased
  const totalQuantity = product.prices?.reduce((sum, p) => sum + (p.qty || 0), 0) || 0;

  // Check if minimum purchase requirement is met
  const minPurchase = product.minPurchase || null;
  const meetsMinPurchase = minPurchase === null || totalQuantity >= minPurchase;

  // Auto-select price tier for group products
  useEffect(() => {
    if (isPartOfGroup && product?.groupQty && product?.prices?.length > 0) {
      if (!product.prices[0]?.qty) {
        setProduct(draft => {
          if (draft?.prices?.[0]) {
            draft.prices[0].qty = product.groupQty;
          }
        });
      }
    }
  }, [isPartOfGroup, product?.groupQty, product?.prices?.length]);

  // Auto-select slots for group products based on groupScheduledTime
  useEffect(() => {
    if (!isPartOfGroup || !product?.groupScheduledTime || selectedSlots.length > 0) return;
    if (!availableSlots.length) return;

    const groupTime = product.groupScheduledTime;
    const matching = availableSlots.filter(slot =>
      slot.time === groupTime || slot.time.replace(':', '') === groupTime.replace(':', '')
    );

    if (matching.length > 0) {
      setProduct(draft => {
        draft.selectedSlots = matching;
      });
    }
  }, [isPartOfGroup, product?.groupScheduledTime, availableSlots.length, selectedSlots.length]);

  useEffect(() => {
    async function fetch() {
      if (product) {
        const t = await calcCartValueCourse({ product });
        setTotal(t.amount.subtotal);
      }
    }
    fetch()
  }, [product])

  const toggleSlot = (slot) => {
    setProduct(draft => {
      const current = draft.selectedSlots || [];
      const idx = current.findIndex(s => s.id === slot.id);
      if (idx >= 0) {
        draft.selectedSlots = current.filter(s => s.id !== slot.id);
      } else {
        draft.selectedSlots = [...current, slot];
      }
    });
  };

  // Price per slot per week for display
  const pricePerSlotWeek = product.prices?.reduce((sum, p) => {
    const qty = p.qty || 0;
    return sum + qty * (parseFloat(p.value) || 0);
  }, 0) || 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-[700px] flex flex-col h-full">

        <SheetHeader className=''>
          <SheetTitle>
            <div className='flex items-center space-x-1'>
              <div>{product?.name?.length > 20 ? `${product.name.substring(0, 20)}...` : product?.name}</div>
              <div className="relative size-6 ml-1">
              </div>
            </div>
          </SheetTitle>
          <SheetDescription>
            {product.desc?.length > 100 ? `${product.desc.substring(0, 100)}...` : product.desc}
          </SheetDescription>
        </SheetHeader>

        <div className='flex flex-col mx-4 gap-2'>

          <div className='flex flex-col gap-4 text-sm'>

            {/* Course pricing - price tier +/- buttons */}
            {product.prices && product.prices.length > 0 ? (
              <div className='w-full'>
                <div className='flex flex-col gap-2 w-full'>
                  {product.prices.map((price, priceIdx) => (
                    <div key={priceIdx} className='flex'>
                      <div className='flex gap-2 w-full items-center'>
                        {!isPartOfGroup && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => setQty({ type: '-', vIdx: 0, priceIdx })}
                            disabled={!price.qty}
                          >
                            <Minus />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => {
                            if (isPartOfGroup && price.qty >= 1) return;
                            setQty({ type: '+', vIdx: 0, priceIdx });
                          }}
                          disabled={
                            !isPartOfGroup && product.prices.reduce((sum, p) => sum + (p.qty ?? 0), 0) >= (product.available || 999)
                          }
                        >
                          <Plus />
                        </Button>
                        {price.name}
                        <div className='flex-1' />
                        {price.qty || 0}x
                        <span className={isPartOfGroup && groupHasPriceOverride ? 'line-through text-muted-foreground' : ''}>
                          ${parseFloat(price.value).toFixed(2)}/slot/week
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className='text-center py-8 text-muted-foreground'>
                No pricing available for this course
              </div>
            )}

            {/* Warning when minimum purchase not met */}
            {minPurchase && totalQuantity > 0 && totalQuantity < minPurchase && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-sm text-amber-700 dark:text-amber-400">
                Must purchase at least {minPurchase} spot{minPurchase !== 1 ? 's' : ''}.
              </div>
            )}

            {/* Course schedule info */}
            {product.schedule && (
              <div className='p-3 bg-muted rounded-md text-sm'>
                <div className='flex justify-between items-center'>
                  <div className='font-semibold'>Course Duration</div>
                  {totalWeeks > 0 && (
                    <Badge variant="secondary">
                      {remainingWeeks} of {totalWeeks} weeks remaining
                    </Badge>
                  )}
                </div>
                <div className='mt-1 text-muted-foreground'>
                  {product.schedule.startDate && (
                    <span>{dayjs(product.schedule.startDate).format('DD/MM/YYYY')}</span>
                  )}
                  {product.schedule.endDate && (
                    <span> — {dayjs(product.schedule.endDate).format('DD/MM/YYYY')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Day+time slot multi-select */}
            {availableSlots.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Select Day + Time Slots</h3>
                <div className="space-y-2">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlots.some(s => s.id === slot.id);
                    return (
                      <div
                        key={slot.id}
                        className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md"
                      >
                        <Checkbox
                          id={`slot-${slot.id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleSlot(slot)}
                        />
                        <label
                          htmlFor={`slot-${slot.id}`}
                          className="flex-1 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="font-medium">{DAY_NAMES[slot.dayIndex]}</span>
                          <span>{slot.time}</span>
                          {slot.label && (
                            <Badge variant="secondary">{slot.label}</Badge>
                          )}
                          <span className="text-muted-foreground ml-auto">{dayjs(slot.nextDate).format('DD/MM/YY')}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price breakdown */}
            {totalQuantity > 0 && selectedSlots.length > 0 && remainingWeeks > 0 && (
              <div className='p-3 bg-muted/50 rounded-md text-sm'>
                <div className='font-semibold mb-1'>Price Breakdown</div>
                <div className='text-muted-foreground'>
                  ${pricePerSlotWeek.toFixed(2)}/slot/week × {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} × {remainingWeeks} week{remainingWeeks !== 1 ? 's' : ''} = ${total.toFixed(2)}
                </div>
              </div>
            )}

          </div>

        </div>

        <SheetFooter>
          <div className='flex gap-2 w-full'>
            <div className='flex flex-col w-full'>
              {/* Grand Total for cart */}
              <div className='flex justify-between text-lg font-bold border-gray-200 pt-2'>
                <span>TOTAL</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <Button
                onClick={async () => {
                  // Clean up the product before adding to cart
                  const cleanProduct = {
                    ...product,
                    prices: product.prices?.map(p => ({
                      ...p,
                      qty: p.qty || 0
                    })) || [],
                    selectedSlots: product.selectedSlots || []
                  };

                  const hasItems = cleanProduct.prices.some(p => p.qty > 0);
                  const hasSlots = cleanProduct.selectedSlots.length > 0;
                  if (hasItems && hasSlots) {
                    const productWithAmount = await calcCartValueCourse({ product: cleanProduct });

                    if (onAddToCart) {
                      await onAddToCart(productWithAmount);
                    } else {
                      addToCart(productWithAmount);
                    }
                    setOpen(false);
                  }
                }}
                disabled={
                  !product.prices?.some(p => p.qty > 0) ||
                  selectedSlots.length === 0 ||
                  !meetsMinPurchase
                }
                className='w-full mt-2 cursor-pointer'
              >
                {isPartOfGroup ? 'Ok' : 'Add'}
              </Button>
            </div>
          </div>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  )
}
