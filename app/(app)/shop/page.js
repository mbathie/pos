'use client'
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TypographyH4 } from '@/components/ui/typography'
import Link from 'next/link'
import Image from 'next/image'

export default function Page() {
  return (
    <div className='text-center'>
      
      <TypographyH4 className='mb-6'>Select Category</TypographyH4>

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

        <Link href='/shop/retail'>
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