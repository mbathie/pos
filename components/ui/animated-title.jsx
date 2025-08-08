'use client'

import { useEffect, useState } from 'react'

export function AnimatedTitle({ 
  children, 
  className = '', 
  highlightClassName = '',
  repeatDelay = 3000, // Time between animations in ms
  animationDuration = 1000 // Duration of the animation in ms
}) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    // Initial animation
    const initialTimer = setTimeout(() => {
      setIsVisible(true)
    }, 100)
    
    // Set up repeating animation
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setIsVisible(true)
      }, 100)
    }, repeatDelay + animationDuration)
    
    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [repeatDelay, animationDuration])
  
  return (
    <h1 className={`relative ${className}`}>
      <span className="relative z-10">{children}</span>
      <span
        className={`absolute inset-0 -z-10 ${highlightClassName || 'bg-gradient-to-r from-emerald-400/30 via-emerald-400/50 to-emerald-400/30'} 
          transform origin-left transition-all ease-out
          ${isVisible ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}
          blur-sm`}
        style={{
          transitionDuration: `${animationDuration}ms`,
          transform: isVisible ? 'scaleX(1) skewX(-12deg)' : 'scaleX(0) skewX(-12deg)',
          borderRadius: '0.25rem',
        }}
      />
      <span
        className={`absolute inset-0 -z-20 ${highlightClassName || 'bg-gradient-to-r from-emerald-400/20 via-emerald-400/30 to-emerald-400/20'} 
          transform origin-left transition-all ease-out
          ${isVisible ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`}
        style={{
          transitionDuration: `${animationDuration * 0.7}ms`,
          transitionDelay: '200ms',
          transform: isVisible ? 'scaleX(1.1) skewX(-8deg) translateY(2px)' : 'scaleX(0) skewX(-8deg) translateY(2px)',
          filter: 'blur(8px)',
          borderRadius: '0.5rem',
        }}
      />
    </h1>
  )
}