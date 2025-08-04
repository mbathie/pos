"use client";

import { useState, useEffect } from "react";
import { MapPin, MapPinCheckInside, Users, CircleDollarSign, Landmark, Settings, Calendar, QrCode, ChefHat, Receipt, Percent, Terminal, UserCheck, Tag } from "lucide-react";
import { NavMenu } from "@/components/nav-menu";
import { NavUser } from "@/components/nav-user";
import { LocationSwitcher } from "@/components/location-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
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
    { title: "Bump", url: "/manage/orders", icon: ChefHat },
    { 
      title: "Schedules", icon: Calendar,
      items: [
        { title: "Casual Entry", url: "/manage/casual" },
        { title: "Class & Courses", url: "/manage/classes" },
      ]
    },
    { title: "Customers", url: "/manage/customers", icon: UserCheck },
    { title: "Waiver", url: `${process.env.NEXT_PUBLIC_DOMAIN}/org/${employee?.org?._id || 'default'}/waiver`, icon: QrCode },
    { title: "Transactions", url: "/manage/transactions", icon: Receipt },
    { groupLabel: "Setup", permission: "group:setup"},
    { 
      title: "Products", icon: Tag,
      items: [
        { title: "Casual Entry", url: "/products/casual" },
        { title: "Classes", url: "/products/classes" },
        { title: "Membership", url: "/products/memberships" },
        { title: "Shop", url: "/products/shop" },
        { title: "All Products", url: "/manage/products" },
      ]
    },
    { title: "Employees", url: "/employees", icon: Users },
    { title: "Shop Locations", url: "/manage/locations", icon: MapPin },
    // { title: "Product Locations", url: "/products/locations", icon: MapPinCheckInside },
    // { title: "Terminals", url: "/manage/terminals", icon: Terminal },
    { title: "Accounting", url: "/manage/accounting", icon: Landmark },
    { title: "Discounts", url: "/manage/discounts", icon: Percent },
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
      <SidebarHeader>
        <LocationSwitcher />
      </SidebarHeader>
      <SidebarContent suppressHydrationWarning>
        <NavMenu settings={settings} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}