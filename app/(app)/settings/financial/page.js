'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function FinancialSettingsPage() {
  const [minPaymentPercent, setMinPaymentPercent] = useState(50)
  const [paymentTermsDays, setPaymentTermsDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/org/settings')
        if (res.ok) {
          const data = await res.json()
          setMinPaymentPercent(data.minInvoicePaymentPercent ?? 50)
          setPaymentTermsDays(data.paymentTermsDays ?? 7)
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/org/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minInvoicePaymentPercent: minPaymentPercent,
          paymentTermsDays: paymentTermsDays
        })
      })

      if (res.ok) {
        toast.success('Settings saved')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

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
            <CardTitle>Invoice Payment Settings</CardTitle>
            <CardDescription>
              Configure payment requirements for company and group booking invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="minPayment">Minimum Invoice Payment (%)</Label>
              <div className="flex items-center gap-2">
                <NumberInput
                  id="minPayment"
                  min={0}
                  max={100}
                  value={minPaymentPercent}
                  onChange={setMinPaymentPercent}
                  className="w-24"
                  disabled={loading}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Customers must pay at least this percentage of the invoice total as an initial deposit. Set to 0 to allow any amount, or 100 to require full payment.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms (days)</Label>
              <div className="flex items-center gap-2">
                <NumberInput
                  id="paymentTerms"
                  min={1}
                  max={90}
                  value={paymentTermsDays}
                  onChange={setPaymentTermsDays}
                  className="w-24"
                  disabled={loading}
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Number of days customers have to pay invoices. Reminders will be sent at 5, 3, and 1 days before the due date for any outstanding balance.
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </CardContent>
        </Card>

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