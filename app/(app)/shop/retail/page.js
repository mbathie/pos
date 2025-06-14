'use client'
import React, { useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Checkbox } from "@/components/ui/checkbox"
import { Check, ChevronRight, Minus, Plus } from "lucide-react"
import { useHandler } from './useHandler'
import { useImmer } from 'use-immer'
import { useGlobals } from '@/lib/globals'
import { calcCartValueShop } from '@/lib/product'

export default function Page() {

  const { addToCart } = useGlobals()
  
  const { 
    getProducts, selectVariation, 
    selectMod, getProductTotal, setQty } = useHandler()

  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState(undefined)
  const [products, setProducts] = useState([])
  const [product, setProduct] = useImmer(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (product) {
      const t = getProductTotal({ product });
      setTotal(t);
    }
  }, [product])

  useEffect(() => {
    async function start() {
      const res = await fetch('/api/categories?menu=shop');
      const c = await res.json();
      setCategories(c.categories);
      if (c.categories.length > 0) {
        const p = await getProducts({ category: c.categories[0] });
        setProducts(p.products);
        setCategory(c.categories[0]);
      }
    }
    start()
  },[])

  return (
    <>
      {category?._id &&
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              <div className='flex items-center space-x-1'>
                <div>{category?.name}</div> 
                <ChevronRight className='size-4'/> 
                <div>{product?.name}</div>
                <div className="relative size-6 ml-1">
                  <Image
                    src={product?.data?.thumbnail || "https://static.thenounproject.com/png/2206029-200.png"}
                    alt="Product Icon"
                    fill
                    style={{ objectFit: 'contain' }}
                    className="invert"
                  />
                </div>
              </div>
            </SheetTitle>
            <SheetDescription>
              Description goes here
            </SheetDescription>
          </SheetHeader>

          <div className='px-4 gap-4 flex flex-col'>

            <div className='flex flex-col gap-2'>
              <div className='text-sm'>Variations</div>
              {product?.variations.map((v, vIdx) => {
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
                              onClick={() => selectMod({setProduct, mcIdx, mIdx})}
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
                <div className='ml-auto'>{product?.qty || 0}</div>
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
                disabled={!product?.variations?.some(v => v.selected) || product?.qty === 0}
                onClick={async () => {
                  const _product = await calcCartValueShop({product})
                  addToCart(_product)
                }}
              >
                Add
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      }

      <div className="flex space-x-4 h-full">
        {/* Left Panel */}
        <div className="flex flex-col w-40 bg-accent rounded-tr-lg overflow-y-auto h-full">
          {categories.map((c, cIdx) => (
            <div key={cIdx} className={`${category && c.id === category.id ? 'bg-accent-foreground text-black' : ''}`}>
              <Button
                variant="outline"
                onClick={async () => {
                  const p = await getProducts({category: c})
                  setProducts(p.products)
                  setCategory(c)
                }}
                className="hover:text-black w-full cursor-pointer h-12 rounded-none border-t-0 border-x-0 last:border-b-0"
              >
                {c.name}
              </Button>
            </div>
          ))}
        </div>

        {/* Right Panel */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-wrap gap-4">
            {products.map((p, pIdx) => (
              <Card key={pIdx} className="aspect-square size-24 flex flex-col items-center justify-center text-center">
                <CardContent>
                  <Button
                    onClick={() => {
                      setProduct(p)
                      setSheetOpen(true)
                    }}
                    className="flex flex-col space-y-1 size-24 border-0 cursor-pointer"
                    variant="outline"
                  >
                    <div className="relative size-9">
                      <Image
                        src={p.data?.thumbnail || "https://static.thenounproject.com/png/2206029-200.png"}
                        alt="Product Icon"
                        fill
                        style={{ objectFit: 'contain' }}
                        className="invert"
                      />
                    </div>
                    <div>{p.name}</div>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}