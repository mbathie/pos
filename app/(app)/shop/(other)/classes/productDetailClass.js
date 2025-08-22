'use client'

import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { Minus, Plus } from "lucide-react"
import { useGlobals } from '@/lib/globals'
import { useState, useEffect } from 'react'
import { calcCartValueClass, cleanupProduct } from '@/lib/product'
import { 
  MultiSelect, 
  MultiSelectTrigger, 
  MultiSelectValue, 
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectGroup
} from '@/components/ui/multi-select'
import { useClass } from './useClass'

export default function ProductDetail({ product, setProduct, setOpen, open }) {
  
  if (!product) return null;
  
  const { addToCart } = useGlobals()
  const [total, setTotal] = useState(0)
  const [selectedTimes, setSelectedTimes] = useState(product?.selectedTimes || [])

  useEffect(() => {
    async function fetch() {
      if (product) {
        const t = await calcCartValueClass({ product });
        setTotal(t.amount.subtotal);
      }
    }
    fetch()
  }, [product, product?.prices])
  
  // Sync selectedTimes when product changes
  useEffect(() => {
    if (product?.selectedTimes) {
      setSelectedTimes(product.selectedTimes);
    }
  }, [product?.selectedTimes])
  
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

          <div className='flex flex-col gap-2 text-sm w-full'>

            {/* Display prices with quantity selectors */}
            {product.prices?.map((price, priceIdx) => (
              <div key={priceIdx} className='flex'>
                <div className='flex gap-2 w-full items-center'>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProduct(draft => {
                        if (!draft.prices[priceIdx].qty) {
                          draft.prices[priceIdx].qty = 0;
                        }
                        if (draft.prices[priceIdx].qty > 0) {
                          draft.prices[priceIdx].qty--;
                        }
                      });
                    }}
                    disabled={!price.qty}
                  >
                    <Minus />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProduct(draft => {
                        if (!draft.prices[priceIdx].qty) {
                          draft.prices[priceIdx].qty = 0;
                        }
                        draft.prices[priceIdx].qty++;
                      });
                    }}
                  >
                    <Plus />
                  </Button>

                  {price.name}
                  <div className='flex-1' />
                  {price.qty || 0}x
                  ${parseFloat(price.value || 0).toFixed(2)}
                </div>
              </div>
            ))}

            {/* Show time selector if any price has quantity > 0 */}
            {product.prices?.some(p => p.qty > 0) && product.timesCalc?.length > 0 && (
              <MultiSelect 
                values={selectedTimes}
                onValuesChange={(values) => {
                  setSelectedTimes(values);
                  setProduct(draft => {
                    draft.selectedTimes = values;
                  });
                }}
              >
                <MultiSelectTrigger className="w-full">
                  <MultiSelectValue placeholder="Select class times..." />
                </MultiSelectTrigger>
                <MultiSelectContent>
                  <MultiSelectGroup>
                    {product.timesCalc.map((option) => (
                      <MultiSelectItem 
                        key={option.value} 
                        value={option.value}
                        disabled={option.disabled}
                        badgeLabel={`${option.label}${option.timeLabel ? ` - ${option.timeLabel}` : ''}`}
                      >
                        <div className="flex items-center justify-between w-full pr-6">
                          <div className="flex items-center gap-2">
                            <span>{option.label}</span>
                            {option.timeLabel && (
                              <span className="text-muted-foreground text-sm">
                                {option.timeLabel}
                              </span>
                            )}
                          </div>
                          {option.available !== undefined && (
                            <span className="text-muted-foreground text-sm">
                              (x{option.available})
                            </span>
                          )}
                        </div>
                      </MultiSelectItem>
                    ))}
                  </MultiSelectGroup>
                </MultiSelectContent>
              </MultiSelect>
            )}

          </div>

        </div>

        <SheetFooter>
          <div className='flex'>
            <div className='uppercase font-semibold'>total</div>
            <div className='ml-auto'>
              ${total.toFixed(2)}
            </div>
          </div>

          <SheetClose asChild>
            <Button 
              type="submit" 
              disabled={(() => {
                // Check if we have selected prices and times
                const hasSelectedPrices = product.prices?.some(p => (p.qty || 0) > 0);
                const hasSelectedTimes = selectedTimes && selectedTimes.length > 0;
                
                // Need both: selected prices AND selected times
                return !hasSelectedPrices || !hasSelectedTimes;
              })()}
              onClick={async () => {
                // Map selected times to include labels
                const selectedTimesWithLabels = selectedTimes.map(value => {
                  const timeCalc = product.timesCalc?.find(tc => tc.value === value);
                  if (timeCalc?.timeLabel) {
                    // Store as "datetime|label" format
                    return `${value}|${timeCalc.timeLabel}`;
                  }
                  return value;
                });
                
                // Prepare product for cart
                const cartProduct = {
                  ...product,
                  selectedTimes: selectedTimesWithLabels,
                  prices: product.prices?.filter(p => (p.qty || 0) > 0)
                };

                const _product = await calcCartValueClass({product: cartProduct})
                const _productCleaned = await cleanupProduct({product:_product})

                await addToCart(_productCleaned)
              }}
            >
              Add
            </Button>
          </SheetClose>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}