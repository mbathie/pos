"use client"

import * as React from "react"
import { MapPin } from "lucide-react"
import { useGlobals } from '@/lib/globals'
import {
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar"

export function LocationDisplay() {
  const { location } = useGlobals()

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
            <span className="truncate font-medium">{location?.name || 'No Location'}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}