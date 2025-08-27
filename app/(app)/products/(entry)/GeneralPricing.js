'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Trash2, Info } from 'lucide-react'

const GeneralPricing = ({
  productIdx,
  product,
  setProducts,
}) => {
  
  const addPrice = () => {
    setProducts((draft) => {
      if (!draft[productIdx].prices) {
        draft[productIdx].prices = [];
      }
      draft[productIdx].prices.push({
        name: '',
        value: 0,
        minor: false
      });
    });
  };

  const deletePrice = (priceIdx) => {
    setProducts((draft) => {
      draft[productIdx].prices.splice(priceIdx, 1);
    });
  };

  const updatePriceName = (priceIdx, name) => {
    setProducts((draft) => {
      draft[productIdx].prices[priceIdx].name = name;
    });
  };

  const updatePriceValue = (priceIdx, value) => {
    setProducts((draft) => {
      draft[productIdx].prices[priceIdx].value = value;
    });
  };

  const updatePriceMinor = (priceIdx, minor) => {
    setProducts((draft) => {
      draft[productIdx].prices[priceIdx].minor = minor;
    });
  };

  return (
    <div className=''>
      <div className="flex space-x-2 mb-4">
        <Button size="sm" variant="outline" onClick={addPrice}>
          Add Price
        </Button>
      </div>

      {product.prices?.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-row gap-2 items-center">
            <Label className="w-32 text-xs">Price Name</Label>
            <Label className="w-24 text-xs">Amount ($)</Label>
            <Label className="flex items-center gap-1 text-xs">
              Minor
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Price is for a minor, generally under 18 years old. Will require consent from a guardian or parent</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="w-8"></div>
          </div>
          
          {product.prices.map((price, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Adult"
                value={price.name || ''}
                className="w-32 text-sm"
                onChange={(e) => updatePriceName(i, e.target.value)}
              />
              <NumberInput
                placeholder="0.00"
                value={price.value || null}
                min={0}
                step={0.01}
                className="w-24 text-sm"
                onChange={(value) => updatePriceValue(i, value)}
              />
              <div className="flex items-center justify-center w-[50px]">
                <Checkbox
                  checked={price.minor || false}
                  onCheckedChange={(checked) => updatePriceMinor(i, checked)}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deletePrice(i)}
                className="w-8 h-8 p-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default GeneralPricing