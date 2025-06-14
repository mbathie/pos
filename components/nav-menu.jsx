"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function NavMenu({ actions, settings }) {
  const { setTheme, resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  return (
    <SidebarGroup className="group">
      <SidebarMenu>
        {/* Top-level action items */}
        {actions.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <Link href={item.url} className="flex items-center space-x-2">
                <item.icon className="h-5 w-5" />
                <span className="text-sm">{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}

        <SidebarGroupLabel>Setup</SidebarGroupLabel>

        {/* Settings items (some with submenus) */}
        {settings.map((item) => {
          const hasSubItems = !!item.items;

          if (hasSubItems) {
            const [open, setOpen] = useState(false);

            return (
              <div key={item.title} className="relative">
                {/* Popover for collapsed sidebar */}
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
                                onClick={() => setOpen(false)} // ✅ closes on click
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

                {/* Collapsible for expanded sidebar */}
                <Collapsible
                  asChild
                  className="group/collapsible group-data-[collapsible=icon]:hidden"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        {item.icon && <item.icon className="size-5"/>}
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
            );
          }

          // Single-level item
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <Link href={item.url} className="flex items-center space-x-1">
                  <item.icon className="size-5" />
                  <span className="text-sm">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}

        {/* Theme toggle */}
        {/* <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <div className="flex items-center space-x-2">
              {isDarkMode ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <span className="text-sm mr-auto">Theme</span>
              <Switch
                checked={isDarkMode}
                onCheckedChange={() =>
                  setTheme(isDarkMode ? "light" : "dark")
                }
              />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem> */}
      </SidebarMenu>
    </SidebarGroup>
  );
}