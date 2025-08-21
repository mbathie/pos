'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetFooter, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import React from 'react'
import { Minus, Plus, Loader2 } from "lucide-react"
import { useHandler } from './useHandler'
import { useGlobals } from '@/lib/globals'
import { Checkbox } from '@/components/ui/checkbox'
import { calcCartValueShop } from '@/lib/product'

export default function ProductDetail({ product, setProduct, setOpen, open }) {
  const [total, setTotal] = useState(0)
  const [modGroups, setModGroups] = useState([])
  const [loadingMods, setLoadingMods] = useState(false)
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

  // Fetch ModGroups when product changes
  useEffect(() => {
    async function fetchProductMods() {
      if (!product?._id || !product?.modGroups?.length) {
        setModGroups([])
        return
      }
      
      try {
        setLoadingMods(true)
        // Fetch all modGroups with their mods
        const modGroupPromises = product.modGroups.map(groupId => 
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/modgroups/${groupId}?includeMods=true`)
            .then(res => res.json())
        )
        
        const fetchedGroups = await Promise.all(modGroupPromises)
        
        // Deep clone the groups to avoid read-only issues and initialize selected: false
        const groupsWithSelection = fetchedGroups.map(group => ({
          _id: group._id,
          name: group.name,
          allowMultiple: group.allowMultiple || false,
          required: group.required || false,
          order: group.order || 0,
          mods: (group.mods || []).map(mod => ({
            _id: mod._id,
            name: mod.name,
            price: mod.price || 0,
            isDefault: mod.isDefault || false,
            order: mod.order || 0,
            selected: false
          }))
        }))
        
        setModGroups(groupsWithSelection)
        
        // Update product with modGroups data
        setProduct(draft => {
          draft.modGroupsData = groupsWithSelection
        })
      } catch (error) {
        console.error('Error fetching mod groups:', error)
      } finally {
        setLoadingMods(false)
      }
    }
    
    if (open && product?._id) {
      fetchProductMods()
    }
  }, [open, product?._id, product?.modGroups])

  if (!product?._id) return
  
  return (

    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-[700px] flex flex-col h-full">
        <SheetHeader className="shrink-0">
          <SheetTitle>
            <div className='flex items-center space-x-1'>
              {/* <div>{category?.name}</div>  */}
              {/* <ChevronRight className='size-4'/>  */}
              <div>{product?.name?.length > 30 ? `${product.name.substring(0, 30)}...` : product?.name}</div>
              <div className="relative size-6 ml-1">
              </div>
            </div>
          </SheetTitle>
          <SheetDescription>
            {product.desc?.length > 150 ? `${product.desc.substring(0, 150)}...` : product.desc}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable content area */}
        <div className='flex-1 overflow-y-auto px-4'>
          <div className='gap-2 flex flex-col'>

            {product?.variations &&
              <div className='flex flex-col gap-2'>
                <div className='text-sm font-medium'>Variations</div>
                {product?.variations?.map((v, vIdx) => {
                  return (
                    <div 
                      key={vIdx} className='text-sm flex space-x-2 items-center w-full cursor-pointer hover:bg-muted/50 py-1 rounded-md'
                      onClick={() => selectVariation({setProduct, vIdx})}
                    >
                      <Checkbox checked={v.selected} className='size-9' />
                      <div>{v.name}</div>
                      <div className='ml-auto'>${parseFloat(v.amount).toFixed(2)}</div>
                    </div>
                  )
                })}
              </div>
            }

            {loadingMods && (
              <div className='flex items-center justify-center py-4'>
                <Loader2 className='h-6 w-6 animate-spin' />
              </div>
            )}
            
            {!loadingMods && modGroups.length > 0 && (
              <div className='flex flex-col gap-4'>
                {modGroups.map((group, groupIdx) => (
                  <div key={group._id} className='flex flex-col gap-2'>
                    <div className='text-sm font-medium'>
                      {group.name}
                      {group.required && <span className='text-muted-foreground ml-2'>(Required)</span>}
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {group.mods.map((mod, modIdx) => (
                        <div 
                          key={mod._id} 
                          className='gap-2 flex items-center flex-row cursor-pointer hover:bg-muted/50 p-2 pl-0 rounded-md'
                          onClick={() => {
                            setModGroups(prev => {
                              // Deep clone to avoid mutation issues
                              const updated = prev.map((group, gIdx) => {
                                if (gIdx !== groupIdx) return group
                                
                                return {
                                  ...group,
                                  mods: group.mods.map((m, mIdx) => {
                                    if (!group.allowMultiple) {
                                      // Single selection - only the clicked mod can be selected
                                      return {
                                        ...m,
                                        selected: mIdx === modIdx ? !m.selected : false
                                      }
                                    } else {
                                      // Multiple selection - toggle only the clicked mod
                                      return mIdx === modIdx 
                                        ? { ...m, selected: !m.selected }
                                        : m
                                    }
                                  })
                                }
                              })
                              
                              // Update product with the new selection
                              setProduct(draft => {
                                draft.modGroupsData = updated
                              })
                              
                              return updated
                            })
                          }}
                        >
                          <Checkbox checked={mod.selected} className='size-9' />
                          <div>{mod.name}</div>
                          {mod.price > 0 && <div className='ml-1'>${parseFloat(mod.price).toFixed(2)}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* Fixed bottom section */}
        <div className='shrink-0 border-t bg-background'>
          <div className='px-4 py-4 space-y-4'>
            <div className='flex flex-col gap-2'>
              <div className='text-sm font-medium'>Qty</div>
              <div className='flex gap-2 items-center'>
                <Button size="icon" onClick={() => setQty({ setProduct, type: 'decrement' })} disabled={product?.qty <= 1}>
                  <Minus className='h-4 w-4' />
                </Button>
                <Button size="icon" onClick={() => setQty({ setProduct, type: 'increment' })}>
                  <Plus className='h-4 w-4' />
                </Button>
                <div className='flex-1' />
                <div className='font-semibold'>{product?.qty || 1}</div>
              </div>
            </div>

            <div className='flex items-center'>
              <div className='uppercase'>total</div>
              <div className='ml-auto'>
                ${total.toFixed(2)}
              </div>
            </div>

            <SheetClose asChild>
              <Button 
                type="submit" 
                className='w-full'
                size='lg'
                disabled={!product?.variations?.some(v => v.selected) || !(product?.qty >= 1)}
                onClick={async () => {
                  const _product = await calcCartValueShop({product})
                  await addToCart({..._product, type: "shop"})
                }}
              >
                Add to Cart
              </Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}