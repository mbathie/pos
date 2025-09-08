'use client'
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Upload, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import IconSelect from '@/components/icon-select'

const australianStates = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' }
]

export default function OrganizationSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoDialogOpen, setLogoDialogOpen] = useState(false)
  const [orgData, setOrgData] = useState({
    name: '',
    phone: '',
    addressLine: '',
    suburb: '',
    state: '',
    postcode: '',
    logo: null
  })
  const [originalData, setOriginalData] = useState(null)

  useEffect(() => {
    fetchOrgData()
  }, [])

  const fetchOrgData = async () => {
    try {
      const response = await fetch('/api/orgs')
      if (response.ok) {
        const data = await response.json()
        const org = data.org
        setOrgData({
          name: org.name || '',
          phone: org.phone || '',
          addressLine: org.addressLine || '',
          suburb: org.suburb || '',
          state: org.state || '',
          postcode: org.postcode || '',
          logo: org.logo || null
        })
        setOriginalData({
          name: org.name || '',
          phone: org.phone || '',
          addressLine: org.addressLine || '',
          suburb: org.suburb || '',
          state: org.state || '',
          postcode: org.postcode || '',
          logo: org.logo || null
        })
      }
    } catch (error) {
      console.error('Error fetching organization data:', error)
      toast.error('Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgData)
      })

      if (response.ok) {
        const data = await response.json()
        setOriginalData(orgData)
        toast.success('Organization settings saved successfully')
      } else {
        toast.error('Failed to save organization settings')
      }
    } catch (error) {
      console.error('Error saving organization:', error)
      toast.error('Failed to save organization settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoSelected = async (logoDataUrl) => {
    try {
      const response = await fetch('/api/orgs/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: logoDataUrl })
      })

      if (response.ok) {
        const data = await response.json()
        setOrgData(prev => ({ ...prev, logo: data.logo }))
        setOriginalData(prev => ({ ...prev, logo: data.logo }))
        toast.success('Logo updated successfully')
      } else {
        toast.error('Failed to update logo')
      }
    } catch (error) {
      console.error('Error updating logo:', error)
      toast.error('Failed to update logo')
    }
  }

  const handleLogoRemove = async () => {
    if (!orgData.logo) return

    try {
      const response = await fetch('/api/orgs/logo', {
        method: 'DELETE'
      })

      if (response.ok) {
        setOrgData(prev => ({ ...prev, logo: null }))
        setOriginalData(prev => ({ ...prev, logo: null }))
        toast.success('Logo removed successfully')
      } else {
        toast.error('Failed to remove logo')
      }
    } catch (error) {
      console.error('Error removing logo:', error)
      toast.error('Failed to remove logo')
    }
  }

  const hasChanges = JSON.stringify(orgData) !== JSON.stringify(originalData)

  if (loading) {
    return (
      <div className="mx-4 mt-4">
        <div className="text-center py-8 text-muted-foreground">
          Loading organization settings...
        </div>
      </div>
    )
  }

  return (
    <div className="mx-4 mt-2 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/settings')}
          className="cursor-pointer"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Settings
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold">Organization Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization's information and branding
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={orgData.name}
              onChange={(e) => setOrgData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter organization name"
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Organization Logo</Label>
            <p className="text-sm text-muted-foreground">
              Upload your company logo for receipts and branding. Recommended size: 3:1 aspect ratio.
            </p>
            <div className="flex items-center gap-4">
              {orgData.logo ? (
                <div className="relative w-48 h-16 border rounded-lg overflow-hidden">
                  <Image
                    src={orgData.logo}
                    alt="Organization logo"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-16 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                  No logo
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogoDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <Upload className="size-4 mr-2" />
                  {orgData.logo ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {orgData.logo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogoRemove}
                    className="cursor-pointer"
                  >
                    <Trash2 className="size-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={orgData.phone}
              onChange={(e) => setOrgData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number"
            />
          </div>

          {/* Address Line */}
          <div className="space-y-2">
            <Label htmlFor="addressLine">Address Line</Label>
            <Input
              id="addressLine"
              value={orgData.addressLine}
              onChange={(e) => setOrgData(prev => ({ ...prev, addressLine: e.target.value }))}
              placeholder="Street address"
            />
          </div>

          {/* Suburb */}
          <div className="space-y-2">
            <Label htmlFor="suburb">Suburb / Locality</Label>
            <Input
              id="suburb"
              value={orgData.suburb}
              onChange={(e) => setOrgData(prev => ({ ...prev, suburb: e.target.value }))}
              placeholder="Suburb or locality"
            />
          </div>

          {/* State and Postcode - side by side on wider screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={orgData.state}
                onValueChange={(value) => setOrgData(prev => ({ ...prev, state: value }))}
              >
                <SelectTrigger id="state" className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {australianStates.map(state => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={orgData.postcode}
                onChange={(e) => setOrgData(prev => ({ ...prev, postcode: e.target.value }))}
                placeholder="Postcode"
                maxLength={4}
                className="w-full"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Logo Selection Dialog */}
      <IconSelect
        open={logoDialogOpen}
        setOpen={setLogoDialogOpen}
        onIconSelected={handleLogoSelected}
        title="Upload Organization Logo"
        query=""
        aspectRatio={3}
        showIconLibrary={false}
        showImageUpload={true}
      />
    </div>
  )
}