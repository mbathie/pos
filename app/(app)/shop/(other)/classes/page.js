'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
// import { useGlobals } from '@/lib/globals'
import { useHandler } from '../useHandler'
import { useClass } from './useClass'
import Products from '../products'
import ProductDetailClass from './productDetailClass';
import ProductDetailCourse from './ProductDetailCourse';
import { useImmer } from 'use-immer'

export default function Page() {
  const [ product, setProduct ] = useImmer(null)
  const [ products, setProducts ] = useImmer(null)
  const [ category, setCategory ] = useState({});
  const [ sheetOpen, setSheetOpen ] = useState(false);

  const { getCategory, getProducts} = useHandler({})
  const { setTimes } = useClass({setProduct})

  useEffect(() => {
    async function fetch() {
      const cat = await getCategory({name: 'class'})
      if (!cat?.category)
        return
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
          setProduct(p)
          setTimes()
          setSheetOpen(true);
        }}
      />
      {product?.type == 'class' &&
        <ProductDetailClass
          open={sheetOpen}
          setOpen={setSheetOpen}
          product={product}
          setProduct={setProduct}
        />
      }
      {product?.type == 'course' &&
        <ProductDetailCourse
          open={sheetOpen}
          setOpen={setSheetOpen}
          product={product}
          setProduct={setProduct}
        />
      }
    </div>
  )
}