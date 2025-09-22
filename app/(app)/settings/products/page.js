'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function ProductsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Products</h3>
        <p className="text-sm text-muted-foreground">
          Manage your products, inventory, and stock levels.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Products & Quantities</CardTitle>
            <CardDescription>
              Manage products, product quantities, and stock par levels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/manage/products">
              <Button className="cursor-pointer">
                Manage Products
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}