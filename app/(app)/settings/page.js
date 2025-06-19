'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

import { TypographyLarge, TypographyMuted } from '@/components/ui/typography'
import { Card, CardContent } from '@/components/ui/card'
import { Loader, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Separator } from '@radix-ui/react-separator'

export default function Page() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [ chargesEnabled, setChargesEnabled ] = useState(false)
  const [ hasFetched, setHasFetched ] = useState(false)
  const [ org, setOrg ] = useState({})
  const [ orgCpy, setOrgCpy ] = useState({}) 

  useEffect(() => {
    const fetchStripeAccount = async () => {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments')
      const data = await res.json()
      setChargesEnabled(data.charges_enabled)
      setHasFetched(true)
    }
    fetchStripeAccount()
  }, [])

  useEffect(() => {
    const fetchOrg = async () => {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/org')
      const data = await res.json()
      setOrg(data.org)
      setOrgCpy(data.org)
    }
    fetchOrg()
  }, [])

  const handleConnect = async () => {
    setLoading(true)
    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments/setup')
    const data = await res.json()
    router.push(data.url)
  }

  const saveOrg = async () => {
    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/org', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: org.name })
    })
  
    const data = await res.json();
    console.log(data)
    setOrg(data.org);
    setOrgCpy(data.org);
  };

  return (
    <div className="px-4 flex flex-col gap-4">
      <TypographyLarge>Settings</TypographyLarge>
      <Card>
        <CardContent>
          <div className='grid grid-cols-2 gap-8'>


            <div>
              <div>Organisation Name</div>
            </div>
            <div className='flex gap-2'>
              <Input value={org?.name || ""} onChange={(e) => setOrg({...org, name: e.target.value})} />
              <Button onClick={saveOrg} disabled={!org?.name?.trim() || org?.name === orgCpy?.name}>
                Save
              </Button>
            </div>

            <Separator className='border-t border-muted col-span-2' />

            <div>
              <div>Stripe Payments Setup</div>
              <TypographyMuted>
                Connect your existing Stripe account, or connect to a new one.
              </TypographyMuted>
            </div>
            <div>
              {hasFetched && (
                !chargesEnabled ? (
                  <Button onClick={handleConnect} disabled={loading}>
                    {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    Connect
                  </Button>
                ) : (
                  <div className="gap-2 flex items-start text-lime-400">
                    <CheckCircle2/>
                    Completed
                  </div>
                )
              )}
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
