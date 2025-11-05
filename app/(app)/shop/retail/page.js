'use client'
import React, { useEffect, useState } from 'react'
import { useHandler } from './useHandler'
import { useImmer } from 'use-immer'
import ProductDetail from './productDetail'
import ProductDetailClass from '../(other)/classes/productDetailClass'
import ProductDetailCourse from '../(other)/classes/ProductDetailCourse'
import ProductDetailMembership from '../(other)/memberships/productDetailMembership'
import GroupSheet from '../GroupSheet'
import Categories from './cats'
import Product from '../product'
import { useRouter } from 'next/navigation';
import colors from '@/lib/tailwind-colors';
import { Plus, Minus } from 'lucide-react'
import Cart from '@/components/cart'
import { useClass } from '../(other)/classes/useClass'
import { useMembership } from '../(other)/memberships/useMembership'
import { useGlobals } from '@/lib/globals'

// Helper function to migrate old schedule format to new format
function migrateScheduleFormat(schedule) {
  if (!schedule) return schedule;

  // Check if already in new format
  if (schedule.daysOfWeek && Array.isArray(schedule.daysOfWeek) &&
      schedule.daysOfWeek.length > 0 && typeof schedule.daysOfWeek[0] === 'object') {
    return schedule;
  }

  // Convert old format to new format
  const newDaysOfWeek = [];

  // Convert times array to All template
  if (schedule.times && Array.isArray(schedule.times)) {
    const allTimes = schedule.times.map(t => {
      if (typeof t === 'string') {
        return { time: t, label: '', selected: true };
      }
      return { ...t, selected: true };
    });
    newDaysOfWeek.push({ dayIndex: -1, times: allTimes });
  }

  // Convert boolean daysOfWeek array to new structure
  if (schedule.daysOfWeek && Array.isArray(schedule.daysOfWeek)) {
    const oldDaysOfWeek = schedule.daysOfWeek;
    const allDay = newDaysOfWeek.find(d => d.dayIndex === -1);
    const templateTimes = allDay?.times || [];

    oldDaysOfWeek.forEach((isActive, dayIdx) => {
      if (isActive && templateTimes.length > 0) {
        newDaysOfWeek.push({
          dayIndex: dayIdx,
          times: templateTimes.map(t => ({ ...t, selected: true }))
        });
      }
    });
  }

  return {
    ...schedule,
    daysOfWeek: newDaysOfWeek.length > 0 ? newDaysOfWeek : schedule.daysOfWeek
  };
}

export default function Page() {

  const {
    getProducts, selectVariation,
    selectMod, getProductTotal, setQty } = useHandler()

  const { addToCart } = useGlobals()

  const [posInterface, setPosInterface] = useState(null)
  const [category, setCategory] = useState(undefined)
  const [products, setProducts] = useState([])
  const [productsInit, setProductsInit] = useState([])
  const [folders, setFolders] = useState([])
  const [items, setItems] = useState([]) // Ordered list of folders, products, and dividers
  const [product, setProduct] = useImmer(null)
  const [open , setOpen] = useState(false)

  const [folder, setFolder] = useState(null)
  const [expandedFolders, setExpandedFolders] = useState(new Set())

  const [total, setTotal] = useState(0)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupSheetOpen, setGroupSheetOpen] = useState(false)
  const router = useRouter();

  // Initialize class/course hooks
  const { setTimesClass, setTimesCourse } = useClass({ product, setProduct })
  const { } = useMembership({ product, setProduct })

  // Load assigned POS interface on mount
  useEffect(() => {
    loadPOSInterface()
  }, [])

  const loadPOSInterface = async () => {
    try {
      const response = await fetch('/api/posinterfaces/for-device')
      if (response.ok) {
        const data = await response.json()
        if (data.posInterface && data.posInterface._id) {
          // Fetch full POS interface data
          const interfaceRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${data.posInterface._id}`)
          if (interfaceRes.ok) {
            const interfaceData = await interfaceRes.json()
            setPosInterface(interfaceData.interface)

            // Auto-select first category
            if (interfaceData.interface.categories && interfaceData.interface.categories.length > 0) {
              const firstCategory = interfaceData.interface.categories[0]
              handleSetCatFromPOS(firstCategory)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading POS interface:', error)
    }
  }

  useEffect(() => {
    if (product) {
      const t = getProductTotal({ product });
      setTotal(t);
    }
  }, [product])

  const handleSetCatFromPOS = async (categoryData) => {
    setCategory({ _id: categoryData._id, name: categoryData.name });
    setFolder(null);
    setExpandedFolders(new Set());

    // Process items from POS interface (already populated with data)
    const allItems = [];

    if (categoryData.items && categoryData.items.length > 0) {
      // Sort by order
      const sortedItems = [...categoryData.items].sort((a, b) => (a.order || 0) - (b.order || 0));

      for (const item of sortedItems) {
        if (item.itemType === 'folder' && item.data) {
          // Use unified items array for proper ordering of products and groups
          allItems.push({
            ...item.data,
            _id: item.itemId,
            type: 'folder',
            order: item.order,
            items: item.data.items || [], // Unified array with correct order
            products: item.data.products || [], // Legacy support
            groups: item.data.groups || [] // Legacy support
          });
        } else if (item.itemType === 'divider' && item.data) {
          allItems.push({
            ...item.data,
            _id: item.itemId,
            type: 'divider',
            order: item.order
          });
        } else if (item.itemType === 'product' && item.data) {
          allItems.push({
            ...item.data,
            _id: item.itemId,
            type: 'product',
            order: item.order
          });
        }
      }
    }

    setItems(allItems);

    // Legacy state for backward compatibility
    const productArray = allItems.filter(i => i.type === 'product');
    setProducts(productArray);
    setProductsInit(productArray);
  }

  const handleSetCat = async (c) => {
    setCategory(c);
    setFolder(null);
    setExpandedFolders(new Set());

    const p = await getProducts({ category: c });

    // Fetch folders for this category
    const foldersRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders?category=${c._id}`);
    const foldersData = await foldersRes.json();

    // Build unified items array (folders, products, dividers) in order
    const allItems = [];
    const foldersMap = {};

    // Process folders
    const allFolders = Array.isArray(foldersData) ? foldersData : [];
    allFolders.forEach(folder => {
      const folderItem = {
        ...folder,
        type: 'folder',
        products: []
      };
      foldersMap[folder._id] = folderItem;
      allItems.push(folderItem);
    });

    // Process products
    const productsData = Array.isArray(p.products) ? p.products : [];

    for (const product of productsData) {
      if (product.type === 'divider') {
        allItems.push({
          ...product,
          type: 'divider'
        });
      } else if (product.folder && product.folder._id && foldersMap[product.folder._id]) {
        // Add to folder's products array
        foldersMap[product.folder._id].products.push(product);
      } else {
        // Standalone product
        allItems.push({
          ...product,
          type: 'product'
        });
      }
    }

    // Sort all items by order
    allItems.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Sort products within folders
    Object.values(foldersMap).forEach(folder => {
      folder.products.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    setItems(allItems);

    // Keep legacy state for backward compatibility
    const folderArray = allFolders.map(f => ({
      name: f.name,
      _id: f._id,
      color: f.color,
      products: foldersMap[f._id]?.products || []
    }));
    const productArray = allItems.filter(i => i.type === 'product');

    setProducts(productArray);
    setProductsInit(productArray);
    setFolders(folderArray);
  }

  return (
    <>
      {/* Render appropriate product detail component based on type */}
      {product?.type === 'class' && (
        <ProductDetailClass product={product} setProduct={setProduct} open={open} setOpen={setOpen} />
      )}
      {product?.type === 'course' && (
        <ProductDetailCourse product={product} setProduct={setProduct} open={open} setOpen={setOpen} />
      )}
      {product?.type === 'membership' && (
        <ProductDetailMembership product={product} setProduct={setProduct} open={open} setOpen={setOpen} />
      )}
      {(!product?.type || (product?.type !== 'class' && product?.type !== 'course' && product?.type !== 'membership')) && (
        <ProductDetail product={product} setProduct={setProduct} open={open} setOpen={setOpen} />
      )}

      {/* Group sheet for product groups */}
      <GroupSheet
        open={groupSheetOpen}
        onOpenChange={setGroupSheetOpen}
        group={selectedGroup}
        onAddToCart={addToCart}
        useClass={{ setTimesClass, setTimesCourse }}
        useMembership={{}}
        getProductTotal={getProductTotal}
        migrateScheduleFormat={migrateScheduleFormat}
      />

      <div className="flex space-x-4 h-full">

        {/* Left Panel */}
        <Categories
          handleSetCat={async (c) => {
            if (posInterface) {
              // Find the matching category from POS interface
              const posCategory = posInterface.categories.find(cat => cat._id === c._id);
              if (posCategory) {
                await handleSetCatFromPOS(posCategory);
              }
            } else {
              await handleSetCat(c);
            }
          }}
          selected={category}
          posCategories={posInterface?.categories}
        />

        {/* Right Panel */}

        <div className='flex flex-1 flex-wrap gap-4 text-sm content-start'>
          {items.map((item) => {
            // Render dividers
            if (item.type === 'divider') {
              return (
                <div key={item._id} className='w-full'>
                  <div className='flex items-center gap-4 my-2'>
                    <div className='flex-1 h-px bg-border' />
                    <div className='text-sm font-medium text-muted-foreground uppercase tracking-wide'>
                      {item.name}
                    </div>
                    <div className='flex-1 h-px bg-border' />
                  </div>
                </div>
              );
            }

            // Render folders
            if (item.type === 'folder') {
              // Hide empty folders in retail view
              const itemCount = item.items?.length || ((item.products?.length || 0) + (item.groups?.length || 0));
              if (itemCount === 0) {
                return null;
              }
              const isExpanded = expandedFolders.has(item._id);
              return (
                <React.Fragment key={item._id}>
                  <div className='relative w-24 flex flex-col text-center text-xs'>
                    <div
                      onClick={() => {
                        const newExpanded = new Set(expandedFolders);
                        if (isExpanded) {
                          newExpanded.delete(item._id);
                        } else {
                          newExpanded.add(item._id);
                        }
                        setExpandedFolders(newExpanded);
                      }}
                      className='cursor-pointer size-24 rounded-lg flex items-center justify-center'
                      style={{
                        backgroundColor: colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]
                      }}
                    >
                      {isExpanded ? (
                        <Minus strokeWidth={1} className='size-10 opacity-60' />
                      ) : (
                        <Plus strokeWidth={1} className='size-10 opacity-60' />
                      )}
                    </div>
                    <div className='mt-1'>{item.name}</div>
                    <div className='text-muted-foreground text-xs'>
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                  {/* When expanded, render items in correct order */}
                  {isExpanded && (
                    <>
                      {item.items && item.items.length > 0 ? (
                        // Use unified items array - respects folders.contains[] order
                        item.items.map((folderItem) => (
                          <Product
                            key={`inline-${folderItem._id}`}
                            product={folderItem}
                            borderColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                            tintColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                            onClick={() => {
                              // Handle group click
                              if (folderItem.amount || folderItem.itemType === 'group') {
                                setSelectedGroup(folderItem);
                                setGroupSheetOpen(true);
                                return;
                              }
                              // Handle product click
                              const cartProduct = {
                                ...folderItem,
                                stockQty: folderItem.qty,
                                qty: folderItem.type === 'class' || folderItem.type === 'course' || folderItem.type === 'membership' ? 0 : 1,
                                schedule: folderItem.type === 'course' ? migrateScheduleFormat(folderItem.schedule) : folderItem.schedule
                              };
                              setProduct(cartProduct);
                              if (folderItem.type === 'class') setTimesClass(cartProduct);
                              else if (folderItem.type === 'course') setTimesCourse(cartProduct);
                              setOpen(true);
                            }}
                          />
                        ))
                      ) : (
                        // Fallback: render products then groups
                        <>
                          {item.products && item.products.length > 0 && item.products.map((p) => (
                            <Product
                              key={`inline-${p._id}`}
                              product={p}
                              borderColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                              tintColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                              onClick={() => {
                                const cartProduct = {
                                  ...p,
                                  stockQty: p.qty,
                                  qty: p.type === 'class' || p.type === 'course' || p.type === 'membership' ? 0 : 1,
                                  schedule: p.type === 'course' ? migrateScheduleFormat(p.schedule) : p.schedule
                                }
                                setProduct(cartProduct)
                                if (p.type === 'class') setTimesClass(cartProduct)
                                else if (p.type === 'course') setTimesCourse(cartProduct)
                                setOpen(true)
                              }}
                            />
                          ))}
                          {item.groups && item.groups.length > 0 && item.groups.map((g) => (
                            <Product
                              key={`inline-group-${g._id}`}
                              product={g}
                              borderColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                              tintColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                              onClick={() => {
                                setSelectedGroup(g);
                                setGroupSheetOpen(true);
                              }}
                            />
                          ))}
                        </>
                      )}
                    </>
                  )}
                </React.Fragment>
              );
            }

            // Render products
            return (
              <Product
                key={item._id}
                product={item}
                onClick={() => {
                  const cartProduct = {
                    ...item,
                    stockQty: item.qty,
                    qty: item.type === 'class' || item.type === 'course' || item.type === 'membership' ? 0 : 1,
                    schedule: item.type === 'course' ? migrateScheduleFormat(item.schedule) : item.schedule
                  }
                  setProduct(cartProduct)
                  if (item.type === 'class') setTimesClass(cartProduct)
                  else if (item.type === 'course') setTimesCourse(cartProduct)
                  setOpen(true)
                }}
              />
            );
          })}
        </div>

        {/* cart */}
        <Cart />


      </div>
    </>
  )
}














      // <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      //   <SheetContent>
      //     <SheetHeader>
      //       <SheetTitle>
      //         <div className='flex items-center space-x-1'>
      //           <div>{category?.name}</div> 
      //           <ChevronRight className='size-4'/> 
      //           <div>{product?.name?.length > 20 ? `${product.name.substring(0, 20)}...` : product?.name}</div>
      //           <div className="relative size-6 ml-1">
      //           </div>
      //         </div>
      //       </SheetTitle>
      //       <SheetDescription>
      //         Description goes here
      //       </SheetDescription>
      //     </SheetHeader>

      //     <div className='px-4 gap-4 flex flex-col'>

      //       {product?.variations &&
      //         <div className='flex flex-col gap-2'>
      //           <div className='text-sm'>Variations</div>
      //           {product?.variations?.map((v, vIdx) => {
      //             return (
      //               <div 
      //                 key={vIdx} className='text-sm flex space-x-2 items-center w-full'
      //                 onClick={() => selectVariation({setProduct, vIdx})}
      //               >
      //                 <Checkbox checked={v.selected} />
      //                 <div>{v.name}</div>
      //                 <div className='ml-auto'>${parseFloat(v.amount).toFixed(2)}</div>
      //               </div>
      //             )
      //           })}
      //         </div>
      //       }

      //       <div className='flex flex-col gap-2'>
      //         {/* <div className='text-sm'>Mods</div> */}
      //         {product?.modCats.map((mc, mcIdx) => {
      //           return (
      //             <div 
      //               key={mcIdx} className='text-sm flex space-x-4 items-center w-full'
      //             >
      //               {/* <Checkbox checked={v.selected} /> */}
      //               <div className='flex flex-col gap-2'>
      //                 {mc.mods.some(m => m.enabled) && <div>{mc.name}</div>}
      //                 <div className='flex flex-wrap gap-2'>
      //                   {mc.mods.filter(m => m.enabled).map((m, mIdx) => {
      //                     return (
      //                       <div 
      //                         key={m._id} className='gap-2 flex items-center flex-row'
      //                         onClick={() => selectMod({setProduct, mcIdx, mIdx, mName: m.name})}
      //                       >
      //                         <Checkbox checked={m.selected} />
      //                         <div>{m.name}</div>
      //                         {m.amount > 0 && <div>${parseFloat(m.amount).toFixed(2)}</div>}
      //                       </div>
      //                     )
      //                   })}
      //                 </div>
      //               </div>
      //             </div>
      //           )
      //         })}
      //       </div>

      //       <div className='flex flex-col gap-2'>
      //         <div className='text-sm'>Qty</div>
      //         <div className='flex gap-2'>
      //           <Button variant="" size="sm" onClick={() => setQty({ setProduct, type: 'decrement' })}><Minus /></Button>
      //           <Button variant="" size="sm" onClick={() => setQty({ setProduct, type: 'increment' })}><Plus /></Button>
      //           <div className='ml-auto'>{product?.qty || 0}</div>
      //         </div>
      //       </div>

      //     </div>

      //     <SheetFooter>
      //       <div className='flex'>
      //         <div className='uppercase font-semibold'>total</div>
      //         <div className='ml-auto'>
      //           ${total.toFixed(2)}
      //         </div>
      //       </div>

      //       <SheetClose asChild>
      //         <Button 
      //           type="submit" 
      //           // disabled={product?.qty === 0}
      //           disabled={!product?.variations?.some(v => v.selected) || product?.qty === 0}
      //           onClick={async () => {
      //             const _product = await calcCartValueShop({product})
      //             addToCart({..._product, type: "shop"})
      //           }}
      //         >
      //           Add
      //         </Button>
      //       </SheetClose>
      //     </SheetFooter>
      //   </SheetContent>
      // </Sheet>
