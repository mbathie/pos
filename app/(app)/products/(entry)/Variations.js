'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Ellipsis, Info } from 'lucide-react'
import { useEffectHook } from './useVariation'

import Add from './Add'
import Delete from '../Delete'

const Variations = ({
  productIdx,
  product,
  setProducts,
  products,
  units,
}) => {
  // Use the hook directly to get functions and state
  const { changeName, addVariation, deleteVariation, changeUnit } = useEffectHook(setProducts);

  const [addOpen, setAddOpen] = useState(false)
  const [addTarget, setAddTarget] = useState({})
  // State for Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteData, setDeleteData] = useState(null);

  return (
    <div>
      <div className="flex space-x-2 mb-4">
        <Button size="sm" variant="outline" onClick={() => addVariation(productIdx)}>
          Add Time
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
          setAddOpen(!addOpen);
          setAddTarget({ productIdx });
        }}>
          Add Price
        </Button>

      </div>

      {product.variations?.length > 0 && (
        <div className="flex flex-row">
          <Label className="text-xs mb-1 w-18">
            Time
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size="15"/>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter your Membership details</p>
                  <p>For a 1 month membership</p>
                  <p>&nbsp;Time = 1</p>
                  <p>&nbsp;Unit = Month</p>
                  <p>You can add Youth, Adult, etc variations</p>
                  <p>by hitting the plus button beside each time</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          {/* <Label className="text-xs mb-1 w-26">Price</Label> */}
          <Label className="text-xs mb-1 w-28">Unit</Label>
          {product.variations?.[0]?.prices?.map((price, i) => (
            <Label key={i} className="w-18 text-xs capitalize">{price.name} ($)</Label>
          ))}
        </div>
      )}

      {product.variations?.map((v, i) => {
        console.log('re-rending variations');
        return (
          <div className="flex items-start space-x-2 space-y-2" key={`${i}`}>
            <div className="flex flex-col w-16">
              <Input
                type="number"
                placeholder="1"
                value={v.name || ''}
                min={0}
                className="text-sm"
                onChange={(e) => changeName(productIdx, i, e.target.value)}
              />
            </div>

            <div className="w-26">
              <Select
                value={v.unit}
                onValueChange={(unit) => changeUnit(productIdx, i, unit)}
              >
                <SelectTrigger className="w-26">
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {units.map((unit, idx) => (
                      <SelectItem key={idx} value={unit}>
                        {unit.charAt(0).toUpperCase() + unit.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {v.prices?.map((nested, j) => (
              <Input
                key={j}
                className="w-16 text-sm"
                value={nested.value}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setProducts((draft) => {
                    draft[productIdx].variations[i].prices[j].value = val;
                  });
                }}
                placeholder={nested.name}
              />
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="icon">
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  Link Benefits
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDeleteData({
                      name: `${v.name} ${v.unit}` || 'variation',
                      type: 'variation',
                      productIdx,
                      variationIdx: i
                    });
                    setDeleteOpen(true);
                  }}
                >
                  Delete Variation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
      <Add
        open={addOpen}
        data={{...addTarget}}
        onOpenChange={setAddOpen}
        setProducts={setProducts}
      />
      <Delete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        name={deleteData?.name}
        onConfirm={async () => {
          await deleteVariation(deleteData.productIdx, deleteData.variationIdx, product);
          setDeleteOpen(false);
        }}
      />
    </div>
  )
}

export default Variations