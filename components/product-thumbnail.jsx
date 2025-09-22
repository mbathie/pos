import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Tag } from 'lucide-react';

/**
 * ProductThumbnail component for displaying product thumbnails
 * Handles both DigitalOcean Spaces URLs and legacy base64/SVG data
 */
export function ProductThumbnail({
  src,
  alt = 'Product',
  size = 'md',
  className = '',
  fallbackIcon = Tag
}) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const iconSize = iconSizes[size] || iconSizes.md;
  const FallbackIcon = fallbackIcon;

  // No image - show fallback
  if (!src) {
    return (
      <div className={cn('bg-muted rounded-lg flex items-center justify-center', sizeClass, className)}>
        <FallbackIcon className={iconSize} />
      </div>
    );
  }

  const pixelSize = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64
  }[size] || 40;

  return (
    <div className={cn('relative rounded-lg overflow-hidden', sizeClass, className)}>
      <Image
        src={src}
        alt={alt}
        width={pixelSize}
        height={pixelSize}
        className="object-cover"
      />
    </div>
  );
}