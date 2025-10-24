'use client'

import React from 'react'
import { ProductThumbnail } from '@/components/product-thumbnail'

export default function ProductCard({ product, onClick, borderColor, tintColor }) {
  return (
    <div
      key={product._id}
      className='w-24 flex flex-col items-center text-center'
    >
      <div
        className="cursor-pointer relative rounded-lg overflow-hidden"
        onClick={onClick}
        style={borderColor ? { border: `2px solid ${borderColor}` } : undefined}
      >
        <ProductThumbnail
          src={product.thumbnail}
          alt={product.name}
          size="2xl"
        />
        {tintColor && (
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: tintColor, opacity: 0.15 }} />
        )}
      </div>
      <div className="text-xs w-24 mt-1">{product.name}</div>
    </div>
  );
}
