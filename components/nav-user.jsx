"use client"
// import { useGlobalContext } from '@/components/global-context'

import { ChevronsUpDown, LogOut, Moon, Sun, TriangleAlert } from "lucide-react"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";

import { useGlobals } from '@/lib/globals'
import { useLowStock } from '@/hooks/use-low-stock'

export function NavUser({
  user
}) {
  const { isMobile, open } = useSidebar()
  const router = useRouter()
  // const { employee } = useGlobalContext({})
  const { employee } = useGlobals()

  const { setTheme, resolvedTheme } = useTheme()
  const isDarkMode = resolvedTheme === "dark"

  const { resetCart, resetBreadcrumb } = useGlobals()
  
  const { hasLowStock, lowStockCount } = useLowStock()

  return (
    <div>
      {hasLowStock && (
        <div 
          className="flex items-center gap-1 cursor-pointer hover:opacity-80 ml-2"
          onClick={() => router.push('/manage/products')}
          title={`${lowStockCount} product${lowStockCount > 1 ? 's' : ''} low on stock - Click to view products`}
        >
          <TriangleAlert className="size-4 text-destructive animate-pulse" />
          <span className="text-xs text-destructive font-medium">{lowStockCount}</span>
        </div>
      )}

      <SidebarMenu>

        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent- data-[state=open]:text-sidebar-accent-foreground">
                {/* <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.avatar} alt={employee?.name} />
                  <AvatarFallback className="rounded-lg">CN12</AvatarFallback>
                </Avatar> */}
                {open &&
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{employee?.name}</span>
                  <span className="truncate text-xs">{employee?.email}</span>
                </div>
                }
                <ChevronsUpDown className="mx-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}>
              <DropdownMenuLabel className="p-0 font-normal px-1">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  {/* <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar> */}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{employee?.name}</span>
                    <span className="truncate text-xs">{employee?.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => setTheme(isDarkMode ? "light" : "dark")}>
                {isDarkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {isDarkMode ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  resetBreadcrumb()
                  resetCart()
                  await fetch("/api/auth/logout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                  })
                  window.location.href = "/login"
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
