'use client'
import Cookies from 'js-cookie'
import { useEffect, useState } from 'react'

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function Page({children}) {
  const [ open, setOpen ] = useState(false)
  useEffect(() => {
    const d = Cookies.get("sidebar_state")
    const isOpen = d === "true"
    setOpen(isOpen)
  }, [])

  const handleChange = (state) => {
    Cookies.set('sidebar_state', String(state))
    setOpen(state)
  }
 
  return (
    <SidebarProvider open={open} onOpenChange={(state) => handleChange(state)} >
      <AppSidebar />
      <SidebarInset>
        <header
          className="flex h-10 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />

          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4- pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
