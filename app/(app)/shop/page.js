'use client'
import React, { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import Image from 'next/image'
import { useGlobals } from '@/lib/globals'

export default function Page() {
  const { pushBreadcrumb, resetBreadcrumb } = useGlobals()

  useEffect(() => resetBreadcrumb({ name: "Shop", href: "/shop" }), []);

  return (
    <div className='text-center'>
      
      <div className='flex gap-4 justify-center'>
        <Card className="aspect-square size-72 text-center">
          <CardHeader>
            <CardTitle>Membership / Day Pass</CardTitle>
            <CardDescription>Recurring memberships, or once off pass</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="relative w-32 h-32 mt-4"> {/* Control the size here */}
              <Image 
                src="https://static.thenounproject.com/png/7637397-200.png" 
                alt="Membership Icon"
                fill
                style={{ objectFit: 'contain' }}
                className='invert'
              />
            </div>
          </CardContent>
        </Card>

        <Link href='/shop/retail' onClick={() => pushBreadcrumb({ href: '/shop/retail', name: "Categories" })}>
          <Card className="aspect-square size-72 text-center">
            <CardHeader>
              <CardTitle>Food and Beverage</CardTitle>
              <CardDescription>Food and Beverage items for sale</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <div className="relative w-32 h-32 mt-4"> {/* Control the size here */}
                <Image 
                  src="https://static.thenounproject.com/png/7400432-200.png" 
                  alt="Membership Icon"
                  fill
                  style={{ objectFit: 'contain' }}
                  className='invert'
                />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}