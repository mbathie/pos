'use client'

import Products from '../Products'
import { useEffect } from 'react';
import { useImmer } from 'use-immer';

export default function Page() {
  const [products, setProducts] = useImmer([]);
  const categoryName = "general";

  const getProducts = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${categoryName}/products`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
    }
  };

  useEffect(() => {
    getProducts();
  }, [])

  const units = ['hour', 'day']

  // if (!products?.length) return (<></>)

  return (
    <div className='px-4'>
      <Products
        products={products}
        setProducts={setProducts}
        units={units}
        type="general"
        title="General Entry Products"
        categoryName={categoryName}
      />
    </div>
  );
}