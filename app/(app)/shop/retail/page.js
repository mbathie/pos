'use client'
import React, { useEffect, useState } from 'react'
import { useHandler } from './useHandler'
import { useImmer } from 'use-immer'
import ProductDetail from './productDetail'
import Categories from './cats'
import Product from '../product'
import { useRouter } from 'next/navigation';
import colors from 'tailwindcss/colors';
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
  const [product, setProduct] = useImmer(null)
  const [open , setOpen] = useState(false)

  const [folder, setFolder] = useState(null)

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
    setFolder(null); // Reset the selected folder when changing categories
    const p = await getProducts({ category: c });

    const foldersMap = {};
    const folderArray = [];
    const productArray = [];

    for (const product of p.products) {
      if (product.folder && product.folder._id) {
        if (!foldersMap[product.folder._id]) {
          foldersMap[product.folder._id] = {
            name: product.folder.name,
            _id: product.folder._id,
            color: product.folder.color,
            products: []
          };
          folderArray.push(foldersMap[product.folder._id]);
        }
        foldersMap[product.folder._id].products.push(product);
      } else {
        productArray.push(product);
      }
    }

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

          <div className='flex flex-wrap gap-4 text-sm content-start'>

            {folders?.map((f) => {
              const isOpen = folder?._id === f._id;
              if (!folder || isOpen) {
                return (
                  <div key={f._id} className='relative w-24 flex flex-col text-center text-xs'>
                    <div
                      onClick={() => {
                        setFolder(isOpen ? null : f);
                        setProducts(isOpen ? productsInit : f.products);
                      }}
                      className='cursor-pointer size-24 rounded-lg flex items-center justify-center'
                      style={{
                        backgroundColor: colors?.[f.color?.split('-')[0]]?.[f.color?.split('-')[1]]
                      }}
                    >
                      {isOpen ? (
                        <Minus strokeWidth={1} className='size-10 opacity-60' />
                      ) : (
                        <Plus strokeWidth={1} className='size-10 opacity-60' />
                      )}
                    </div>
                    <div>{f.name}</div>
                  </div>
                );
              }
              return null;
            })}

            {products?.map((p) => (
              <Product
                key={p._id}
                product={p}
                onClick={() => {
                  console.log(p)
                  // Initialize product for cart with separate cart quantity
                  const cartProduct = {
                    ...p,
                    stockQty: p.qty, // Preserve original stock quantity
                    qty: 1 // Initialize cart quantity to 1
                  }
                  setProduct(cartProduct)
                  setOpen(true)
                }}
              />
            ))}
          </div>



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