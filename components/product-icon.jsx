import * as React from "react"
import Image from 'next/image'
import { cn } from "@/lib/utils"
import { Package } from 'lucide-react'

// Color configuration - change these to update the component's appearance
const COLORS = {
  background: "bg-background",           // Container background
  border: "border-primary/50",          // Container border  
  svgColor: "text-primary",              // SVG icon color
  fallbackColor: "text-primary",        // Default icon color
}

/**
 * ProductIcon component that handles both SVG data URIs and regular images
 * with consistent styling and appearance
 */
export function ProductIcon({ 
  src, 
  alt = "Product", 
  size = "md",
  className,
  containerClassName
}) {
  // Size presets
  const sizeClasses = {
    xs: "w-8 h-8",
    sm: "w-12 h-12", 
    md: "w-16 h-16",
    lg: "w-20 h-20",
    xl: "w-24 h-24",
  }

  const containerSizeClasses = {
    xs: "size-10",
    sm: "size-14",
    md: "size-20",
    lg: "size-24",
    xl: "size-28",
  }

  const fallbackIconSizes = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-14 h-14",
  }

  const sizeClass = sizeClasses[size] || sizeClasses.md
  const containerSizeClass = containerSizeClasses[size] || containerSizeClasses.md
  const fallbackIconSize = fallbackIconSizes[size] || fallbackIconSizes.md

  // Check if src is an SVG data URI
  const isSvgDataUri = src?.startsWith('data:image/svg+xml')
  
  // Check if it's a regular image URL
  const isImageUrl = src && !isSvgDataUri && (
    src.startsWith('http') || 
    src.startsWith('/') || 
    src.startsWith('data:image/')
  )

  // Render SVG data URI with color override
  const renderSvgDataUri = () => {
    // Use mask technique to apply color to SVG data URIs
    return (
      <div 
        className={cn(sizeClass, COLORS.svgColor, className)}
        style={{
          WebkitMask: `url("${src}") no-repeat center / contain`,
          mask: `url("${src}") no-repeat center / contain`,
          backgroundColor: 'currentColor'
        }}
      />
    )
  }

  // For SVG data URIs and fallback icons, show with border and background
  if (isSvgDataUri || !src) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-lg",
        COLORS.background,
        `border ${COLORS.border}`,
        containerSizeClass,
        containerClassName
      )}>
        {isSvgDataUri ? (
          renderSvgDataUri()
        ) : (
          <Package className={cn(fallbackIconSize, COLORS.fallbackColor, className)} />
        )}
      </div>
    )
  }

  // For regular images, show without border or padding
  if (isImageUrl) {
    return (
      <div className={cn("relative", containerSizeClass, containerClassName)}>
        <Image
          src={src}
          alt={alt}
          fill
          style={{ objectFit: 'cover' }}
          className="rounded-lg"
        />
      </div>
    )
  }

  // Fallback - shouldn't reach here
  return (
    <div className={cn(
      "flex items-center justify-center rounded-lg",
      COLORS.background,
      `border ${COLORS.border}`,
      containerSizeClass,
      containerClassName
    )}>
      <Package className={cn(fallbackIconSize, COLORS.fallbackColor, className)} />
    </div>
  )
}

// Export size options for TypeScript/documentation
export const ProductIconSizes = {
  xs: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
}