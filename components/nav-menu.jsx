"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function SidebarMenuItemWrapper({ item }) {
  const hasSubItems = !!item.items;
  const [open, setOpen] = useState(false);

  if (item.groupLabel) {
    return (
      <React.Fragment key={item.groupLabel}>
        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
          {item.groupLabel}
        </SidebarGroupLabel>
      </React.Fragment>
    );
  }

  if (hasSubItems) {
    return (
      <React.Fragment key={item.title}>
        <div className="relative">
          <div className="hidden group-data-[collapsible=icon]:block">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon className="size-5" />}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 space-y-1">
                <SidebarMenu className="space-y-1">
                  {item.items.map((subItem) => (
                    <SidebarMenuItem key={subItem.title}>
                      <SidebarMenuButton asChild>
                        <Link
                          href={subItem.url}
                          className="flex items-center space-x-2"
                          onClick={() => setOpen(false)}
                        >
                          <span className="text-sm">{subItem.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </PopoverContent>
            </Popover>
          </div>

          <Collapsible
            asChild
            className="group/collapsible group-data-[collapsible=icon]:hidden"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon className="size-5" />}
                  <span className="text-sm ml-1">{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <Link href={subItem.url}>
                          <span className="ml-1">{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </div>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment key={item.title}>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link href={item.url} className="flex items-center space-x-1-">
            {item.icon && <item.icon className="size-5" /> }
            <span className="text-sm ml-1">{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </React.Fragment>
  );
}

export function NavMenu({ actions, settings }) {
  const { setTheme, resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  return (
    <SidebarGroup className="group">
      <SidebarMenu>

        {settings.map((item) => (
          <SidebarMenuItemWrapper key={item.title || item.groupLabel} item={item} />
        ))}

      </SidebarMenu>
    </SidebarGroup>
  );
}