'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGlobals } from '@/lib/globals'

import { TypographyLarge, TypographyMuted } from '@/components/ui/typography'
import { Card, CardContent } from '@/components/ui/card'
import { Loader, CheckCircle2, Calculator, Download, Link as LinkIcon, Upload, Trash2, Image } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Separator } from '@radix-ui/react-separator'
import { QRCode } from 'react-qrcode-logo'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog'

export default function Page() {
  const router = useRouter()
  const { employee } = useGlobals()
  const [loading, setLoading] = useState(false)

  const [ chargesEnabled, setChargesEnabled ] = useState(false)
  const [ hasFetched, setHasFetched ] = useState(false)
  const [ org, setOrg ] = useState({})
  const [ orgCpy, setOrgCpy ] = useState({})
  const [ showLogoModal, setShowLogoModal ] = useState(false)
  const [ selectedImage, setSelectedImage ] = useState(null)
  const [ crop, setCrop ] = useState({ unit: '%', width: 100, height: 33.33, x: 0, y: 33.33, aspect: 3 })
  const [ completedCrop, setCompletedCrop ] = useState(null)
  const [ uploadingLogo, setUploadingLogo ] = useState(false)
  const imgRef = useRef(null)
  const fileInputRef = useRef(null)

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

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result)
        setCrop({ unit: '%', width: 100, height: 33.33, x: 0, y: 33.33, aspect: 3 })
        setShowLogoModal(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const getCroppedImg = () => {
    return new Promise((resolve) => {
      const image = imgRef.current
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!completedCrop || !image) {
        resolve(null)
        return
      }

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      // Set canvas size to desired crop dimensions (3:1 aspect ratio)
      const pixelRatio = window.devicePixelRatio || 1
      canvas.width = completedCrop.width * pixelRatio
      canvas.height = completedCrop.height * pixelRatio
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.imageSmoothingQuality = 'high'

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      )

      canvas.toBlob((blob) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve(reader.result)
        }
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.95)
    })
  }

  const handleSaveLogo = async () => {
    setUploadingLogo(true)
    try {
      const croppedImage = await getCroppedImg()
      if (croppedImage) {
        const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/org/logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logo: croppedImage })
        })
        
        if (res.ok) {
          const data = await res.json()
          setOrg(data.org)
          setOrgCpy(data.org)
          setShowLogoModal(false)
          setSelectedImage(null)
          setCompletedCrop(null)
        }
      }
    } catch (error) {
      console.error('Error saving logo:', error)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/org/logo', {
        method: 'DELETE'
      })
      
      if (res.ok) {
        const data = await res.json()
        setOrg(data.org)
        setOrgCpy(data.org)
      }
    } catch (error) {
      console.error('Error removing logo:', error)
    }
  }

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
              <div>Organisation Logo</div>
              <TypographyMuted>
                Upload your company logo for receipts and branding. Recommended size: 3:1 aspect ratio.
              </TypographyMuted>
            </div>
            <div className='flex gap-2 items-center'>
              {org?.logo ? (
                <div className='flex items-center gap-2'>
                  <img 
                    src={org.logo} 
                    alt="Organization Logo" 
                    className="h-12 w-36 object-contain cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleRemoveLogo}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            <Separator className='border-t border-muted col-span-2' />

            <div>
              <div>Waiver Content</div>
              <TypographyMuted>
                Customize the legal waiver text that customers must agree to when signing up for classes or activities.
              </TypographyMuted>
            </div>
            <div>
              <Link href="/settings/waiver">
                <Button>
                  Edit Waiver
                </Button>
              </Link>
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
                <QRCode value={`${process.env.NEXT_PUBLIC_DOMAIN}/org/${employee?.org?._id}/waiver`} size={128} />
              </div>
              <div className='flex flex-col gap-2'>
                <div>
                  <Link target="_blank" href={`${process.env.NEXT_PUBLIC_DOMAIN}/org/${employee?.org?._id}/waiver`}>
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

      {/* Logo Crop Modal */}
      <Dialog open={showLogoModal} onOpenChange={setShowLogoModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crop Logo</DialogTitle>
            <DialogDescription>
              Adjust the crop area to select your logo. The logo will be saved in a 3:1 aspect ratio.
            </DialogDescription>
          </DialogHeader>
          
          {selectedImage && (
            <div className="flex flex-col gap-4">
              <div className="max-h-[400px] overflow-auto">
                <ReactCrop
                  crop={crop}
                  onChange={setCrop}
                  onComplete={setCompletedCrop}
                  aspect={3}
                  minWidth={100}
                >
                  <img
                    ref={imgRef}
                    src={selectedImage}
                    alt="Logo to crop"
                    style={{ maxWidth: '100%' }}
                  />
                </ReactCrop>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowLogoModal(false)
                    setSelectedImage(null)
                    setCompletedCrop(null)
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveLogo}
                  disabled={uploadingLogo || !completedCrop}
                >
                  {uploadingLogo ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Logo'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
