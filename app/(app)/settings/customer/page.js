'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useGlobals } from '@/lib/globals'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Download, Link as LinkIcon } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { QRCode } from 'react-qrcode-logo'

export default function CustomerSettingsPage() {
  const { employee } = useGlobals()

  const downloadWaiverPDF = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/waiver/pdf`)

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'waiver-qr-code.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Customer</h3>
        <p className="text-sm text-muted-foreground">
          Manage customer-facing features and signup processes.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Waiver Signup Page</CardTitle>
            <CardDescription>
              For new customers wanting to join, this is the URL to direct them to. You can also print the QR and place it at a convenient location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex gap-4 flex-row'>
              <div className="rounded-lg overflow-hidden w-[148px] h-[148px]">
                <QRCode value={`${process.env.NEXT_PUBLIC_DOMAIN}/org/${employee?.org?._id}/waiver`} size={128} />
              </div>
              <div className='flex flex-col gap-2'>
                <Link target="_blank" href={`${process.env.NEXT_PUBLIC_DOMAIN}/org/${employee?.org?._id}/waiver`}>
                  <Button className='w-38 flex justify-start cursor-pointer'>
                    <LinkIcon className="size-4 mr-2" />
                    Waiver Link
                  </Button>
                </Link>
                <Button className='w-38 cursor-pointer' onClick={downloadWaiverPDF}>
                  <Download className="size-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}