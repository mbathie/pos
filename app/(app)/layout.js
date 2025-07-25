'use client'
import Cookies from 'js-cookie'
import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useGlobals } from '@/lib/globals'
import { hasPermission, requiresAuth, getDefaultPath } from '@/lib/permissions'

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import BreadcrumbMenu from '@/components/breadcrumb-menu'
// import Cart from './shop/cart'

export default function Page({children}) {
  const { location, employee } = useGlobals()
  const [ open, setOpen ] = useState(false)
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const d = Cookies.get("sidebar_state")
    const isOpen = d === "true"
    setOpen(isOpen)
  }, [])

  // Permission checking effect
  useEffect(() => {
    if (!employee?._id) return; // Wait for employee to load
    
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
  }, [pathname, employee, router]);

  const handleChange = (state) => {
    Cookies.set('sidebar_state', String(state))
    setOpen(state)
  }

  const showBreadcrumbs = ['/shop', '/locations']
  const showHeaderExtras = showBreadcrumbs.some(path => pathname.startsWith(path));

  return (
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
  );
}
