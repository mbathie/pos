"use client";

import { useState, useEffect } from "react";
import { CircleDollarSign, Settings, Calendar, ChefHat, Receipt, UserCheck, Tag, ScanLine, CreditCard, CheckCircle, Building2 } from "lucide-react";
import { NavMenu } from "@/components/nav-menu";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";

import { useGlobals } from "@/lib/globals";
import { filterMenuByPermissions } from "@/lib/permissions";

// const teams = [{ name: "Sunny Coast" }];

export function AppSidebar(props) {
  const { employee } = useGlobals()
  const [isClient, setIsClient] = useState(false)

  // Ensure we only apply permissions filtering on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Static menu for SSR - no dynamic content
  const staticMenuItems = [
    { title: "Sale", url: "/shop", icon: CircleDollarSign },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  // Full menu items - only used after employee data is available
  const getAllMenuItems = () => [
    { title: "Sale", url: "/shop", icon: CircleDollarSign },
    { title: "Check In", url: "/checkin", icon: ScanLine },
    { title: "Bump", url: "/manage/orders", icon: ChefHat },
    { title: "Memberships", url: "/manage/memberships", icon: CreditCard },
    {
      title: "Schedules", icon: Calendar,
      items: [
        { title: "Calendar", url: "/manage/calendar" },
        { title: "Bookings", url: "/manage/bookings" },
        { title: "Classes & Courses", url: "/manage/classes" },
        { title: "General Entry", url: "/manage/general" },
      ]
    },
    { title: "Check-ins", url: "/manage/checkins", icon: CheckCircle },
    { title: "Customers", url: "/manage/customers", icon: UserCheck },
    { title: "Companies", url: "/manage/companies", icon: Building2 },
    // { title: "Waiver", url: `${process.env.NEXT_PUBLIC_DOMAIN}/org/${employee?.org?._id || 'default'}/waiver`, icon: QrCode },
    { title: "Transactions", url: "/manage/transactions", icon: Receipt },
    { groupLabel: "Setup", permission: "group:setup"},
    {
      title: "Products", icon: Tag,
      items: [
        { title: "Shop", url: "/products/shop" },
        { title: "Classes", url: "/products/classes" },
        { title: "Memberships", url: "/products/memberships" },
        { title: "General Entry", url: "/products/general" },
        { title: "Groups", url: "/products/groups" },
        { title: "Shop Mods", url: "/products/mods" },
        { title: "POS Interfaces", url: "/products/pos" },
        { title: "Adjustments", url: "/manage/adjustments" },
        { title: "All Products", url: "/manage/products" },
      ]
    },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  // Only apply permissions filtering on the client side after hydration
  // This prevents hydration mismatches
  let settings;
  
  if (!isClient || !employee?._id) {
    // During SSR or before employee fully loads, show static safe menu
    // Use employee._id to ensure employee is fully loaded, not just the object exists
    settings = staticMenuItems;
  } else {
    // After hydration with full employee data, apply permissions
    settings = filterMenuByPermissions(getAllMenuItems(), employee.role);
  }


  return (
    <Sidebar collapsible="icon" {...props} >
      <SidebarContent suppressHydrationWarning className="pt-2">
        <NavMenu settings={settings} />
      </SidebarContent>
      <SidebarFooter suppressHydrationWarning>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
