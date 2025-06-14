'use client'
import { useGlobals } from '@/lib/globals'
import Link from "next/link"
import React from 'react'

import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function BreadcrumbMenu({}) {
  const { breadcrumb } = useGlobals()

  if (!breadcrumb)
    return null

  return (

    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumb.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {index < breadcrumb.length - 1 ? (
                <BreadcrumbLink asChild className="cursor-pointer">
                  <Link href={item.href}>{item.name}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.name}</BreadcrumbPage>
              )}

            </BreadcrumbItem>
            {index < breadcrumb.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>

        ))}
      </BreadcrumbList>
    </Breadcrumb>

  )

}