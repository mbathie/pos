"use client";

import { MapPin, Users, CircleDollarSign, Coffee } from "lucide-react";
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
const actions = [
  { name: "Sale", url: "/sale", icon: CircleDollarSign },
];

const settings = [
  { 
    title: "Products", icon: Coffee,
    items: [
      { title: "Subscription", url: "/products/memberships" },
      { title: "Non Subscription", url: "/products" },
      { title: "Location Availability", url: "/products/locations" },
    ]
  },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Locations", url: "/locations", icon: MapPin },
];

export function AppSidebar(props) {
  return (
    <Sidebar collapsible="icon" {...props} >
      <SidebarHeader>
        <LocationSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMenu actions={actions} settings={settings} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}