'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Package, Dumbbell, Users, ShoppingBag, Pizza, Percent, Grid3x3 } from 'lucide-react'

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
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              General Entry
            </CardTitle>
            <CardDescription>
              Manage general admission and entry products.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/products/general">
              <Button className="cursor-pointer">
                Manage General Entry
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Classes
            </CardTitle>
            <CardDescription>
              Manage class schedules and class products.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/products/classes">
              <Button className="cursor-pointer">
                Manage Classes
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membership
            </CardTitle>
            <CardDescription>
              Configure membership plans and pricing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/products/memberships">
              <Button className="cursor-pointer">
                Manage Memberships
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Shop
            </CardTitle>
            <CardDescription>
              Manage retail shop products and inventory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/products/shop">
              <Button className="cursor-pointer">
                Manage Shop
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pizza className="h-5 w-5" />
              Shop Mods
            </CardTitle>
            <CardDescription>
              Configure product modifiers and options.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/products/mods">
              <Button className="cursor-pointer">
                Manage Shop Mods
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Adjustments
            </CardTitle>
            <CardDescription>
              Manage discounts and surcharges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/manage/adjustments">
              <Button className="cursor-pointer">
                Manage Adjustments
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5" />
              All Products
            </CardTitle>
            <CardDescription>
              View and manage all products across categories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/manage/products">
              <Button className="cursor-pointer">
                Manage All Products
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}