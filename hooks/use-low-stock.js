import { useState, useEffect } from 'react'
import { useGlobals } from '@/lib/globals'
import { hasPermission } from '@/lib/permissions'

export function useLowStock() {
  const [hasLowStock, setHasLowStock] = useState(false)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [lowStockProducts, setLowStockProducts] = useState([])
  const { employee } = useGlobals()

  useEffect(() => {
    const checkLowStock = async () => {
      // Only check low stock if user has permission
      if (!employee?.role || !hasPermission(employee.role, 'lowstock:check')) {
        setHasLowStock(false)
        setLowStockCount(0)
        setLowStockProducts([])
        return
      }

      try {
        const res = await fetch('/api/products/lowstock')
        if (res.ok) {
          const data = await res.json()
          const count = data.count || 0
          
          setHasLowStock(count > 0)
          setLowStockCount(count)
          // Note: We no longer fetch individual products for efficiency
          // If you need the product list, use the full /api/products endpoint
          setLowStockProducts([])
        }
      } catch (error) {
        console.error('Error checking low stock:', error)
        setHasLowStock(false)
        setLowStockCount(0)
        setLowStockProducts([])
      }
    }

    // Check on mount and when employee role changes
    checkLowStock()
    
    // Only set up interval if user has permission
    if (employee?.role && hasPermission(employee.role, 'lowstock:check')) {
      // Check every 5 minutes
      const interval = setInterval(checkLowStock, 2 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [employee?.role])

  return {
    hasLowStock,
    lowStockCount,
    lowStockProducts,
  }
} 