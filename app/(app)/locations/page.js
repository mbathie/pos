'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Edit, Plus } from 'lucide-react'
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
    <Card className="mx-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Store Locations</CardTitle>
            <CardDescription>Manage your business locations</CardDescription>
          </div>
          <Link href="/locations/create">
            <Button size="sm">
              <Plus className="size-4"/> Add Location
            </Button>
          </Link>
        </div>
      </CardHeader>
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
                  <TableCell className="text-right flex gap-2 justify-end">
                    <Link href={`/locations/${loc._id}`}>
                      <Edit className="size-4 hover:text-foreground" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
  )
}
