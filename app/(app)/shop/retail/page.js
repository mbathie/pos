'use client'
import React, { useEffect, useState } from 'react'
import { useHandler } from './useHandler'
import { useImmer } from 'use-immer'
import ProductDetail from './productDetail'
import Categories from './cats'
import Product from '../product'
import { useRouter } from 'next/navigation';
import colors from '@/lib/tailwind-colors';
import { Plus, Minus } from 'lucide-react'
import Cart from '@/components/cart'

export default function Page() {
    
  const { 
    getProducts, selectVariation, 
    selectMod, getProductTotal, setQty } = useHandler()

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
  const router = useRouter();

  useEffect(() => {
    if (product) {
      const t = getProductTotal({ product });
      setTotal(t);
    }
  }, [product])

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
      <ProductDetail product={product} setProduct={setProduct} open={open} setOpen={setOpen} />

      <div className="flex space-x-4 h-full">

        {/* Left Panel */}
        <Categories 
          handleSetCat={async (c) =>  handleSetCat(c) } 
          selected={category} 
        />

        {/* Right Panel */}

        <div className='flex flex-1 flex-wrap gap-4 text-sm content-start'>
          {items.map((item) => {
            // Render dividers
            if (item.type === 'divider') {
              return (
                <div key={item._id} className='w-full'>
                  <div className='flex items-center gap-4 my-4'>
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
              if (!item.products || item.products.length === 0) {
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
                      {item.products?.length || 0} {item.products?.length === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                  {/* When expanded, emit products inline so spacing is consistent */}
                  {isExpanded && item.products && item.products.length > 0 && (
                    item.products.map((p) => (
                      <Product
                        key={`inline-${p._id}`}
                        product={p}
                        borderColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                        tintColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                        onClick={() => {
                          const cartProduct = {
                            ...p,
                            stockQty: p.qty,
                            qty: 1
                          }
                          setProduct(cartProduct)
                          setOpen(true)
                        }}
                      />
                    ))
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
                  console.log(item)
                  const cartProduct = {
                    ...item,
                    stockQty: item.qty,
                    qty: 1
                  }
                  setProduct(cartProduct)
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
