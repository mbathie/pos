'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle2, Building2, User, MapPin, CreditCard, Globe, ShieldCheck, Upload, Camera, AlertCircle, Clock, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

// Country configurations
const COUNTRIES = [
  { value: 'AU', label: 'Australia', currency: 'AUD' },
  { value: 'US', label: 'United States', currency: 'USD' },
  { value: 'GB', label: 'United Kingdom', currency: 'GBP' },
  { value: 'NZ', label: 'New Zealand', currency: 'NZD' },
  { value: 'CA', label: 'Canada', currency: 'CAD' },
]

const COUNTRY_CONFIG = {
  AU: {
    states: [
      { value: 'NSW', label: 'New South Wales' },
      { value: 'VIC', label: 'Victoria' },
      { value: 'QLD', label: 'Queensland' },
      { value: 'WA', label: 'Western Australia' },
      { value: 'SA', label: 'South Australia' },
      { value: 'TAS', label: 'Tasmania' },
      { value: 'ACT', label: 'Australian Capital Territory' },
      { value: 'NT', label: 'Northern Territory' },
    ],
    routingLabel: 'BSB',
    routingPlaceholder: '062-000',
    routingMaxLength: 7,
    postalLabel: 'Postcode',
    postalPlaceholder: '2000',
    postalMaxLength: 4,
    phonePlaceholder: '+61 400 000 000',
    stripeAgreementUrl: 'https://stripe.com/au/legal/connect-account',
  },
  US: {
    states: [
      { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
      { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
      { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
      { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
      { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' },
      { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
      { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
      { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' },
      { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
      { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
      { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
      { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
      { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
      { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' },
      { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
      { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
      { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' },
      { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
      { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
      { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
      { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
      { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
      { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
      { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
      { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
    ],
    routingLabel: 'Routing Number',
    routingPlaceholder: '021000021',
    routingMaxLength: 9,
    postalLabel: 'ZIP Code',
    postalPlaceholder: '10001',
    postalMaxLength: 10,
    phonePlaceholder: '+1 555 000 0000',
    stripeAgreementUrl: 'https://stripe.com/us/legal/connect-account',
  },
  GB: {
    states: [],
    routingLabel: 'Sort Code',
    routingPlaceholder: '00-00-00',
    routingMaxLength: 8,
    postalLabel: 'Postcode',
    postalPlaceholder: 'SW1A 1AA',
    postalMaxLength: 8,
    phonePlaceholder: '+44 7700 000000',
    stripeAgreementUrl: 'https://stripe.com/gb/legal/connect-account',
  },
  NZ: {
    states: [],
    routingLabel: 'Bank Code',
    routingPlaceholder: '01-0001-0000000-00',
    routingMaxLength: 20,
    postalLabel: 'Postcode',
    postalPlaceholder: '1010',
    postalMaxLength: 4,
    phonePlaceholder: '+64 21 000 0000',
    stripeAgreementUrl: 'https://stripe.com/nz/legal/connect-account',
  },
  CA: {
    states: [
      { value: 'AB', label: 'Alberta' }, { value: 'BC', label: 'British Columbia' },
      { value: 'MB', label: 'Manitoba' }, { value: 'NB', label: 'New Brunswick' },
      { value: 'NL', label: 'Newfoundland and Labrador' }, { value: 'NS', label: 'Nova Scotia' },
      { value: 'ON', label: 'Ontario' }, { value: 'PE', label: 'Prince Edward Island' },
      { value: 'QC', label: 'Quebec' }, { value: 'SK', label: 'Saskatchewan' },
      { value: 'NT', label: 'Northwest Territories' }, { value: 'NU', label: 'Nunavut' },
      { value: 'YT', label: 'Yukon' },
    ],
    routingLabel: 'Transit Number',
    routingPlaceholder: '12345-001',
    routingMaxLength: 12,
    postalLabel: 'Postal Code',
    postalPlaceholder: 'M5V 1A1',
    postalMaxLength: 7,
    phonePlaceholder: '+1 416 000 0000',
    stripeAgreementUrl: 'https://stripe.com/ca/legal/connect-account',
  },
}

// Stripe test bank numbers for development
const TEST_BANK_NUMBERS = {
  AU: { routing: '110000', account: '000123456' },
  US: { routing: '110000000', account: '000123456789' },
  GB: { routing: '108800', account: '00012345' },
  NZ: { routing: '01-0001-0000000-00', account: '0000000' },
  CA: { routing: '11000-000', account: '000123456789' },
}

// Detect country from browser timezone
function detectCountryFromTimezone() {
  if (typeof Intl === 'undefined') return 'AU'
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (timezone.startsWith('Australia/')) return 'AU'
    if (timezone.startsWith('Pacific/Auckland') || timezone.startsWith('Pacific/Chatham')) return 'NZ'
    if (timezone.startsWith('Europe/London') || timezone === 'Europe/Belfast') return 'GB'
    if (timezone.startsWith('America/Toronto') || timezone.startsWith('America/Vancouver') ||
        timezone.startsWith('America/Montreal') || timezone.startsWith('America/Edmonton') ||
        timezone.startsWith('America/Winnipeg') || timezone.startsWith('America/Halifax')) return 'CA'
    if (timezone.startsWith('America/')) return 'US'
  } catch {
    // Fallback
  }
  return 'AU'
}

// Check if running in development
function isDev() {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

export default function PaymentsSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [chargesEnabled, setChargesEnabled] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [stripeStatus, setStripeStatus] = useState({
    connected: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    bankLast4: null,
    bankName: null,
    identityVerificationStatus: 'not_required',
    individual: null,
  })

  const [formData, setFormData] = useState({
    // Business details
    businessName: '',
    businessUrl: '',
    // Representative details (business owner)
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    // Address
    addressLine1: '',
    addressLine2: '',
    addressCity: '',
    addressState: '',
    addressPostalCode: '',
    country: 'AU',
    // Bank details
    bankAccountName: '',
    bankRoutingNumber: '',
    bankAccountNumber: '',
  })

  // Identity verification state
  const [documentType, setDocumentType] = useState('drivers_license')
  const [frontFile, setFrontFile] = useState(null)
  const [backFile, setBackFile] = useState(null)
  const [frontPreview, setFrontPreview] = useState(null)
  const [backPreview, setBackPreview] = useState(null)
  const [verificationConfirmed, setVerificationConfirmed] = useState({
    infoMatches: false,
    inColor: false,
    notBlurry: false,
  })
  const [isUploadingVerification, setIsUploadingVerification] = useState(false)

  useEffect(() => {
    fetchStripeStatus()
  }, [])

  const fetchStripeStatus = async () => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments')
      const data = await res.json()

      if (data.charges_enabled) {
        setChargesEnabled(true)
        setStripeStatus({
          connected: true,
          chargesEnabled: data.charges_enabled,
          payoutsEnabled: data.payouts_enabled,
          bankLast4: data.bank_last4,
          bankName: data.bank_name,
          identityVerificationStatus: data.identity_verification_status || 'not_required',
          individual: data.individual || null,
        })
      } else if (data.connected) {
        // Account exists but not fully set up
        setStripeStatus({
          connected: true,
          chargesEnabled: false,
          payoutsEnabled: false,
          bankLast4: null,
          bankName: null,
          identityVerificationStatus: 'not_required',
          individual: null,
        })
      }

      // If we have org details stored, pre-populate the form
      if (data.orgDetails) {
        const country = data.orgDetails.country || detectCountryFromTimezone()
        const isDevMode = isDev()
        const testBank = TEST_BANK_NUMBERS[country]

        setFormData(prev => ({
          ...prev,
          businessName: data.orgDetails.businessName || data.orgDetails.name || '',
          businessUrl: data.orgDetails.businessUrl || '',
          firstName: data.orgDetails.firstName || '',
          lastName: data.orgDetails.lastName || '',
          email: data.orgDetails.email || '',
          phone: data.orgDetails.phone || '',
          dateOfBirth: data.orgDetails.dateOfBirth ? new Date(data.orgDetails.dateOfBirth).toISOString().split('T')[0] : '',
          addressLine1: data.orgDetails.addressLine1 || '',
          addressLine2: data.orgDetails.addressLine2 || '',
          addressCity: data.orgDetails.addressCity || '',
          addressState: data.orgDetails.addressState || '',
          addressPostalCode: data.orgDetails.addressPostalCode || '',
          country: country,
          bankAccountName: data.orgDetails.bankAccountName || '',
          bankRoutingNumber: isDevMode && testBank ? testBank.routing : '',
          bankAccountNumber: isDevMode && testBank ? testBank.account : '',
        }))
      } else {
        // Set default country and test bank numbers for dev
        const country = detectCountryFromTimezone()
        const isDevMode = isDev()
        const testBank = TEST_BANK_NUMBERS[country]

        setFormData(prev => ({
          ...prev,
          country: country,
          bankRoutingNumber: isDevMode && testBank ? testBank.routing : '',
          bankAccountNumber: isDevMode && testBank ? testBank.account : '',
        }))
      }
    } catch (error) {
      console.error('Failed to fetch Stripe status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSetupStripe = async () => {
    if (!acceptedTerms) {
      toast.error('Please accept the Terms of Service')
      return
    }

    setIsSettingUp(true)
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          acceptedTerms: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to setup Stripe')
      }

      toast.success('Stripe account connected successfully!')
      setChargesEnabled(true)
      setStripeStatus({
        connected: true,
        chargesEnabled: true,
        payoutsEnabled: data.payoutsEnabled,
        bankLast4: data.bankLast4,
        bankName: data.bankName,
        identityVerificationStatus: 'required', // Will need verification after setup
        individual: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dob: formData.dateOfBirth ? {
            day: new Date(formData.dateOfBirth).getDate(),
            month: new Date(formData.dateOfBirth).getMonth() + 1,
            year: new Date(formData.dateOfBirth).getFullYear(),
          } : null,
        },
      })

      // Clear sensitive bank details from form
      setFormData(prev => ({
        ...prev,
        bankRoutingNumber: '',
        bankAccountNumber: '',
      }))
    } catch (error) {
      toast.error(error.message || 'Failed to setup Stripe')
    } finally {
      setIsSettingUp(false)
    }
  }

  // Handle file selection for verification
  const handleFileChange = (side, file) => {
    if (!file) return

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      if (side === 'front') {
        setFrontFile(file)
        setFrontPreview(e.target.result)
      } else {
        setBackFile(file)
        setBackPreview(e.target.result)
      }
    }
    reader.readAsDataURL(file)
  }

  // Clear file selection
  const clearFile = (side) => {
    if (side === 'front') {
      setFrontFile(null)
      setFrontPreview(null)
    } else {
      setBackFile(null)
      setBackPreview(null)
    }
  }

  // Reset verification form
  const resetVerificationForm = () => {
    setDocumentType('drivers_license')
    setFrontFile(null)
    setBackFile(null)
    setFrontPreview(null)
    setBackPreview(null)
    setVerificationConfirmed({
      infoMatches: false,
      inColor: false,
      notBlurry: false,
    })
  }

  // Submit verification documents
  const handleSubmitVerification = async () => {
    if (!frontFile) {
      toast.error('Please upload the front of your document')
      return
    }

    if (documentType === 'drivers_license' && !backFile) {
      toast.error('Please upload the back of your driver\'s license')
      return
    }

    if (!verificationConfirmed.infoMatches || !verificationConfirmed.inColor || !verificationConfirmed.notBlurry) {
      toast.error('Please confirm all checkboxes')
      return
    }

    setIsUploadingVerification(true)
    try {
      const formData = new FormData()
      formData.append('documentType', documentType)
      formData.append('front', frontFile)
      if (backFile) {
        formData.append('back', backFile)
      }

      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments/verify', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit verification')
      }

      toast.success('Verification documents submitted! Review usually takes 1-2 business days.')
      resetVerificationForm()

      // Refresh status
      setStripeStatus(prev => ({
        ...prev,
        identityVerificationStatus: 'pending',
      }))
    } catch (error) {
      toast.error(error.message || 'Failed to submit verification')
    } finally {
      setIsUploadingVerification(false)
    }
  }

  // Check if verification form is complete
  const isVerificationFormComplete = () => {
    const hasRequiredFiles = documentType === 'passport' ? !!frontFile : (!!frontFile && !!backFile)
    const allConfirmed = verificationConfirmed.infoMatches && verificationConfirmed.inColor && verificationConfirmed.notBlurry
    return hasRequiredFiles && allConfirmed
  }

  const isFormComplete = () => {
    const config = COUNTRY_CONFIG[formData.country] || COUNTRY_CONFIG.AU
    const needsState = config.states.length > 0

    return (
      formData.businessName &&
      formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.dateOfBirth &&
      formData.addressLine1 &&
      formData.addressCity &&
      (!needsState || formData.addressState) &&
      formData.addressPostalCode &&
      formData.bankRoutingNumber &&
      formData.bankAccountNumber
    )
  }

  const countryConfig = COUNTRY_CONFIG[formData.country] || COUNTRY_CONFIG.AU

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
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
              {chargesEnabled
                ? 'Your Stripe account is connected and ready to accept payments.'
                : 'Complete the form below to set up payment processing.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {chargesEnabled ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Stripe Account Connected
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {stripeStatus.bankLast4
                      ? `Payments will be deposited to account ending in ****${stripeStatus.bankLast4}`
                      : 'Your account is set up to accept payments.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Region & Currency */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-5 w-5" />
                    Region & Currency
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => {
                        handleChange('country', value)
                        handleChange('addressState', '')
                        if (isDev()) {
                          const testBank = TEST_BANK_NUMBERS[value]
                          if (testBank) {
                            handleChange('bankRoutingNumber', testBank.routing)
                            handleChange('bankAccountNumber', testBank.account)
                          }
                        }
                      }}
                    >
                      <SelectTrigger id="country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label} ({country.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Business Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Building2 className="h-5 w-5" />
                    Business Details
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        placeholder="Your Business Name"
                        value={formData.businessName}
                        onChange={(e) => handleChange('businessName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <Label htmlFor="businessUrl">Business Website</Label>
                      <Input
                        id="businessUrl"
                        type="url"
                        placeholder="https://yourbusiness.com"
                        value={formData.businessUrl}
                        onChange={(e) => handleChange('businessUrl', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Representative Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-5 w-5" />
                    Business Owner / Representative
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Details of the person responsible for this account (typically the business owner).
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Smith"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={countryConfig.phonePlaceholder}
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="w-1/2">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Address */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-5 w-5" />
                    Business Address
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addressLine1">Street Address *</Label>
                    <Input
                      id="addressLine1"
                      placeholder="123 Main Street"
                      value={formData.addressLine1}
                      onChange={(e) => handleChange('addressLine1', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addressLine2">Suite / Unit</Label>
                    <Input
                      id="addressLine2"
                      placeholder="Unit 1"
                      value={formData.addressLine2}
                      onChange={(e) => handleChange('addressLine2', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="addressCity">City *</Label>
                      <Input
                        id="addressCity"
                        placeholder="Sydney"
                        value={formData.addressCity}
                        onChange={(e) => handleChange('addressCity', e.target.value)}
                      />
                    </div>
                    {countryConfig.states.length > 0 ? (
                      <div className="space-y-2">
                        <Label htmlFor="addressState">State/Province *</Label>
                        <Select
                          value={formData.addressState}
                          onValueChange={(value) => handleChange('addressState', value)}
                        >
                          <SelectTrigger id="addressState">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {countryConfig.states.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="addressState">County/Region</Label>
                        <Input
                          id="addressState"
                          placeholder="County or region"
                          value={formData.addressState}
                          onChange={(e) => handleChange('addressState', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="w-1/2">
                    <div className="space-y-2">
                      <Label htmlFor="addressPostalCode">{countryConfig.postalLabel} *</Label>
                      <Input
                        id="addressPostalCode"
                        placeholder={countryConfig.postalPlaceholder}
                        value={formData.addressPostalCode}
                        onChange={(e) => handleChange('addressPostalCode', e.target.value)}
                        maxLength={countryConfig.postalMaxLength}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Bank Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CreditCard className="h-5 w-5" />
                    Bank Account for Payouts
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your bank details are securely transmitted to Stripe and not stored on our servers.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountName">Account Holder Name</Label>
                    <Input
                      id="bankAccountName"
                      placeholder="John Smith or Business Name Pty Ltd"
                      value={formData.bankAccountName}
                      onChange={(e) => handleChange('bankAccountName', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use the business name
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankRoutingNumber">{countryConfig.routingLabel} *</Label>
                      <Input
                        id="bankRoutingNumber"
                        placeholder={countryConfig.routingPlaceholder}
                        value={formData.bankRoutingNumber}
                        onChange={(e) => handleChange('bankRoutingNumber', e.target.value)}
                        maxLength={countryConfig.routingMaxLength}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankAccountNumber">Account Number *</Label>
                      <Input
                        id="bankAccountNumber"
                        placeholder="12345678"
                        value={formData.bankAccountNumber}
                        onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Terms Acceptance */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={setAcceptedTerms}
                    />
                    <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <a
                        href={countryConfig.stripeAgreementUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Stripe Connected Account Agreement
                      </a>{' '}
                      and authorize this platform to process payments on my behalf.
                    </label>
                  </div>

                  <Button
                    onClick={handleSetupStripe}
                    disabled={!isFormComplete() || !acceptedTerms || isSettingUp}
                    className="w-full cursor-pointer"
                  >
                    {isSettingUp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up Stripe...
                      </>
                    ) : (
                      'Complete Stripe Setup'
                    )}
                  </Button>

                  {!isFormComplete() && (
                    <p className="text-xs text-muted-foreground text-center">
                      Please fill in all required fields (*) to complete setup
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Identity Verification Card - Only show when Stripe account is connected */}
        {chargesEnabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Identity Verification
              </CardTitle>
              <CardDescription>
                {stripeStatus.identityVerificationStatus === 'verified'
                  ? 'Your identity has been verified'
                  : stripeStatus.identityVerificationStatus === 'pending'
                  ? 'Your verification is being reviewed'
                  : 'Verify your identity to enable payouts'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {stripeStatus.identityVerificationStatus === 'verified' ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Identity Verified
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your payouts are enabled. Payments will be deposited to your bank account.
                    </p>
                  </div>
                </div>
              ) : stripeStatus.identityVerificationStatus === 'pending' ? (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      Verification Pending
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Your documents are being reviewed. This usually takes 1-2 business days.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Info Alert */}
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900 dark:text-amber-100">
                        Verification Required
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        To receive payouts, please upload a government-issued ID (driver&apos;s license or passport).
                      </p>
                    </div>
                  </div>

                  {/* Document Type Selection */}
                  <div className="space-y-3">
                    <Label>Document Type</Label>
                    <Select
                      value={documentType}
                      onValueChange={(value) => {
                        setDocumentType(value)
                        // Clear files when changing document type
                        setFrontFile(null)
                        setBackFile(null)
                        setFrontPreview(null)
                        setBackPreview(null)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drivers_license">Driver&apos;s License</SelectItem>
                        <SelectItem value="passport">Passport</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show legal name that must match */}
                  {stripeStatus.individual && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Photo ID must match these details</p>
                      <p className="font-medium">
                        {stripeStatus.individual.firstName} {stripeStatus.individual.lastName}
                      </p>
                      {stripeStatus.individual.dob && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(stripeStatus.individual.dob.year, stripeStatus.individual.dob.month - 1, stripeStatus.individual.dob.day).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* File Upload Areas */}
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Provide a clear, complete, and uncropped document in JPG, PNG, or PDF format.
                    </p>

                    {/* Front Upload */}
                    <div className="space-y-2">
                      <Label>{documentType === 'passport' ? 'Passport Photo Page' : 'Front of License'}</Label>
                      {frontPreview ? (
                        <div className="relative border rounded-lg overflow-hidden">
                          <Image
                            src={frontPreview}
                            alt="Document front"
                            width={400}
                            height={192}
                            className="w-full h-48 object-contain bg-muted"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 cursor-pointer"
                            onClick={() => clearFile('front')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            className="hidden"
                            id="front-upload"
                            onChange={(e) => handleFileChange('front', e.target.files?.[0])}
                          />
                          <label htmlFor="front-upload" className="cursor-pointer space-y-2">
                            <div className="flex justify-center gap-2">
                              <Camera className="h-6 w-6 text-muted-foreground" />
                              <Upload className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-primary">
                              {documentType === 'passport' ? 'Upload passport' : 'Upload front'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Click to select file
                            </p>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Back Upload - Only for driver's license */}
                    {documentType === 'drivers_license' && (
                      <div className="space-y-2">
                        <Label>Back of License</Label>
                        {backPreview ? (
                          <div className="relative border rounded-lg overflow-hidden">
                            <Image
                              src={backPreview}
                              alt="Document back"
                              width={400}
                              height={192}
                              className="w-full h-48 object-contain bg-muted"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8 cursor-pointer"
                              onClick={() => clearFile('back')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,application/pdf"
                              className="hidden"
                              id="back-upload"
                              onChange={(e) => handleFileChange('back', e.target.files?.[0])}
                            />
                            <label htmlFor="back-upload" className="cursor-pointer space-y-2">
                              <div className="flex justify-center gap-2">
                                <Camera className="h-6 w-6 text-muted-foreground" />
                                <Upload className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <p className="text-sm font-medium text-primary">
                                Upload back
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Click to select file
                              </p>
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Confirmation Checkboxes */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Please confirm the following:</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="infoMatches"
                          checked={verificationConfirmed.infoMatches}
                          onCheckedChange={(checked) =>
                            setVerificationConfirmed((prev) => ({ ...prev, infoMatches: !!checked }))
                          }
                        />
                        <label htmlFor="infoMatches" className="text-sm cursor-pointer">
                          The document shows exactly this information
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="inColor"
                          checked={verificationConfirmed.inColor}
                          onCheckedChange={(checked) =>
                            setVerificationConfirmed((prev) => ({ ...prev, inColor: !!checked }))
                          }
                        />
                        <label htmlFor="inColor" className="text-sm cursor-pointer">
                          The uploaded document is in color
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="notBlurry"
                          checked={verificationConfirmed.notBlurry}
                          onCheckedChange={(checked) =>
                            setVerificationConfirmed((prev) => ({ ...prev, notBlurry: !!checked }))
                          }
                        />
                        <label htmlFor="notBlurry" className="text-sm cursor-pointer">
                          The document is not blurry and is not a photo of a photo
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitVerification}
                    disabled={!isVerificationFormComplete() || isUploadingVerification}
                    className="w-full cursor-pointer"
                  >
                    {isUploadingVerification ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit for Verification'
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

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
