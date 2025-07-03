'use client'
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Products from '../../../products'
import { useImmer } from 'use-immer'
import ProductDetail from '../../productDetail'
import Categories from '../../cats'

export default function Page() {
  // const { pushBreadcrumb } = useGlobals()
  const [ product, setProduct ] = useImmer(null)
  const [ products, setProducts ] = useImmer(null)
  // const [ category, setCategory ] = useState({});
  const [ open, setOpen ] = useState(false);

  const { id } = useParams();

  useEffect(() => {
    async function fetchProducts() {
      const res = await fetch(`/api/folders/${id}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      }
    }

    if (id) fetchProducts();
  }, [id]);

  return (
    <div className='flex space-x-4 h-full'>

      <Categories 
        // handleSetCat={async (c) =>  handleSetCat(c) } 
        // selected={category} 
      />

      <Products
        products={products}
        onClick={(p) => {
          console.log(p.type)
          setProduct(p)

          setSheetOpen(true);
        }}
      />
      <ProductDetail product={product} setProduct={setProduct} open={open} setOpen={setOpen} />

    </div>
  )
}