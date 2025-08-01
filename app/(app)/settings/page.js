'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { TypographyLarge, TypographyMuted } from '@/components/ui/typography'
import { Card, CardContent } from '@/components/ui/card'
import { Loader, CheckCircle2, Calculator, Download, Link as LinkIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Separator } from '@radix-ui/react-separator'
import { QRCode } from 'react-qrcode-logo'

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

  const downloadWaiverPDF = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/waiver/pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'waiver-qr-code.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  return (
    <div className="px-4 flex flex-col gap-4 mb-4">
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
              <div>Waiver Signup Page</div>
              <TypographyMuted>
                For new customers wanting to join, this is the URL to direct them to. You can also print the QR place it at a convenient location
              </TypographyMuted>
            </div>
            <div className='flex gap-2 flex-row'>
              <div className="rounded-lg overflow-hidden w-[148px] h-[148px]">
                <QRCode value={`${process.env.NEXT_PUBLIC_DOMAIN}/org/${org._id}/waiver`} size={128} />
              </div>
              <div className='flex flex-col gap-2'>
                <div>
                  <Link target="_blank" href={`${process.env.NEXT_PUBLIC_DOMAIN}/org/${org._id}/waiver`}>
                    <Button className='w-38 flex justify-start'>
                      <LinkIcon className="size-4" />
                      Waiver Link
                    </Button>
                  </Link>
                </div>
                <div>
                  <Button className='w-38' onClick={downloadWaiverPDF}>
                    <Download className="size-4 flex justify-start" />
                    Download PDF
                  </Button>
                </div>
              </div>
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
                  <div className="gap-2 flex items-start text-primary">
                    <CheckCircle2/>
                    Completed
                  </div>
                )
              )}
            </div>

            <div>
              <div>Payment Terminals</div>
              <TypographyMuted>
                {chargesEnabled 
                  ? 'Manage payment terminals for taking card payments.'
                  : 'Complete Stripe account setup to enable payment terminals.'
                }
              </TypographyMuted>
            </div>
            <div>
              {chargesEnabled ? (
                <Link href="/manage/terminals">
                  <Button className='cursor-pointer'>
                    Manage Terminals
                  </Button>
                </Link>
              ) : (
                <Button 
                  disabled
                  variant="secondary"
                  className='cursor-not-allowed'
                >
                  Complete Stripe Setup First
                </Button>
              )}
            </div>

            <Separator className='border-t border-muted col-span-2' />

            <div>
              <div>Products & Quantities</div>
              <TypographyMuted>
                Manage Products, product quantities, and stock par levels

              </TypographyMuted>
            </div>
            <div>
              <Link href="/manage/products">
                <Button>
                  Manage Products
                </Button>
              </Link>
            </div>

            <Separator className='border-t border-muted col-span-2' />

            <div>
              <div>Shop Locations</div>
              <TypographyMuted>
                If your business has multiple locations, you can manage them here.
              </TypographyMuted>
            </div>
            <div>
              <Link href="/manage/locations">
                <Button>
                  Manage Locations
                </Button>
              </Link>
            </div>

            <Separator className='border-t border-muted col-span-2' />

            <div>
              <div>Product Location Availability</div>
              <TypographyMuted>
                Manage which locations are available for each product.
              </TypographyMuted>
            </div>
            <div>
              <Link href="/products/locations">
                <Button>
                  Manage Locations
                </Button>
              </Link>
            </div>

            <Separator className='border-t border-muted col-span-2' />

            <div>
              <div>Accounting Codes</div>
              <TypographyMuted>
                Manage accounting codes for your products and services. Set up tax categories and organize your financial reporting.
              </TypographyMuted>
            </div>
            <div>
              <Link href="/manage/accounting">
                <Button>
                  Manage Codes
                </Button>
              </Link>
            </div>

            <Separator className='border-t border-muted col-span-2' />

            <div>
              <div>Discounts</div>
              <TypographyMuted>
                Create and manage discount codes for your products and services. Set up percentage or fixed amount discounts.
              </TypographyMuted>
            </div>
            <div>
              <Link href="/manage/discounts">
                <Button>
                  Manage Discounts
                </Button>
              </Link>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
