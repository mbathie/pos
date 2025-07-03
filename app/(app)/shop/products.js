'use client'

import React from 'react'
import Product from './product'

export default function Products({ products, onClick }) {
  return (
    <div className='flex flex-wrap gap-4 text-sm content-start'>
      {products?.map((p) => (
        <Product
          key={p._id}
          product={p}
          onClick={() => onClick(p)}
        />
      ))}
    </div>
  );
}