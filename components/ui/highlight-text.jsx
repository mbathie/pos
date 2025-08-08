'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function HighlightText({ 
  children, 
  className = '', 
  as: Component = 'span',
  delay = 100,
  duration = 1000,
  color = 'emerald'
}) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [delay])
  
  const colorVariants = {
    emerald: 'from-emerald-400/30 via-emerald-500/40 to-emerald-400/30',
    blue: 'from-blue-400/30 via-blue-500/40 to-blue-400/30',
    purple: 'from-purple-400/30 via-purple-500/40 to-purple-400/30',
    pink: 'from-pink-400/30 via-pink-500/40 to-pink-400/30',
    yellow: 'from-yellow-400/30 via-yellow-500/40 to-yellow-400/30',
  }
  
  return (
    <Component className={cn('relative inline-block', className)}>
      {children}
      <span
        className={cn(
          'absolute inset-x-0 bottom-0 h-full -z-10',
          'bg-gradient-to-r',
          colorVariants[color] || colorVariants.emerald,
          'transform origin-left transition-all ease-out',
          isVisible ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
        )}
        style={{
          transitionDuration: `${duration}ms`,
          transform: isVisible ? 'scaleX(1) skewX(-12deg)' : 'scaleX(0) skewX(-12deg)',
          borderRadius: '0.25rem',
          filter: 'blur(2px)',
        }}
      />
    </Component>
  )
}