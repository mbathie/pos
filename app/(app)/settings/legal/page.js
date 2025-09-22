'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function LegalSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Legal</h3>
        <p className="text-sm text-muted-foreground">
          Manage legal documents and compliance settings.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Waiver Content</CardTitle>
            <CardDescription>
              Customize the legal waiver text that customers must agree to when signing up for classes or activities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/waiver">
              <Button className="cursor-pointer">
                Edit Waiver
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
            <CardDescription>
              Manage the terms and conditions that customers must agree to when making purchases or signing up for services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/tandc">
              <Button className="cursor-pointer">
                Edit Terms
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}