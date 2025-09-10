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

export default function CheckInPage() {
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
  
  // Fetch org data
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/orgs')
        const data = await res.json()
        setOrg(data.org)
      } catch (error) {
        console.error('Error fetching org:', error)
      }
    }
    fetchOrg()
  }, [])

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
        body: JSON.stringify({ customerId })
      })
      
      console.log('Check-in response status:', res.status)
      
      const data = await res.json()
      console.log('Check-in response:', data)
      
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
            if (result && scanningRef.current) {
              const text = result.getText()
              console.log('QR Code scanned:', text)
              
              // Immediately stop scanning to prevent duplicates
              scanningRef.current = false
              
              // Process the customer ID from QR code
              processCheckIn(text)
            }
            
            if (error && error.name !== 'NotFoundException') {
              // Don't log NotFoundExceptions as they're normal when no QR code is in view
            }
          }
        )
      } catch (error) {
        console.error('Camera initialization error:', error)
        setCameraError('Unable to access camera. Please ensure camera permissions are granted.')
        setScanStatus('error')
      }
    }
    
    startScanning()
    
    // Cleanup function
    return () => {
      console.log('Cleaning up camera and scanner...')
      
      // Stop the QR code reader controls
      if (controls) {
        try {
          controls.stop()
          console.log('QR scanner stopped')
        } catch (err) {
          console.error('Error stopping QR scanner:', err)
        }
      }
      
      // Stop all video tracks to release camera
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject
        const tracks = stream.getTracks()
        tracks.forEach(track => {
          track.stop()
          console.log('Camera track stopped:', track.kind)
        })
        videoRef.current.srcObject = null
      }
      
      // Reset the code reader reference
      codeReaderRef.current = null
      scanningRef.current = false
    }
  }, [processCheckIn, isProcessing])

  const handleManualEntry = () => {
    setShowManualEntry(!showManualEntry)
    setMemberIdInput('')
  }
  
  const handleManualCheckIn = async () => {
    if (!memberIdInput.trim() || isProcessing) return
    
    scanningRef.current = false
    await processCheckIn(memberIdInput.trim())
    setShowManualEntry(false)
    setMemberIdInput('')
  }
  
  // Test check-in function (dev only)
  const handleTestCheckIn = async () => {
    if (isProcessing) return
    
    console.log('Running test check-in...')
    setIsProcessing(true)
    setScanStatus('processing')
    
    try {
      const res = await fetch('/api/checkin/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId: '686724d857a1608855983071',
          test: true // Special test flag
        })
      })
      
      const data = await res.json()
      console.log('Test check-in response:', data)
      
      // Show alert dialog with check-in result
      setAlertData(data)
      setShowAlertDialog(true)
      
      // Don't auto-close in test mode
      // Test mode is already set in the response, so no timeout needed
      
      if (data.success) {
        setScanStatus('success')
      } else {
        setScanStatus('idle')
      }
      
      setTimeout(() => {
        setIsProcessing(false)
      }, 1000)
    } catch (error) {
      console.error('Test check-in error:', error)
      setScanStatus('error')
      setCameraError('Test check-in failed')
      setIsProcessing(false)
      
      setTimeout(() => {
        setCameraError(null)
        setScanStatus('idle')
      }, 3000)
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left side - Image (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative m-4 rounded-lg overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1564769662533-4f00a87b4056?q=80&w=2070"
          alt="Woman bouldering in climbing gym"
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex items-center p-12 text-white">
          <div>
            <h2 className="text-4xl font-bold mb-2">{org?.name || 'Fitness Center'}</h2>
            <p className="text-lg opacity-90">Your journey to fitness starts here</p>
          </div>
        </div>
      </div>

      {/* Right side - Check-in functionality */}
      <div className="flex-1 flex items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">{org?.name || 'Fitness Center'} Check In</h1>
            <p className="text-muted-foreground mt-2">Hold your QR code up to the camera</p>
          </div>

          {/* Camera View - Always On */}
          <div className="relative">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]" // Mirror for front camera
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 md:w-64 md:h-64 border-2 border-white/50 rounded-lg">
                  <div className="w-full h-full border-2 border-white rounded-lg animate-pulse"></div>
                </div>
              </div>
              
              {/* Status indicator */}
              {scanStatus === 'scanning' && !isProcessing && (
                <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Ready to scan
                </div>
              )}
              
              {isProcessing && (
                <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processing...
                </div>
              )}
            </div>
            
            {cameraError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            )}
            
            {/* Manual Entry Option */}
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleManualEntry}
                className="w-full h-12 text-base"
                disabled={isProcessing}
              >
                Enter Member ID Manually
              </Button>
              
              {/* Animated Manual Entry Input */}
              <div className={`overflow-hidden transition-all duration-300 ${showManualEntry ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="flex gap-2 pt-2">
                  <Input
                    type="text"
                    placeholder="Enter member ID..."
                    value={memberIdInput}
                    onChange={(e) => setMemberIdInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleManualCheckIn()
                      }
                    }}
                    className="flex-1 h-12"
                    autoFocus={showManualEntry}
                    disabled={isProcessing}
                  />
                  <Button 
                    onClick={handleManualCheckIn}
                    disabled={!memberIdInput.trim() || isProcessing}
                    size="lg"
                    className="h-12 px-4"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Test Button - Only visible in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                <p className="text-xs text-muted-foreground text-center mb-2">Development Only</p>
                <Button 
                  onClick={handleTestCheckIn}
                  disabled={isProcessing}
                  variant="secondary"
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing Test Check-in...
                    </>
                  ) : (
                    'Test Check-in (Mark - 686724d857a1608855983071)'
                  )}
                </Button>
              </div>
            )}
          </div>

        </div>
      </div>
      
      {/* Alert Dialog for Check-in Results */}
      <AlertDialog open={showAlertDialog} onOpenChange={(open) => {
        setShowAlertDialog(open)
        // If manually closing (especially in test mode), reset states
        if (!open) {
          if (alertTimeoutRef.current) {
            clearTimeout(alertTimeoutRef.current)
          }
          setScanStatus('idle')
          setIsProcessing(false)
          scanningRef.current = true
        }
      }}>
        <AlertDialogContent className="max-w-md">
          {alertData && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  {alertData.success ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      {alertData.testMode ? 'Test Check-In Successful' : 'Check-In Successful'}
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
                      {alertData.customer?.photo ? (
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
                      <p className="font-semibold text-lg">{alertData.customer?.name}</p>
                      {alertData.customer?.memberId && (
                        <p className="text-sm text-muted-foreground">ID: {alertData.customer.memberId}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Check-in Result */}
                {alertData.success ? (
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
                    {alertData.status === 'no-class-in-window' && (
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
                    {alertData.status === 'no-scheduled-classes' && (
                      <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-900 dark:text-amber-100">
                          No classes, courses or memberships found
                        </AlertDescription>
                      </Alert>
                    )}
                    {alertData.status === 'membership-expired' && (
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
                
                {/* Auto-close warning - not shown in test mode */}
                {!alertData.testMode && (
                  <p className="text-xs text-center text-muted-foreground">
                    This dialog will close automatically in 8 seconds
                  </p>
                )}
              </div>
              
              {/* Continue button - only shown in test mode */}
              {alertData.testMode && (
                <AlertDialogFooter>
                  <Button 
                    onClick={() => setShowAlertDialog(false)}
                    className="w-full"
                  >
                    Continue
                  </Button>
                </AlertDialogFooter>
              )}
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}