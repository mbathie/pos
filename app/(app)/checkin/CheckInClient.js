'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { BrowserQRCodeReader } from '@zxing/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Camera, X, CheckCircle, AlertCircle, ArrowRight, Loader2, Clock, User, Calendar, UserCircle } from 'lucide-react'
import { useGlobals } from '@/lib/globals'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"

// Initialize dayjs plugins
dayjs.extend(relativeTime)

export default function CheckInClient() {
  const { employee } = useGlobals()
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [memberIdInput, setMemberIdInput] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [scanStatus, setScanStatus] = useState('idle') // idle, scanning, success, error
  const [cameraError, setCameraError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [org, setOrg] = useState(null)
  const [showAlertDialog, setShowAlertDialog] = useState(false)
  const [alertData, setAlertData] = useState(null)
  const videoRef = useRef(null)
  const codeReaderRef = useRef(null)
  const scanningRef = useRef(true)
  const alertTimeoutRef = useRef(null)

  // Process QR code scan result
  const processCheckIn = useCallback(async (customerId) => {
    if (isProcessing) {
      console.log('Already processing, skipping duplicate scan')
      return
    }

    console.log('Processing check-in for customer ID:', customerId)

    setIsProcessing(true)
    setScanStatus('processing')
    scanningRef.current = false // Stop scanning immediately

    try {
      const res = await fetch('/api/checkin/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ customerId })
      })

      console.log('Check-in response status:', res.status)

      const data = await res.json()
      console.log('Check-in response:', data)
      console.log('Check-in response status field:', data.status)
      console.log('Customer data:', data.customer)
      console.log('Membership details:', data.membershipDetails)

      // Show alert dialog with check-in result
      setAlertData(data)
      setShowAlertDialog(true)

      // Auto-close dialog after 8 seconds for PII protection (except in test mode)
      if (!data.testMode) {
        if (alertTimeoutRef.current) {
          clearTimeout(alertTimeoutRef.current)
        }
        alertTimeoutRef.current = setTimeout(() => {
          setShowAlertDialog(false)
          setAlertData(null)
          setScanStatus('idle')
          setIsProcessing(false)
          scanningRef.current = true
        }, 8000)
      }

      if (data.success) {
        setScanStatus('success')
      } else {
        setScanStatus('idle')
      }

      // Reset processing state after showing dialog
      setTimeout(() => {
        setIsProcessing(false)
        if (!showAlertDialog) {
          scanningRef.current = true
        }
      }, 1000)
    } catch (error) {
      console.error('Check-in error:', error)
      setScanStatus('error')
      setCameraError('Network error. Please try again.')
      setIsProcessing(false)

      setTimeout(() => {
        setCameraError(null)
        setScanStatus('idle')
        scanningRef.current = true
      }, 3000)
    }
  }, [isProcessing])

  // Initialize QR code scanner with front camera for mobile
  useEffect(() => {
    let controls = null
    const startScanning = async () => {
      try {
        setCameraError(null)
        setScanStatus('scanning')

        // Create a new instance of BrowserQRCodeReader
        const codeReader = new BrowserQRCodeReader()
        codeReaderRef.current = codeReader

        // Get available video devices using the correct method
        const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices()

        if (videoInputDevices.length === 0) {
          throw new Error('No camera devices found')
        }

        // Try to find front camera for mobile devices
        const frontCamera = videoInputDevices.find(device =>
          device.label.toLowerCase().includes('front') ||
          device.label.toLowerCase().includes('user') ||
          device.label.toLowerCase().includes('facing front')
        )

        // Use front camera if available, otherwise use first available
        const selectedDeviceId = frontCamera?.deviceId || videoInputDevices[0].deviceId

        console.log('Using camera:', frontCamera ? 'Front camera' : 'Default camera', selectedDeviceId)

        // Start continuous scanning
        controls = await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (!scanningRef.current) {
              return
            }

            if (result) {
              const text = result.getText()
              console.log('QR Code detected:', text)

              // Process the QR code
              if (!isProcessing) {
                setScanResult(text)
                processCheckIn(text)
              }
            }

            if (error && error.message && !error.message.includes('Not found')) {
              // Ignore "Not found" errors which occur when no QR code is visible
              console.log('Scan error:', error.message)
            }
          }
        )
      } catch (err) {
        console.error('Camera initialization error:', err)
        setCameraError(err.message || 'Unable to access camera')
        setScanStatus('error')
      }
    }

    // Only start scanning if not in manual entry mode and we have a video element
    if (!showManualEntry && videoRef.current) {
      startScanning()
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up camera and scanner...')
      scanningRef.current = false

      if (controls) {
        controls.stop()
      }

      if (codeReaderRef.current) {
        console.log('QR scanner stopped')
      }

      // Stop all video tracks
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject
        const tracks = stream.getTracks()
        tracks.forEach(track => {
          track.stop()
          console.log('Camera track stopped:', track.kind)
        })
        videoRef.current.srcObject = null
      }
    }
  }, [showManualEntry, processCheckIn, isProcessing])

  // Fetch organization info
  useEffect(() => {
    async function fetchOrg() {
      try {
        const res = await fetch('/api/orgs')
        if (res.ok) {
          const data = await res.json()
          setOrg(data)
        }
      } catch (error) {
        console.error('Failed to fetch org:', error)
      }
    }
    fetchOrg()
  }, [])

  // Manual entry handler
  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (memberIdInput.trim() && !isProcessing) {
      processCheckIn(memberIdInput.trim())
      setMemberIdInput('')
    }
  }

  const handleCloseAlert = () => {
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current)
    }
    setShowAlertDialog(false)
    setAlertData(null)
    setScanStatus('idle')
    setIsProcessing(false)
    scanningRef.current = true
  }

  // Simplified org logo handling
  const orgLogo = org?.branding?.logo || '/logo.png'

  return (
    <div className="min-h-[calc(100vh-4rem)] relative">
      {/* Alert Dialog for Check-in Result */}
      <AlertDialog open={showAlertDialog} onOpenChange={handleCloseAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {alertData?.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Check-In Successful
                </>
              ) : alertData?.status === 'membership-expired' ? (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Check-In Status
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Check-In Status
                </>
              )}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* Customer Info */}
            <div className="p-4 bg-muted/40 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Customer</span>
              </div>
              <div className="flex items-center gap-4">
                {/* Customer Photo */}
                <div className="flex-shrink-0">
                  {alertData?.customer?.photo ? (
                    <img
                      src={alertData.customer.photo}
                      alt={alertData.customer.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                      <UserCircle className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {/* Customer Details */}
                <div className="flex-1">
                  <p className="font-semibold text-lg">{alertData?.customer?.name}</p>
                  {alertData?.customer?.memberId && (
                    <p className="text-sm text-muted-foreground">ID: {alertData.customer.memberId}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Check-in Result */}
            {alertData?.success ? (
              <div className="space-y-3">
                {/* Class Details if checking into a class */}
                {alertData.product && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">
                              Class Details
                            </p>
                            <p className="font-medium text-green-900 dark:text-green-100">
                              {alertData.product?.name}
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              {alertData.classTime ? dayjs(alertData.classTime).format('M/D/YYYY, h:mm A') : 'N/A'}
                            </p>
                          </div>
                          {alertData.classTime && (
                            <div className="flex items-center gap-1 text-green-700 dark:text-green-300">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {dayjs(alertData.classTime).fromNow()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Membership Check-in if applicable */}
                {alertData.membershipCheckin && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Membership Check-in
                        </p>
                        <p className="font-medium text-green-900 dark:text-green-100">
                          {alertData.membershipCheckin.product}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suspended Membership Warning if checking into class with suspended membership */}
                {alertData.suspendedMembership && (
                  <Alert className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-900 dark:text-orange-100">
                      <div className="space-y-1">
                        <div className="font-semibold">Note: Membership Suspended</div>
                        <div className="text-sm">{alertData.suspendedMembership.product}</div>
                        {alertData.suspendedMembership.suspendedUntil && (
                          <div className="text-xs mt-1">
                            Suspended until: {dayjs(alertData.suspendedMembership.suspendedUntil).format('MMMM D, YYYY')}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    {alertData.testMode && (
                      <span className="font-semibold text-amber-600">[TEST MODE] </span>
                    )}
                    {alertData.status === 'membership-checked-in' ?
                      `Membership check-in successful at ${new Date().toLocaleTimeString()}` :
                      `Successfully checked in at ${new Date().toLocaleTimeString()}`
                    }
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="space-y-3">
                {alertData?.status === 'no-class-in-window' && (
                  <>
                    <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-900 dark:text-amber-100">
                        No class within check-in window (30 minutes before/after class time)
                      </AlertDescription>
                    </Alert>
                    {alertData.nextClass && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Next Class</p>
                        {alertData.nextClass.productName && (
                          <p className="text-sm font-medium text-foreground">{alertData.nextClass.productName}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {dayjs(alertData.nextClass.datetime).format('M/D/YYYY, h:mm A')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ({dayjs(alertData.nextClass.datetime).fromNow()})
                        </p>
                      </div>
                    )}
                  </>
                )}
                {alertData?.status === 'no-scheduled-classes' && (
                  <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-900 dark:text-amber-100">
                      No classes, courses or memberships found
                    </AlertDescription>
                  </Alert>
                )}
                {alertData?.status === 'membership-suspended' && (
                  <Alert className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-900 dark:text-orange-100">
                      <div className="space-y-1">
                        <div className="font-semibold">Membership Suspended</div>
                        {console.log('Rendering suspended membership alert with data:', alertData.membershipDetails || alertData.suspendedMembership)}
                        {(alertData.membershipDetails || alertData.suspendedMembership) && (
                          <div className="text-sm">
                            <div>{(alertData.membershipDetails || alertData.suspendedMembership).product}</div>
                            {(alertData.membershipDetails || alertData.suspendedMembership).suspendedUntil && (
                              <div className="text-xs mt-1">
                                Suspended until: {dayjs((alertData.membershipDetails || alertData.suspendedMembership).suspendedUntil).format('MMMM D, YYYY')}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="text-xs mt-2">
                          Please contact staff if you need to resume your membership early.
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                {alertData?.status === 'membership-expired' && (
                  <Alert className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-900 dark:text-red-100">
                      <div className="space-y-1">
                        <div className="font-semibold">Membership Expired</div>
                        {alertData.membershipDetails && (
                          <div className="text-sm">
                            <div>{alertData.membershipDetails.product}</div>
                            {alertData.membershipDetails.nextBillingDate && (
                              <div className="text-xs mt-1">
                                Expired: {new Date(alertData.membershipDetails.nextBillingDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Auto-close message */}
            {!alertData?.testMode && (
              <p className="text-xs text-center text-muted-foreground">
                This dialog will close automatically in 8 seconds
              </p>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Background Image - Only show if org branding exists */}
      {org?.branding?.checkInBackground && (
        <div className="absolute inset-0 -z-10">
          <Image
            src={org.branding.checkInBackground}
            alt="Background"
            fill
            className="object-cover opacity-20"
            priority
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          {orgLogo && (
            <Image
              src={orgLogo}
              alt={org?.name || 'Logo'}
              width={200}
              height={80}
              className="mb-4"
              priority
            />
          )}
          <h1 className="text-2xl font-bold text-center">{org?.name || 'Fitness Center'}</h1>
          <p className="text-muted-foreground text-center mt-2">
            {org?.tagline || 'Your journey to fitness starts here'}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-card/95 backdrop-blur rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">
              {org?.name || 'Fitness Center'} Check In
            </h2>
            <p className="text-muted-foreground">
              {showManualEntry ? 'Enter your member ID' : 'Hold your QR code up to the camera'}
            </p>
          </div>

          {/* Camera/Manual Entry Section */}
          <div className="bg-background rounded-lg p-4 mb-6">
            {!showManualEntry ? (
              <>
                {/* QR Scanner View */}
                <div className="relative aspect-square max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                  />

                  {/* Scanner overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-lg" />
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/50 -translate-y-1/2 animate-pulse" />
                  </div>

                  {/* Status indicator */}
                  <div className="absolute top-4 left-4 right-4">
                    {scanStatus === 'scanning' && (
                      <div className="bg-background/90 backdrop-blur text-foreground px-3 py-2 rounded-full flex items-center gap-2 text-sm">
                        <Camera className="h-4 w-4 animate-pulse" />
                        Ready to scan
                      </div>
                    )}
                    {scanStatus === 'processing' && (
                      <div className="bg-primary/90 backdrop-blur text-primary-foreground px-3 py-2 rounded-full flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </div>
                    )}
                    {scanStatus === 'success' && (
                      <div className="bg-green-600/90 backdrop-blur text-white px-3 py-2 rounded-full flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        Check-in successful!
                      </div>
                    )}
                    {scanStatus === 'error' && cameraError && (
                      <div className="bg-destructive/90 backdrop-blur text-destructive-foreground px-3 py-2 rounded-full text-sm">
                        {cameraError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Toggle to manual entry */}
                <div className="mt-4 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowManualEntry(true)}
                    className="mt-4"
                  >
                    Enter Member ID Manually
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Manual Entry View */}
                <form onSubmit={handleManualSubmit} className="max-w-sm mx-auto">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="memberId">Member ID</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="memberId"
                          type="text"
                          placeholder="Enter member ID..."
                          value={memberIdInput}
                          onChange={(e) => setMemberIdInput(e.target.value)}
                          disabled={isProcessing}
                          className="flex-1"
                        />
                        <Button
                          type="submit"
                          disabled={!memberIdInput.trim() || isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>

                {/* Toggle back to scanner */}
                <div className="mt-6 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => setShowManualEntry(false)}
                    className="gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Back to QR Scanner
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}