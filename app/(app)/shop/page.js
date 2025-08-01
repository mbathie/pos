'use client'
import React, { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { useGlobals } from '@/lib/globals'
import { Coffee, Ticket, Dumbbell, IdCard } from "lucide-react";

export default function Page() {
  const { pushBreadcrumb, resetBreadcrumb } = useGlobals()

  useEffect(() => resetBreadcrumb({ name: "Shop", href: "/shop" }), []);

  const shopItems = [
    { title: "Casual Entry", icon: Ticket, href: "/shop/casual", breadcrumb: { href: "/shop/casual", name: "Casual Entry" } },
    { title: "Classes & Courses", icon: Dumbbell, href: "/shop/classes", breadcrumb: { href: "/shop/classes", name: "Classes & Courses" } },
    { title: "Membership", icon: IdCard, href: "/shop/memberships", breadcrumb: { href: "/shop/memberships", name: "Memberships" } },
    { title: "Food, Bev & Shop", icon: Coffee, href: "/shop/retail", breadcrumb: { href: "/shop/retail", name: "Folders" } }
  ];

  return (
    <div className='text-center'>
      <div className='flex gap-4 justify-center flex-wrap'>
        {shopItems.map((item, i) => {
          const content = (
            <Card key={item.title} className="aspect-square size-50 text-center">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-full">
                <item.icon className="size-10 mx-auto mt-4" />
              </CardContent>
            </Card>
          );

          return item.href ? (
            <Link
              key={item.title}
              href={item.href}
              onClick={() => pushBreadcrumb(item.breadcrumb)}
            >
              {content}
            </Link>
          ) : content;
        })}
      </div>
    </div>
  )
}