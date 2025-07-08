'use client'

import Image from 'next/image'

export default function ProductIcon({ product, size }) {
  const isIcon = !product?.thumbnail || product.thumbnail.includes("thenounproject.com");

  return (
    <Image
      src={product?.thumbnail || "https://static.thenounproject.com/png/2206029-200.png"}
      alt="Product Icon"
      fill
      style={{ objectFit: 'contain' }}
      className={`${
        size === 'lg' ? 'rounded-lg' : size === 'md' ? 'rounded-md' : 'rounded-sm'
      } ${isIcon ? 'invert' : ''}`}
    />
  );
}
