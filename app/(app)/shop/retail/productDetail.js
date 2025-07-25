'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { Minus, Plus } from "lucide-react"
import { useHandler } from './useHandler'
import { useGlobals } from '@/lib/globals'
import { Checkbox } from '@/components/ui/checkbox'
import { calcCartValueShop } from '@/lib/product'

export default function ProductDetail({ product, setProduct, setOpen, open }) {
  const [total, setTotal] = useState(0)
  const { 
    getProducts, selectVariation, 
    selectMod, getProductTotal, setQty } = useHandler()
  const { addToCart } = useGlobals()

  useEffect(() => {
    if (product?._id && product?.qty) {
      const total = getProductTotal({product})
      setTotal(total)
    }
  }, [product])

  if (!product?._id) return
  
  return (

    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            <div className='flex items-center space-x-1'>
              {/* <div>{category?.name}</div>  */}
              {/* <ChevronRight className='size-4'/>  */}
              <div>{product?.name?.length > 20 ? `${product.name.substring(0, 20)}...` : product?.name}</div>
              <div className="relative size-6 ml-1">
              </div>
            </div>
          </SheetTitle>
          <SheetDescription>
            {product.desc?.length > 100 ? `${product.desc.substring(0, 100)}...` : product.desc}
          </SheetDescription>
        </SheetHeader>

        <div className='px-4 gap-4 flex flex-col'>

          {product?.variations &&
            <div className='flex flex-col gap-2'>
              <div className='text-sm'>Variations</div>
              {product?.variations?.map((v, vIdx) => {
                return (
                  <div 
                    key={vIdx} className='text-sm flex space-x-2 items-center w-full'
                    onClick={() => selectVariation({setProduct, vIdx})}
                  >
                    <Checkbox checked={v.selected} />
                    <div>{v.name}</div>
                    <div className='ml-auto'>${parseFloat(v.amount).toFixed(2)}</div>
                  </div>
                )
              })}
            </div>
          }

          <div className='flex flex-col gap-2'>
            {/* <div className='text-sm'>Mods</div> */}
            {product?.modCats.map((mc, mcIdx) => {
              return (
                <div 
                  key={mcIdx} className='text-sm flex space-x-4 items-center w-full'
                >
                  {/* <Checkbox checked={v.selected} /> */}
                  <div className='flex flex-col gap-2'>
                    {mc.mods.some(m => m.enabled) && <div>{mc.name}</div>}
                    <div className='flex flex-wrap gap-2'>
                      {mc.mods.filter(m => m.enabled).map((m, mIdx) => {
                        return (
                          <div 
                            key={m._id} className='gap-2 flex items-center flex-row'
                            onClick={() => selectMod({setProduct, mcIdx, mIdx, mName: m.name})}
                          >
                            <Checkbox checked={m.selected} />
                            <div>{m.name}</div>
                            {m.amount > 0 && <div>${parseFloat(m.amount).toFixed(2)}</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className='flex flex-col gap-2'>
            <div className='text-sm'>Qty</div>
            <div className='flex gap-2'>
              <Button variant="" size="sm" onClick={() => setQty({ setProduct, type: 'decrement' })}><Minus /></Button>
              <Button variant="" size="sm" onClick={() => setQty({ setProduct, type: 'increment' })}><Plus /></Button>
              <div className='ml-auto'>{product?.qty || 1}</div>
            </div>
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
              // disabled={product?.qty === 0}
              disabled={!product?.variations?.some(v => v.selected) || !(product?.qty >= 1)}
              onClick={async () => {
                const _product = await calcCartValueShop({product})
                await addToCart({..._product, type: "shop"})
              }}
            >
              Add
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}