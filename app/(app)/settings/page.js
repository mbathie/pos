'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Upload, Trash2, Loader2, Loader } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
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
    logo: null,
    membershipSuspensionDaysPerYear: 30
  })
  const [originalData, setOriginalData] = useState(null)
  const [savingSuspensionDays, setSavingSuspensionDays] = useState(false)

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
          logo: org.logo || null,
          membershipSuspensionDaysPerYear: org.membershipSuspensionDaysPerYear || 30
        })
        setOriginalData({
          name: org.name || '',
          phone: org.phone || '',
          addressLine: org.addressLine || '',
          suburb: org.suburb || '',
          state: org.state || '',
          postcode: org.postcode || '',
          logo: org.logo || null,
          membershipSuspensionDaysPerYear: org.membershipSuspensionDaysPerYear || 30
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

  const handleSuspensionDaysChange = (value) => {
    // Allow null for empty field, otherwise ensure positive whole integers
    if (value === null) {
      setOrgData(prev => ({ ...prev, membershipSuspensionDaysPerYear: null }))
    } else {
      const validValue = Math.max(0, Math.min(365, Math.floor(value)))
      setOrgData(prev => ({ ...prev, membershipSuspensionDaysPerYear: validValue }))
    }
  }

  const handleSaveSuspensionDays = async () => {
    setSavingSuspensionDays(true)

    // Use 0 if the field is empty/null
    const valueToSave = orgData.membershipSuspensionDaysPerYear ?? 0

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/orgs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ membershipSuspensionDaysPerYear: valueToSave })
      })

      if (!res.ok) {
        throw new Error('Failed to update setting')
      }

      const data = await res.json()
      setOriginalData(prev => ({ ...prev, membershipSuspensionDaysPerYear: valueToSave }))
      toast.success('Membership suspension days updated successfully')
    } catch (error) {
      console.error('Error updating suspension days setting:', error)
      setOrgData(prev => ({ ...prev, membershipSuspensionDaysPerYear: originalData?.membershipSuspensionDaysPerYear || 30 }))
      toast.error('Failed to update setting. Please try again.')
    } finally {
      setSavingSuspensionDays(false)
    }
  }

  const hasChanges = JSON.stringify(orgData) !== JSON.stringify(originalData)

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Organization</h3>
          <p className="text-sm text-muted-foreground">
            Manage your organization settings and preferences.
          </p>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          Loading organization settings...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Organization</h3>
        <p className="text-sm text-muted-foreground">
          Manage your organization's information and branding.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
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

      {/* Membership Settings Card */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="suspension-days">Membership Suspension Days</Label>
              <p className="text-sm text-muted-foreground">
                Set the maximum number of days a member can suspend their membership in a 365 day period.
              </p>
              <div className="flex items-center space-x-2">
                <NumberInput
                  id="suspension-days"
                  min={0}
                  max={365}
                  step={1}
                  value={orgData.membershipSuspensionDaysPerYear}
                  onChange={handleSuspensionDaysChange}
                  disabled={savingSuspensionDays}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">days per year</span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveSuspensionDays}
                disabled={((orgData.membershipSuspensionDaysPerYear ?? 0) === (originalData?.membershipSuspensionDaysPerYear ?? 0)) || savingSuspensionDays}
                className="cursor-pointer"
              >
                {savingSuspensionDays ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
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