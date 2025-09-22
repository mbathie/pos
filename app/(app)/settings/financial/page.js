'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function FinancialSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Financial</h3>
        <p className="text-sm text-muted-foreground">
          Manage accounting codes and financial adjustments.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Accounting Codes</CardTitle>
            <CardDescription>
              Manage accounting codes for your products and services. Set up tax categories and organize your financial reporting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/manage/accounting">
              <Button className="cursor-pointer">
                Manage Codes
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adjustments (Discounts & Surcharges)</CardTitle>
            <CardDescription>
              Create and manage adjustments for your products and services. Set up discounts, surcharges, and promotional codes.
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
      </div>
    </div>
  )
}