'use client'

import Products from '../Products'
import { useEffect } from 'react';
import { useImmer } from 'use-immer';

export default function Page() {
  const [products, setProducts] = useImmer([]);
  const categoryName = "memberships";

  const getProducts = async () => {
    const res = await fetch(`/api/categories/${categoryName}/products`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
    }
  };

  useEffect(() => {
    getProducts();
  }, [])

  const units = ['fortnight', 'month', 'year']

  return (
    <div className='px-4'>
      <Products
        products={products}
        setProducts={setProducts}
        units={units}
        title="Membership subscription products"
        categoryName={categoryName}
      />
    </div>
  );
}