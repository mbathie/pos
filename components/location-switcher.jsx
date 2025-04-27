"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, MapPin } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function LocationSwitcher({}) {

  const { isMobile } = useSidebar()
  const [location, setLocation] = React.useState()
  const [locations, setLocations] = React.useState([])

  React.useEffect(() => {
    async function start() {
      // Fetch locations from the server
      const res = await fetch(`/api/locations`, { method: "GET" })
      const locations = await res.json()

      // Fetch the current employee details
      const userRes = await fetch(`/api/users/me`)
      var employee = await userRes.json()
      employee = employee.employee

      // Check if there's a saved locationId in localStorage, else fallback to employee's locationId
      const storedLocationId = localStorage.getItem('locationId')
      const defaultLocationId = storedLocationId || employee.locationId

      // Find the default location based on stored or employee's locationId
      const defaultLocation = locations.find((l) => l.id == defaultLocationId)

      setLocations(locations)
      setLocation(defaultLocation || locations[0])
    }
    start()
  },[])

  if (!locations.length) return (<></>)

  const setLocationStorage = (locationId) => {
    localStorage.setItem('locationId', locationId)
  }

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
                key={l.id}
                onClick={() => {
                  setLocation(l);
                  setLocationStorage(l.id)
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