'use client'

import React from 'react'
import { ProductThumbnail } from '@/components/product-thumbnail'

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
        <ProductThumbnail
          src={product.thumbnail}
          alt={product.name}
          size="2xl"
        />
      </div>
      <div className="text-xs w-24 mt-1">{product.name}</div>
    </div>
  );
}