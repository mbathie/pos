'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useGlobals } from '@/lib/globals'
import { useHandler } from '../useHandler'
import { useMembership } from './useMembership'
import Products from '../../products'
import ProductDetailMembership from './productDetailMembership';
import { useImmer } from 'use-immer'
import Cart from '@/components/cart'

export default function Page() {
  // const { pushBreadcrumb } = useGlobals()
  const [ product, setProduct ] = useImmer(null)
  const [ products, setProducts ] = useImmer(null)
  const [ category, setCategory ] = useState({});
  const [ sheetOpen, setSheetOpen ] = useState(false);

  const { getCategory, getProducts} = useHandler({})
  const { } = useMembership({product, setProduct})

  useEffect(() => {
    async function fetch() {
      const cat = await getCategory({name: 'memberships'})
      if (!cat?.category)
        return
      const _products = await getProducts({category: cat.category})
      setProducts(_products.products)
      setCategory(cat.category)

      // pushBreadcrumb({ name: "Memberships", href: "/shop/memberships", url: '/' });
      
    }

    fetch();
  }, []);

  return (
    <div className='flex h-full'>
      <div className='flex-1 p-4'>
        <Products
          products={products}
          category={category}
          onClick={(p) => {
            console.log(p.type)
            // Initialize product for cart with proper separation of stock vs cart quantities
            const cartProduct = {
              ...p,
              stockQty: p.qty, // Preserve original stock quantity
              qty: 0 // Initialize cart quantity to 0
            }
            setProduct(cartProduct)

            setSheetOpen(true);
          }}
        />
      </div>

      <Cart />
      
      <ProductDetailMembership
        open={sheetOpen}
        setOpen={setSheetOpen}
        product={product}
        setProduct={setProduct}
      />
    </div>
  )
}