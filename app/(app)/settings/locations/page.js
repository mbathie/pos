'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function LocationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Locations</h3>
        <p className="text-sm text-muted-foreground">
          Manage your business locations.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Shop Locations</CardTitle>
            <CardDescription>
              If your business has multiple locations, you can manage them here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/manage/locations">
              <Button className="cursor-pointer">
                Manage Locations
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Location Availability</CardTitle>
            <CardDescription>
              Manage which locations are available for each product.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/products/locations">
              <Button className="cursor-pointer">
                Manage Availability
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}