"use client";

import { MapPin, Users, CircleDollarSign, Coffee, Settings, Calendar, QrCode, ChefHat } from "lucide-react";
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

// const teams = [{ name: "Sunny Coast" }];

export function AppSidebar(props) {
  const { employee } = useGlobals()
  console.log(employee)

  const settings = [

    { title: "Sale", url: "/shop", icon: CircleDollarSign },
    { title: "Bump", url: "/manage/orders", icon: ChefHat },
    { 
      title: "Schedules", icon: Calendar,
      items: [
        { title: "Casual Entry", url: "/manage/casual" },
        { title: "Class & Courses", url: "/manage/classes" },

      ]
    },
    { title: "Waiver", url: `${process.env.NEXT_PUBLIC_DOMAIN}/org/${employee.org}/waiver`, icon: QrCode },
    { groupLabel: "Setup"},
    { 
      title: "Products", icon: Coffee,
      items: [
        { title: "Casual Entry", url: "/products/casual" },
        { title: "Classes", url: "/products/classes" },
        { title: "Membership", url: "/products/memberships" },
        { title: "Shop", url: "/products/shop" },
        { title: "Locations", url: "/products/locations" },
        { title: "Accounting", url: "/accounting" },
      ]
    },
    { title: "Employees", url: "/employees", icon: Users },
    { title: "Locations", url: "/locations", icon: MapPin },
    { title: "Settings", url: "/settings", icon: Settings },
  ];


  return (
    <Sidebar collapsible="icon" {...props} >
      <SidebarHeader>
        <LocationSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMenu settings={settings} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}