'use client'

import React from 'react'
import Image from 'next/image'

export default function ProductCard({ product, onClick }) {
  const isIcon = !product?.thumbnail || product?.thumbnail?.includes("thenounproject.com");

  return (
    <div
      key={product._id}
      className='w-24 flex flex-col items-center text-center'
    >
      <div 
        className="cursor-pointer border border-accent-foreground/50 relative size-24 rounded-lg"
        onClick={onClick}
      >
        <Image
          src={product?.thumbnail || "https://static.thenounproject.com/png/2206029-200.png"}
          alt="Product Icon"
          fill
          style={{ objectFit: 'contain' }}
          className={`rounded-lg ${isIcon ? 'invert' : ''}`}
        />
      </div>
      <div className="text-xs w-24">{product.name}</div>
    </div>
  );
}