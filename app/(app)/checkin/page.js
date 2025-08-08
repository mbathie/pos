'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { TypographyLarge, TypographyMuted } from '@/components/ui/typography'
import { ScanLine, Camera, X, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { useGlobals } from '@/lib/globals'

export default function CheckInPage() {
  const { employee } = useGlobals()
  const [showScanner, setShowScanner] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [memberIdInput, setMemberIdInput] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [scanStatus, setScanStatus] = useState('idle') // idle, scanning, success, error
  const [cameraError, setCameraError] = useState(null)
  const [org, setOrg] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  
  // Fetch org data
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/org')
        const data = await res.json()
        setOrg(data.org)
      } catch (error) {
        console.error('Error fetching org:', error)
      }
    }
    fetchOrg()
  }, [])

  // Start camera when scanner is shown
  useEffect(() => {
    console.log('employee', employee)
    if (showScanner) {
      startCamera()
    } else {
      stopCamera()
    }
    
    // Cleanup on unmount
    return () => {
      stopCamera()
    }
  }, [showScanner])

  const startCamera = async () => {
    try {
      setCameraError(null)
      setScanStatus('scanning')
      
      // Request camera access - prefer back camera for scanning
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (error) {
      console.error('Camera error:', error)
      setCameraError('Unable to access camera. Please ensure camera permissions are granted.')
      setScanStatus('error')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const handleScan = () => {
    // Simulate successful scan for UI demo
    setScanResult({
      customerId: '123456',
      customerName: 'John Doe',
      membershipStatus: 'Active',
      checkInTime: new Date().toLocaleTimeString()
    })
    setScanStatus('success')
    setShowScanner(false)
    
    // Reset after 3 seconds
    setTimeout(() => {
      setScanResult(null)
      setScanStatus('idle')
    }, 3000)
  }

  const handleManualEntry = () => {
    setShowManualEntry(!showManualEntry)
    setMemberIdInput('')
  }
  
  const handleManualCheckIn = () => {
    if (!memberIdInput.trim()) return
    
    // Simulate successful check-in for UI demo
    setScanResult({
      customerId: memberIdInput,
      customerName: 'Member',
      membershipStatus: 'Active',
      checkInTime: new Date().toLocaleTimeString()
    })
    setScanStatus('success')
    setShowManualEntry(false)
    setMemberIdInput('')
    
    // Reset after 3 seconds
    setTimeout(() => {
      setScanResult(null)
      setScanStatus('idle')
    }, 3000)
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
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">{org?.name || 'Fitness Center'} Check In</h1>
            <p className="text-muted-foreground mt-2">Scan your member QR code to check-in</p>
          </div>
          {!showScanner ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center mb-8 bg-muted/5">
                  <ScanLine className="h-12 w-12 text-muted-foreground/40" />
                </div>
                
                <div className="w-full space-y-4">
                  <Button 
                    size="lg" 
                    onClick={() => setShowScanner(true)}
                    className="w-full h-12 text-base"
                  >
                    <Camera className="mr-2 h-5 w- 5" />
                    Scan QR Code
                  </Button>
                  
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
                  >
                    Enter Member ID Manually
                  </Button>
                  
                  {/* Animated Manual Entry Input */}
                  <div className={`overflow-hidden transition-all duration-300 ${showManualEntry ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="flex gap-2 pt-2">
                      <Input
                        type="text"
                        placeholder="Enter your member ID..."
                        value={memberIdInput}
                        onChange={(e) => setMemberIdInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleManualCheckIn()
                          }
                        }}
                        className="flex-1 h-12"
                        autoFocus={showManualEntry}
                      />
                      <Button 
                        onClick={handleManualCheckIn}
                        disabled={!memberIdInput.trim()}
                        size="lg"
                        className="h-12 px-4"
                      >
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Camera View */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-white/50 rounded-lg">
                    <div className="w-full h-full border-2 border-white rounded-lg animate-pulse"></div>
                  </div>
                </div>
                
                {/* Close button */}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-4 right-4"
                  onClick={() => setShowScanner(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {cameraError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{cameraError}</AlertDescription>
                </Alert>
              )}
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Position the QR code within the frame to scan
                </p>
                
                {/* Demo scan button */}
                <Button 
                  variant="outline" 
                  onClick={handleScan}
                  disabled={scanStatus === 'error'}
                >
                  Simulate Successful Scan (Demo)
                </Button>
              </div>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div className="mt-6 p-6 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Check-In Successful</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Member Name</Label>
                  <p className="font-medium">{scanResult.customerName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Member ID</Label>
                  <p className="font-mono font-medium">{scanResult.customerId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="font-medium text-green-600">{scanResult.membershipStatus}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Time</Label>
                  <p className="font-medium">{scanResult.checkInTime}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}