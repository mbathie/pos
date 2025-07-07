"use client";

import { MapPin, Users, CircleDollarSign, Coffee, Settings, Calendar } from "lucide-react";
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

const teams = [{ name: "Sunny Coast" }];

// const actions = [
//   { title: "Sale", name: "Sale", url: "/shop", icon: CircleDollarSign },
// ];

const settings = [

  { title: "Sale", url: "/shop", icon: CircleDollarSign },
  { 
    title: "Schedules", icon: Calendar,
    items: [
      { title: "Casual Entry", url: "/manage/casual" },
    ]
  },
  { groupLabel: "Setup"},
  { 
    title: "Products", icon: Coffee,
    items: [
      { title: "Casual Entry", url: "/products/casual" },
      { title: "Classes", url: "/products/classes" },
      { title: "Membership", url: "/products/memberships" },
      { title: "Shop", url: "/products/shop" },
      { title: "Locations", url: "/products/locations" },
    ]
  },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Locations", url: "/locations", icon: MapPin },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar(props) {
  return (
    <Sidebar collapsible="icon" {...props} >
      <SidebarHeader>
        <LocationSwitcher teams={teams} />
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