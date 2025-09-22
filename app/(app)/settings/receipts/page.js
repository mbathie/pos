'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export default function ReceiptsSettingsPage() {
  const [org, setOrg] = useState({})
  const [autoReceiptShop, setAutoReceiptShop] = useState(false)
  const [savingAutoReceipt, setSavingAutoReceipt] = useState(false)

  useEffect(() => {
    const fetchOrg = async () => {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/orgs')
      const data = await res.json()
      setOrg(data.org)
      setAutoReceiptShop(data.org?.autoReceiptShop || false)
    }
    fetchOrg()
  }, [])

  const handleAutoReceiptToggle = async (checked) => {
    setSavingAutoReceipt(true)
    setAutoReceiptShop(checked)

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/orgs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ autoReceiptShop: checked })
      })

      if (!res.ok) {
        throw new Error('Failed to update setting')
      }

      const data = await res.json()
      setOrg(data.org)
    } catch (error) {
      console.error('Error updating auto receipt setting:', error)
      setAutoReceiptShop(!checked)
      alert('Failed to update setting. Please try again.')
    } finally {
      setSavingAutoReceipt(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Receipts</h3>
        <p className="text-sm text-muted-foreground">
          Manage receipt and email preferences.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Automatic Email Receipts for Shop Items</CardTitle>
            <CardDescription>
              Automatically send email receipts for shop only payments, when a customer is selected. You can still send email receipts manually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-receipt-shop"
                checked={autoReceiptShop}
                onCheckedChange={handleAutoReceiptToggle}
                disabled={savingAutoReceipt}
              />
              <Label htmlFor="auto-receipt-shop" className="cursor-pointer">
                {autoReceiptShop ? 'Enabled' : 'Disabled'}
              </Label>
              {savingAutoReceipt && <Loader className="ml-2 h-4 w-4 animate-spin" />}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}