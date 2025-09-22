'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Separator } from '@/components/ui/separator'

export default function PaymentsSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [chargesEnabled, setChargesEnabled] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    const fetchStripeAccount = async () => {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments')
      const data = await res.json()
      setChargesEnabled(data.charges_enabled)
      setHasFetched(true)
    }
    fetchStripeAccount()
  }, [])

  const handleConnect = async () => {
    setLoading(true)
    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments/setup')
    const data = await res.json()
    router.push(data.url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Payments</h3>
        <p className="text-sm text-muted-foreground">
          Configure payment processing and manage terminals.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Stripe Payments Setup</CardTitle>
            <CardDescription>
              Connect your existing Stripe account, or connect to a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasFetched && (
              !chargesEnabled ? (
                <Button onClick={handleConnect} disabled={loading} className="cursor-pointer">
                  {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Connect Stripe Account
                </Button>
              ) : (
                <div className="gap-2 flex items-start text-primary">
                  <CheckCircle2 />
                  <span>Stripe account connected</span>
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Terminals</CardTitle>
            <CardDescription>
              {chargesEnabled
                ? 'Manage payment terminals for taking card payments.'
                : 'Complete Stripe account setup to enable payment terminals.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chargesEnabled ? (
              <Link href="/manage/terminals">
                <Button className="cursor-pointer">
                  Manage Terminals
                </Button>
              </Link>
            ) : (
              <Button
                disabled
                variant="secondary"
                className="cursor-not-allowed"
              >
                Complete Stripe Setup First
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}