"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { MapPin, Monitor, CreditCard, LayoutGrid } from "lucide-react"
import { useGlobals } from '@/lib/globals'
import { Badge } from "@/components/ui/badge"
import {
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar"
import { usePathname } from 'next/navigation'

export function LocationDisplay() {
  // Use individual selectors for better reactivity with zustand persist
  const location = useGlobals(state => state.location)
  const device = useGlobals(state => state.device)
  const terminalConnection = useGlobals(state => state.terminalConnection)
  const posInterfaceName = useGlobals(state => state.posInterfaceName)

  const pathname = usePathname()

  // Force re-render on hydration
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Compute derived values
  const terminalLabel = device?.terminal?.label || terminalConnection?.readerLabel || null
  const isShopPage = pathname === '/shop'

  // Show placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <MapPin className="size-5"/>
            </div>
            <div className="flex-1 text-left text-sm leading-tight">
              <div className="flex items-center gap-2 min-w-0 text-primary">
                <span className="truncate font-medium">Loading...</span>
              </div>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="cursor-default hover:bg-transparent"
          disabled>
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <MapPin className="size-5"/>
          </div>
          <div className="flex-1 text-left text-sm leading-tight">
            <div className="flex items-center gap-2 min-w-0 text-primary">
              <span className="truncate font-medium">{location?.name || 'No Location'}</span>
              {device?.name && (
                <>
                  <Monitor className="h-3 w-3 shrink-0" />
                  <span className="font-medium">{device.name}</span>
                </>
              )}
              {!isShopPage && (
                <Badge variant={terminalLabel ? "default" : "secondary"} className="text-xs shrink-0">
                  <CreditCard className="h-3 w-3 mr-1" />
                  {terminalLabel || 'No Terminal'}
                </Badge>
              )}
              {posInterfaceName && (
                <>
                  <LayoutGrid className="h-3 w-3 shrink-0" />
                  <span className="font-medium">{posInterfaceName}</span>
                </>
              )}
            </div>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
