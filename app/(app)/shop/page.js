'use client'
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { useGlobals } from '@/lib/globals'
import { Coffee, Ticket, Dumbbell, IdCard } from "lucide-react";
import Cart from '@/components/cart'

export default function Page() {
  const { cart } = useGlobals()
  const [productSummary, setProductSummary] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProductSummary()
  }, []);

  const fetchProductSummary = async () => {
    try {
      const response = await fetch('/api/products/summary')
      if (response.ok) {
        const data = await response.json()
        setProductSummary(data.summary || {})
      } else {
        setProductSummary({})
      }
    } catch (error) {
      console.error('Error fetching product summary:', error)
      setProductSummary({})
    } finally {
      setLoading(false)
    }
  }

  const hasProductsInMenu = (menu) => {
    return productSummary[menu]?.totalProducts > 0
  }

  const shopItems = [
    { 
      title: "General Entry", 
      icon: Ticket, 
      href: "/shop/general", 
      setupHref: "/products/general",
      menu: "general"
    },
    { 
      title: "Classes & Courses", 
      icon: Dumbbell, 
      href: "/shop/classes", 
      setupHref: "/products/classes",
      menu: "classes"
    },
    { 
      title: "Membership", 
      icon: IdCard, 
      href: "/shop/memberships", 
      setupHref: "/products/memberships",
      menu: "memberships"
    },
    { 
      title: "Food, Bev & Shop", 
      icon: Coffee, 
      href: "/shop/retail", 
      setupHref: "/products/shop",
      menu: "shop"
    }
  ];

  return (
    <div className='flex h-full'>
      <div className={`flex-1 ${cart?.products?.length > 0 ? '' : 'text-center'}`}>
        <div className='flex gap-4 justify-center flex-wrap p-4'>
          {shopItems.map((item, i) => {
            const hasProducts = hasProductsInMenu(item.menu)
            
            const content = (
              <Card key={item.title} className="aspect-square size-50 text-center">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full">
                  {!loading && !hasProducts ? (
                    <Link href={item.setupHref}>
                      <Button variant="outline" size="lg">
                        Setup
                      </Button>
                    </Link>
                  ) : (
                    <item.icon className="size-10 mx-auto mt-4" />
                  )}
                </CardContent>
              </Card>
            );

            // Only make it clickable if products exist
            return hasProducts && item.href ? (
              <Link
                key={item.title}
                href={item.href}
              >
                {content}
              </Link>
            ) : content;
          })}
        </div>
      </div>
      
      {cart?.products?.length > 0 && !cart?.stale && <Cart />}
    </div>
  )
}