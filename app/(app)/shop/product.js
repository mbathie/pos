'use client'

import React from 'react'
import { ProductIcon } from '@/components/product-icon'

export default function ProductCard({ product, onClick }) {
  return (
    <div
      key={product._id}
      className='w-24 flex flex-col items-center text-center'
    >
      <div 
        className="cursor-pointer"
        onClick={onClick}
      >
        <ProductIcon
          src={product.thumbnail}
          alt={product.name}
          size="lg"
        />
      </div>
      <div className="text-xs w-24 mt-1">{product.name}</div>
    </div>
  );
}