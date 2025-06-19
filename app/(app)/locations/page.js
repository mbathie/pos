'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useGlobals } from '@/lib/globals'

import {
  Table, TableBody,
  TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Page() {
  const [locations, setLocations] = useState([])
  const { pushBreadcrumb, resetBreadcrumb } = useGlobals()
  
  useEffect(() => {
    resetBreadcrumb({ name: "Locations", href: "/locations" })
  }, []);

  const fetchLocations = async () => {
    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/locations')
    const data = await res.json()
    setLocations(data)
  }

  useEffect(() => {
    fetchLocations()
  }, [])

  return (
    <div className="px-4">
      <div className='flex items-center mb-2'>
        <div className='font-semibold mb-2 mr-auto'>Store Locations</div>
        <Link href="/locations/create">
          <Button size="sm">New</Button>
        </Link>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={loc._id}>
                  <TableCell>{loc.name}</TableCell>
                  <TableCell>{[loc.address1, loc.city].filter(Boolean).join(', ') || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/locations/${loc._id}`}>
                      <Pencil className="size-4 hover:text-foreground" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
