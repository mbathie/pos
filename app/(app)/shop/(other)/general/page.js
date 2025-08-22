'use client'
import React, { useEffect, useState } from 'react'
// import Link from 'next/link'
// import { useGlobals } from '@/lib/globals'
import { useHandler } from './useHandler'
import Products from '../../products'
import ProductDetail from './productDetail';
import { useImmer } from 'use-immer'
import Cart from '@/components/cart'

export default function Page() {
  const [ products, setProducts ] = useState([]);
  const [ product, setProduct ] = useImmer(null)
  const [ category, setCategory ] = useState({});
  const [ sheetOpen, setSheetOpen ] = useState(false);

  const { getCategory, getProducts, setQty } = useHandler({product, setProduct})

  useEffect(() => {
    async function fetch() {
      const cat = await getCategory({name: 'general'})
      const _products = await getProducts({category: cat.category})
      setProducts(_products.products)
      setCategory(cat.category)
    }

    fetch();
  }, []);

  return (
    <div className='px-4- flex h-full'>
      <div className='flex-1 p-4'>
        <Products
          products={products}
          category={category}
          onClick={(p) => {
            console.log(p)
            // Initialize product for cart with prices structure for general products
            const cartProduct = {
              ...p,
              stockQty: p.qty, // Preserve original stock quantity
              qty: 0, // Initialize cart quantity to 0
              // Ensure prices have qty property initialized
              prices: p.prices?.map(price => ({
                ...price,
                qty: price.qty || 0
              })) || []
            }
            setProduct(cartProduct);
            setSheetOpen(true);
          }}
        />
      </div>
      
      <Cart />

      {product &&
        <ProductDetail
          open={sheetOpen}
          setOpen={setSheetOpen}
          product={product}
          setProduct={setProduct}
          onAddToCart={() => {}}
          setQty={setQty}
        />
      }
    </div>
  )
}