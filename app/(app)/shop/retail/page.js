'use client'
import React, { useEffect, useState } from 'react'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronRight, Minus, Plus, Folder } from "lucide-react"
import { useHandler } from './useHandler'
import { useImmer } from 'use-immer'
import { useGlobals } from '@/lib/globals'
import { calcCartValueShop } from '@/lib/product'
import colors from 'tailwindcss/colors';

function groupProductsByFolder(products) {
  return products.reduce((acc, prod) => {
    const folder = prod.folder?.name || 'All Other';
    if (!acc[folder]) acc[folder] = { products: [] };
    acc[folder].products.push(prod);
    return acc;
  }, {});
}

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
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/categories?menu=shop');
      const c = await res.json();
      setCategories(c.categories);
      if (c.categories.length > 0) {
        const p = await getProducts({ category: c.categories[0] });
        const grouped = groupProductsByFolder(p.products);
        setProducts(grouped);

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
                <div>{product?.name?.length > 20 ? `${product.name.substring(0, 20)}...` : product?.name}</div>
                <div className="relative size-6 ml-1">
                </div>
              </div>
            </SheetTitle>
            <SheetDescription>
              Description goes here
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
                // disabled={product?.qty === 0}
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
            <div key={cIdx} className={`${category && c._id === category._id ? 'bg-accent-foreground text-black' : ''}`}>
              <Button
                variant="outline"
                onClick={async () => {
                  const p = await getProducts({ category: c });
                  const grouped = groupProductsByFolder(p.products);
                  setProducts(grouped);
                  setCategory(c);
                }}
                className="hover:text-black w-full cursor-pointer h-12 rounded-none border-t-0 border-x-0 last:border-b-0"
              >
                {c.name}
              </Button>
            </div>
          ))}
        </div>

        {/* Right Panel */}

        <div className='flex flex-wrap gap-4 text-sm content-start'>
          {Object.entries(products).map(([folderName, group]) => (
            <React.Fragment key={folderName}>

              <div className='w-24 flex flex-col text-center text-xs'>
                <div
                  onClick={() => setProducts(prev => ({
                    ...prev,
                    [folderName]: {
                      ...prev[folderName],
                      expanded: !prev[folderName].expanded
                    }
                  }))}
                  className='cursor-pointer size-24 rounded-lg flex items-center justify-center'
                  style={{
                    backgroundColor: colors?.[group?.products[0]?.folder?.color?.split('-')[0]]?.[group?.products[0]?.folder?.color?.split('-')[1]]
                  }}
                >
                  <Folder className='size-8 opacity-60'/>
                </div>
                {folderName}
              </div>

              {group.expanded && group?.products.map((p, pIdx) => {

                const isIcon = !p?.thumbnail || p?.thumbnail?.includes("thenounproject.com");

                return (
                  <div
                    key={p._id}
                    className='w-24 flex flex-col items-center text-center'
                  >
                    <div 
                      className="cursor-pointer border border-accent-foreground/50 relative size-24 rounded-lg"
                      onClick={() => {
                        setProduct(p)
                        setSheetOpen(true)
                      }}
                    >
                      <Image
                        src={p?.thumbnail || "https://static.thenounproject.com/png/2206029-200.png"}
                        alt="Product Icon"
                        fill
                        style={{ objectFit: 'contain' }}
                        className={`rounded-lg ${isIcon ? 'invert' : ''}`}
                      />
                    </div>
                    <div className="text-xs w-24">{p.name}</div>
                  </div>
                )



              })}
            </React.Fragment>
          ))}

        </div>


      </div>
    </>
  )
}