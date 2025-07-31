'use client'
import Cookies from 'js-cookie'
import { useEffect, useState } from 'react'
import { MapPin, Wifi, WifiOff } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useGlobals } from '@/lib/globals'
import { hasPermission, requiresAuth, getDefaultPath } from '@/lib/permissions'

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import BreadcrumbMenu from '@/components/breadcrumb-menu'
// import Cart from './shop/cart'

export default function Page({children}) {
  const { location, employee, setEmployee, resetBreadcrumb, resetCart, setLowStockData, clearLowStockData } = useGlobals()
  const [ open, setOpen ] = useState(false)
  const [ isRedirecting, setIsRedirecting ] = useState(false)
  const [ terminals, setTerminals ] = useState([])
  const [ browserId, setBrowserId ] = useState(null)
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const d = Cookies.get("sidebar_state")
    const isOpen = d === "true"
    setOpen(isOpen)
  }, [])

  // Permission and lock checking effect
  useEffect(() => {
    // console.log(employee)
    if (!employee?._id || isRedirecting) return; // Wait for employee to load or skip if redirecting
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
            resetBreadcrumb();
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
      if (isLocked) return; // Don't proceed with permission checks if locked
      
      const userRole = employee?.role || 'STAFF';
      
      // Check if current path requires auth and if user has permission
      if (requiresAuth(pathname)) {
        if (!hasPermission(userRole, pathname)) {
          console.log(`Access denied to ${pathname} for role ${userRole}`);
          const defaultPath = getDefaultPath(userRole);
          router.replace(defaultPath);
          return;
        }
      }
    });
  }, [pathname, employee, router]);

  // Fetch terminals and set browser ID for wifi status
  useEffect(() => {
    // Generate or get browser ID from localStorage
    let browserIdFromStorage = localStorage.getItem('browserId')
    if (!browserIdFromStorage) {
      browserIdFromStorage = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('browserId', browserIdFromStorage)
      console.log('🆔 [NAV WiFi Debug] Generated new browser ID:', browserIdFromStorage)
    } else {
      console.log('🆔 [NAV WiFi Debug] Using existing browser ID:', browserIdFromStorage)
    }
    setBrowserId(browserIdFromStorage)

    // Fetch terminals if employee is available
    const fetchTerminals = async () => {
      if (!employee?.org) {
        console.log('🏢 [NAV WiFi Debug] No employee org available, skipping terminal fetch')
        return
      }

      console.log('📡 [NAV WiFi Debug] Fetching terminals for org:', employee.org._id)

      try {
        const response = await fetch('/api/terminals')
        if (response.ok) {
          const terminalsData = await response.json()
          console.log('📱 [NAV WiFi Debug] Fetched terminals:', {
            count: terminalsData.length,
            terminals: terminalsData.map(t => ({
              id: t._id,
              label: t.label,
              locationId: t.location._id,
              locationName: t.location.name,
              browser: t.browser,
              status: t.status,
              lastSync: t.lastSync
            }))
          })
          setTerminals(terminalsData)
        } else {
          console.error('❌ [NAV WiFi Debug] Failed to fetch terminals, response not ok:', response.status)
        }
      } catch (error) {
        console.error('❌ [NAV WiFi Debug] Failed to fetch terminals:', error)
      }
    }

    if (employee?.org?._id) {
      fetchTerminals()
    }
  }, [employee])

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
        // Check every 2 minutes
        const interval = setInterval(checkLowStock, 2 * 60 * 1000)
        
        return () => clearInterval(interval)
      }
    }
  }, [employee?._id, employee?.role, setLowStockData, clearLowStockData])

  // Check if this browser is linked to an online terminal at current location
  const isLinkedToOnlineTerminal = () => {
    console.log('🔍 [NAV WiFi Debug] Checking terminal connection status:', {
      locationId: location?._id,
      locationName: location?.name,
      browserId,
      terminalsCount: terminals.length,
      terminals: terminals.map(t => ({
        id: t._id,
        label: t.label,
        locationId: t.location._id,
        browser: t.browser,
        status: t.status,
        matchesLocation: t.location._id === location?._id,
        matchesBrowser: t.browser === browserId,
        isOnline: t.status === 'online'
      }))
    })

    if (!location?._id) {
      console.log('❌ [NAV WiFi Debug] No location ID available')
      return false
    }
    
    if (!browserId) {
      console.log('❌ [NAV WiFi Debug] No browser ID available')
      return false
    }
    
    if (!terminals.length) {
      console.log('❌ [NAV WiFi Debug] No terminals available')
      return false
    }
    
    const matchingTerminal = terminals.find(terminal => 
      terminal.location._id === location._id && 
      terminal.browser === browserId && 
      terminal.status === 'online'
    )
    
    if (matchingTerminal) {
      console.log('✅ [NAV WiFi Debug] Found matching online terminal:', {
        id: matchingTerminal._id,
        label: matchingTerminal.label,
        status: matchingTerminal.status
      })
    } else {
      console.log('❌ [NAV WiFi Debug] No matching online terminal found')
      
      // Check for terminals at this location
      const locationTerminals = terminals.filter(t => t.location._id === location._id)
      console.log('📍 [NAV WiFi Debug] Terminals at this location:', locationTerminals.map(t => ({
        id: t._id,
        label: t.label,
        browser: t.browser,
        status: t.status,
        matchesBrowser: t.browser === browserId
      })))
      
      // Check for terminals linked to this browser
      const browserTerminals = terminals.filter(t => t.browser === browserId)
      console.log('🌐 [NAV WiFi Debug] Terminals linked to this browser:', browserTerminals.map(t => ({
        id: t._id,
        label: t.label,
        locationId: t.location._id,
        locationName: t.location.name,
        status: t.status,
        matchesLocation: t.location._id === location?._id
      })))
    }
    
    return !!matchingTerminal
  }

  // Get tooltip message for wifi status
  const getWifiTooltipMessage = () => {
    const isLinked = isLinkedToOnlineTerminal()
    return isLinked 
      ? `Connected to online terminal at ${location?.name}`
      : `No active terminal connection at ${location?.name}`
  }

  const handleChange = (state) => {
    Cookies.set('sidebar_state', String(state))
    setOpen(state)
  }

  const showBreadcrumbs = ['/shop', '/locations']
  const showHeaderExtras = showBreadcrumbs.some(path => pathname.startsWith(path));

  return (
    <TooltipProvider>
      <SidebarProvider open={open} onOpenChange={(state) => handleChange(state)} >
      <AppSidebar />
      <SidebarInset>
        <header
          className="pr-4 flex h-10 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-4 px-4">
            <SidebarTrigger className="-ml-1" />
            {!open && (
              <div className="flex items-center gap-2 text-sidebar-primary">
                <MapPin className="w-4 h-4" />
                <span>{location?.name}</span>
                <Tooltip>
                  <TooltipTrigger>
                    {(() => {
                      const isConnected = isLinkedToOnlineTerminal()
                      console.log(`📡 [NAV WiFi Debug] Rendering WiFi icon: ${isConnected ? 'CONNECTED' : 'DISCONNECTED'}`)
                      return isConnected ? (
                        <Wifi className="w-4 h-4 text-primary" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-destructive" />
                      )
                    })()}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getWifiTooltipMessage()}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

          </div>

          <div className='flex-1'/>

          <div className='flex gap-8'>
            {showHeaderExtras && (
              <>
                <BreadcrumbMenu />
                {/* <Cart /> */}
              </>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4- pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  );
}
