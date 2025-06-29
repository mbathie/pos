'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useGlobals } from '@/lib/globals'
import { useHandler } from './useHandler'
import Products from '../products'
import ProductDetail from './productDetail';
import { useImmer } from 'use-immer'

export default function Page() {
  const [ products, setProducts ] = useState([]);
  const [ product, setProduct ] = useImmer(null)
  const [ category, setCategory ] = useState({});
  const [ sheetOpen, setSheetOpen ] = useState(false);

  const { getCategory, getProducts, selectPrice, setQty } = useHandler({product, setProduct})

  useEffect(() => {
    async function fetch() {
      const cat = await getCategory({name: 'casual'})
      const _products = await getProducts({category: cat.category})
      setProducts(_products.products)
      setCategory(cat.category)
    }

    fetch();
  }, []);

  return (
    <div className='px-4'>
      <Products
        products={products}
        category={category}
        onClick={(p) => {
          setProduct(p);
          setSheetOpen(true);
        }}
      />
      {product &&
      <ProductDetail
        open={sheetOpen}
        setOpen={setSheetOpen}
        product={product}
        setProduct={setProduct}
        onAddToCart={() => {}}
        onSelectPrice={selectPrice}
        setQty={setQty}
      />
      }
    </div>
  )
}