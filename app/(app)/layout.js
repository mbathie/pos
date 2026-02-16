'use client'
import Cookies from 'js-cookie'
import { useEffect, useState } from 'react'
import { MapPin, CreditCard, Monitor } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useGlobals } from '@/lib/globals'
import { hasPermission, requiresAuth, getDefaultPath } from '@/lib/permissions'

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import { CartSheet } from '@/components/cart-sheet'

export default function Page({children}) {
  const { location, device, terminalConnection, employee, resetCart, setLowStockData, clearLowStockData } = useGlobals()
  const [ open, setOpen ] = useState(false)
  const [ isRedirecting, setIsRedirecting ] = useState(false)
  const [ isInitializing, setIsInitializing ] = useState(true)

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const d = Cookies.get("sidebar_state")
    const isOpen = d === "true"
    setOpen(isOpen)
    
    // Give Zustand time to hydrate the persisted state
    const timer = setTimeout(() => {
      setIsInitializing(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Permission and lock checking effect
  useEffect(() => {
    // Don't check permissions until initialization is complete
    if (isInitializing) {
      console.log('[Layout] Still initializing, skipping permission check');
      return;
    }
    
    console.log('[Layout] Permission check starting for path:', pathname);
    console.log('[Layout] Employee:', employee);
    console.log('[Layout] Employee role:', employee?.role);

    if (!employee?._id) {
      console.log('[Layout] No employee ID found, redirecting to login');
      router.replace("/login")
      return
    }

    // Check if account is locked
    const checkAccountLock = async () => {
      try {
        const response = await fetch(`/api/unauth/employees/${employee._id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.locked) {
            // Account is locked, use same logout flow as nav-user
            // console.log('Account locked detected, starting logout process...');
            setIsRedirecting(true);
            
            // Use the same logout pattern as nav-user component
            resetCart();
            
            // Call logout API and redirect
            fetch("/api/auth/logout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            }).then(() => {
              console.log('Logout API called, redirecting...');
              window.location.href = "/login?message=Account has been locked";
            }).catch(() => {
              // Even if logout API fails, still redirect
              console.log('Logout API failed, but still redirecting...');
              window.location.href = "/login?message=Account has been locked";
            });
            
            return true; // Account is locked
          }
        }
      } catch (error) {
        console.error('Error checking account lock status:', error);
      }
      return false; // Account is not locked or check failed
    };

    // Check for locked account first
    checkAccountLock().then(isLocked => {
      console.log('[Layout] Account lock check completed, isLocked:', isLocked);
      if (isLocked) return; // Don't proceed with permission checks if locked
      
      const userRole = employee?.role || 'STAFF';
      console.log('[Layout] User role determined:', userRole);
      console.log('[Layout] Checking if path requires auth:', pathname, requiresAuth(pathname));
      
      // Check if current path requires auth and if user has permission
      if (requiresAuth(pathname)) {
        const hasAccess = hasPermission(userRole, pathname);
        console.log('[Layout] Permission check for', pathname, 'with role', userRole, ':', hasAccess);
        
        if (!hasAccess) {
          console.log(`[Layout] Access denied to ${pathname} for role ${userRole}`);
          const defaultPath = getDefaultPath(userRole);
          console.log('[Layout] Redirecting to default path:', defaultPath);
          router.replace(defaultPath);
          return;
        } else {
          console.log('[Layout] Access granted for', pathname);
        }
      } else {
        console.log('[Layout] Path does not require auth:', pathname);
      }
    });
  }, [pathname, employee, router, isInitializing]);



  // Low stock checking effect
  useEffect(() => {
    const checkLowStock = async () => {
      // Only check low stock if user has permission
      if (!employee?.role || !hasPermission(employee.role, 'lowstock:check')) {
        clearLowStockData()
        return
      }

      try {
        const res = await fetch('/api/products/lowstock')
        if (res.ok) {
          const data = await res.json()
          const count = data.count || 0
          
          setLowStockData({
            hasLowStock: count > 0,
            lowStockCount: count,
            lowStockProducts: [] // Not fetching individual products for efficiency
          })
        }
      } catch (error) {
        console.error('Error checking low stock:', error)
        clearLowStockData()
      }
    }

    // Check on mount and when employee role changes
    if (employee?._id) {
      checkLowStock()
      
      // Only set up interval if user has permission
      if (employee?.role && hasPermission(employee.role, 'lowstock:check')) {
        // Check every 10 minutes
        const interval = setInterval(checkLowStock, 10 * 60 * 1000)
        
        return () => clearInterval(interval)
      }
    }
  }, [employee?._id, employee?.role, setLowStockData, clearLowStockData])



  const handleChange = (state) => {
    Cookies.set('sidebar_state', String(state))
    setOpen(state)
  }


  return (
    <TooltipProvider>
      <SidebarProvider open={open} onOpenChange={(state) => handleChange(state)} >
      <AppSidebar />
      <SidebarInset>
        <header
          className="sticky top-0 z-50 bg-background pr-4 flex h-10 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2 text-sidebar-primary text-sm">
              <MapPin className="w-4 h-4" />
              <span>{location?.name}</span>
              {device?.name && (
                <>
                  <Monitor className="w-4 h-4 ml-2" />
                  <span>{device.name}</span>
                </>
              )}
              {(device?.terminal?.label || terminalConnection?.readerLabel) && (
                <>
                  <CreditCard className="w-4 h-4 ml-2" />
                  <span>{device?.terminal?.label || terminalConnection?.readerLabel}</span>
                </>
              )}
            </div>
          </div>

          <div className='flex-1'/>

          <CartSheet />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4- pt-0 min-h-0 overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  );
}
