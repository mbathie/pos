import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function CustomerAvatar({ 
  customer, 
  size = 'sm',
  shape = 'circle', // 'circle' or 'square'
  className = '' 
}) {
  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return 'UN';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  // Size classes
  const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.sm;
  const shapeClass = shape === 'square' ? 'rounded-lg' : 'rounded-full';

  if (!customer) {
    return (
      <div className={cn(
        sizeClass,
        shapeClass,
        "bg-muted flex items-center justify-center font-medium flex-shrink-0",
        className
      )}>
        UN
      </div>
    );
  }

  if (customer.photo) {
    return (
      <div className={cn(sizeClass, shapeClass, "relative overflow-hidden flex-shrink-0", className)}>
        <Image
          src={customer.photo}
          alt={customer.name || 'Customer'}
          fill
          sizes="(max-width: 768px) 32px, 48px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn(
      sizeClass,
      shapeClass,
      "bg-primary/10 text-primary flex items-center justify-center font-medium flex-shrink-0",
      className
    )}>
      {getInitials(customer.name)}
    </div>
  );
}