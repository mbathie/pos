import Image from "next/image";
import Link from 'next/link'
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle
} from "@/components/ui/navigation-menu"
import { AppSidebar } from "@/components/app-sidebar"

export default function Home({children}) {
  return (
    <div>

      <SidebarProvider>
        <AppSidebar />
        <main>
          <SidebarTrigger/>
          {children}
        </main>
      </SidebarProvider>
    </div>
  )
}
