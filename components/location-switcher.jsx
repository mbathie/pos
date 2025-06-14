"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, MapPin } from "lucide-react"
import { useGlobals } from '@/lib/globals'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar"

export function LocationSwitcher({}) {
  const { isMobile } = useSidebar()
  const [locations, setLocations] = React.useState([])
  const { location, setLocation } = useGlobals()

  
  
  React.useEffect(() => {
    async function start() {
      // Fetch locations from the server
      const res = await fetch(`/api/locations`, { method: "GET" })
      const locations = await res.json()

      // Fetch the current employee details
      const userRes = await fetch(`/api/users/me`)
      var employee = await userRes.json()
      employee = employee.employee

      // Find the default location based on employee's locationId
      const defaultLocation = locations.find((l) => l._id === employee.locationId)

      setLocations(locations)
      setLocation(defaultLocation || locations[0])
    }
    start()
  },[])

  async function setLocationCookie(location) {
    await fetch(`/api/auth/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: location._id }),
    })
  }

  if (!locations.length) return (<></>)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <MapPin className="size-5"/>
              </div>
              <div className="grid- flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{location?.name}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Locations
            </DropdownMenuLabel>
            {locations.map((l) => (
              <DropdownMenuItem
                key={l._id}
                onClick={() => {
                  setLocation(l)
                  setLocationCookie(l)
                }}
                className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <MapPin className="size-3.5 shrink-0"/>
                </div>
                {l.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add Location</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}