'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { BrowserQRCodeReader } from '@zxing/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Camera, X, CheckCircle, AlertCircle, ArrowRight, Loader2, Clock, User, Calendar, UserCircle, CreditCard, Ticket } from 'lucide-react'
import { SelectionCheck } from '@/components/control-button'
import { ProductThumbnail } from '@/components/product-thumbnail'
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

dayjs.extend(relativeTime)

export default function CheckInClient() {
  const { employee } = useGlobals()
  const searchParams = useSearchParams()
  const testMode = searchParams.get('test') === '1'
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [memberIdInput, setMemberIdInput] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [scanStatus, setScanStatus] = useState('idle')
  const [cameraError, setCameraError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [org, setOrg] = useState(null)
  const [showAlertDialog, setShowAlertDialog] = useState(false)
  const [alertData, setAlertData] = useState(null)

  // Unified selection state
  const [unifiedData, setUnifiedData] = useState(null)
  const [selectedClasses, setSelectedClasses] = useState(new Set())
  const [selectedMemberships, setSelectedMemberships] = useState(new Set())
  const [selectedPrepaid, setSelectedPrepaid] = useState({}) // { passCode: Set<productId> }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unifiedResult, setUnifiedResult] = useState(null)

  // Legacy prepaid state (for PP: QR flow)
  const [prepaidProducts, setPrepaidProducts] = useState([])
  const [selectedPrepaidProducts, setSelectedPrepaidProducts] = useState(new Set())
  const [prepaidPassCode, setPrepaidPassCode] = useState(null)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [prepaidResult, setPrepaidResult] = useState(null)

  const videoRef = useRef(null)
  const codeReaderRef = useRef(null)
  const scanningRef = useRef(true)
  const alertTimeoutRef = useRef(null)

  // Count total selected items in unified mode
  const totalSelectedItems = (() => {
    let count = selectedClasses.size + selectedMemberships.size
    for (const products of Object.values(selectedPrepaid)) {
      count += products.size
    }
    return count
  })()

  const processCheckIn = useCallback(async (customerId) => {
    if (isProcessing) return

    setIsProcessing(true)
    setScanStatus('processing')
    scanningRef.current = false

    try {
      const res = await fetch('/api/checkin/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ customerId, ...(testMode && { test: true }) })
      })

      const data = await res.json()

      // Handle PP: prefix prepaid flow (legacy)
      if (data.status === 'prepaid-select') {
        setPrepaidProducts(data.products || [])
        setPrepaidPassCode(data.passCode)
        setAlertData(data)
        setShowAlertDialog(true)
        setScanStatus('idle')
        setIsProcessing(false)
        scanningRef.current = false
        return
      }

      // Handle unified selection
      if (data.status === 'unified-select' || data.status === 'no-products') {
        setUnifiedData(data)
        setAlertData(data)
        setShowAlertDialog(true)

        // Pre-select: if only 1 class (not already checked in), select it
        const availableClasses = (data.classes || []).filter(c => !c.alreadyCheckedIn)
        if (availableClasses.length === 1) {
          setSelectedClasses(new Set([`${availableClasses[0].scheduleId}:${availableClasses[0].locationIndex}:${availableClasses[0].classIndex}`]))
        }

        // Pre-select: if only 1 active membership, select it
        const activeMemberships = (data.memberships || []).filter(m => m.isValid)
        if (activeMemberships.length === 1) {
          setSelectedMemberships(new Set([activeMemberships[0].membershipId]))
        }

        // No auto-close for selection screen
        if (data.status === 'no-products') {
          alertTimeoutRef.current = setTimeout(() => {
            handleCloseAlert()
          }, 8000)
        }

        setScanStatus('idle')
        setIsProcessing(false)
        scanningRef.current = false
        return
      }

      // Handle depleted prepaid
      if (data.status === 'prepaid-depleted') {
        setAlertData(data)
        setShowAlertDialog(true)
        alertTimeoutRef.current = setTimeout(() => {
          handleCloseAlert()
        }, 8000)
        setScanStatus('idle')
        setIsProcessing(false)
        return
      }

      // Fallback for other responses
      setAlertData(data)
      setShowAlertDialog(true)
      alertTimeoutRef.current = setTimeout(() => {
        handleCloseAlert()
      }, 8000)
      setScanStatus(data.success ? 'success' : 'idle')
      setTimeout(() => {
        setIsProcessing(false)
        if (!showAlertDialog) scanningRef.current = true
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
  }, [isProcessing, testMode])

  // Submit unified check-in
  const handleUnifiedSubmit = async () => {
    if (totalSelectedItems === 0 || isSubmitting) return
    setIsSubmitting(true)

    try {
      // Build classes array
      const classesPayload = Array.from(selectedClasses).map(key => {
        const [scheduleId, locationIndex, classIndex] = key.split(':')
        return { scheduleId, locationIndex: parseInt(locationIndex), classIndex: parseInt(classIndex) }
      })

      // Build prepaid redemptions
      const prepaidRedemptions = Object.entries(selectedPrepaid)
        .filter(([, products]) => products.size > 0)
        .map(([passCode, products]) => ({
          passCode,
          productIds: Array.from(products)
        }))

      const res = await fetch('/api/checkin/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: unifiedData.customer._id,
          classes: classesPayload,
          membershipIds: Array.from(selectedMemberships),
          prepaidRedemptions
        })
      })

      const data = await res.json()
      setUnifiedResult(data)

      // Auto-close after showing results
      alertTimeoutRef.current = setTimeout(() => {
        handleCloseAlert()
      }, 5000)
    } catch (error) {
      setUnifiedResult({ success: false, message: 'Network error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Initialize QR code scanner
  useEffect(() => {
    let controls = null
    const startScanning = async () => {
      try {
        setCameraError(null)
        setScanStatus('scanning')

        const codeReader = new BrowserQRCodeReader()
        codeReaderRef.current = codeReader

        const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices()

        if (videoInputDevices.length === 0) {
          throw new Error('No camera devices found')
        }

        const frontCamera = videoInputDevices.find(device =>
          device.label.toLowerCase().includes('front') ||
          device.label.toLowerCase().includes('user') ||
          device.label.toLowerCase().includes('facing front')
        )

        const selectedDeviceId = frontCamera?.deviceId || videoInputDevices[0].deviceId

        controls = await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (!scanningRef.current) return

            if (result) {
              const text = result.getText()
              if (!isProcessing) {
                setScanResult(text)
                processCheckIn(text)
              }
            }

            if (error && error.message && !error.message.includes('Not found')) {
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

    if (!showManualEntry && videoRef.current) {
      startScanning()
    }

    return () => {
      scanningRef.current = false
      if (controls) controls.stop()
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject
        stream.getTracks().forEach(track => track.stop())
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

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (memberIdInput.trim() && !isProcessing) {
      processCheckIn(memberIdInput.trim())
      setMemberIdInput('')
    }
  }

  // Legacy PP: prefix redemption
  const handlePrepaidRedeem = async () => {
    if (selectedPrepaidProducts.size === 0 || isRedeeming) return
    setIsRedeeming(true)
    try {
      const res = await fetch('/api/checkin/prepaid/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          passCode: prepaidPassCode,
          productIds: Array.from(selectedPrepaidProducts)
        })
      })
      const data = await res.json()
      if (data.success) {
        setPrepaidResult(data)
        if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current)
        alertTimeoutRef.current = setTimeout(() => {
          handleCloseAlert()
        }, 5000)
      } else {
        setPrepaidResult({ success: false, message: data.error })
      }
    } catch (error) {
      setPrepaidResult({ success: false, message: 'Network error' })
    } finally {
      setIsRedeeming(false)
    }
  }

  const handleCloseAlert = () => {
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current)
    setShowAlertDialog(false)
    setAlertData(null)
    setScanStatus('idle')
    setIsProcessing(false)
    scanningRef.current = true
    // Reset unified state
    setUnifiedData(null)
    setSelectedClasses(new Set())
    setSelectedMemberships(new Set())
    setSelectedPrepaid({})
    setUnifiedResult(null)
    setIsSubmitting(false)
    // Reset legacy prepaid state
    setPrepaidProducts([])
    setSelectedPrepaidProducts(new Set())
    setPrepaidPassCode(null)
    setPrepaidResult(null)
    setIsRedeeming(false)
  }

  // Toggle prepaid product selection for unified mode
  const togglePrepaidProduct = (passCode, productId, remainingPasses) => {
    setSelectedPrepaid(prev => {
      const next = { ...prev }
      if (!next[passCode]) next[passCode] = new Set()
      else next[passCode] = new Set(next[passCode])

      if (next[passCode].has(productId)) {
        next[passCode].delete(productId)
      } else {
        // Check if adding would exceed remaining
        if (next[passCode].size < remainingPasses) {
          next[passCode].add(productId)
        }
      }
      return next
    })
  }

  const orgLogo = org?.branding?.logo || '/logo.png'

  // Customer info card used in both unified and legacy views
  const CustomerInfoCard = ({ customer }) => (
    <div className="p-4 bg-muted/40 rounded-lg">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {customer?.photo ? (
            <img
              src={customer.photo}
              alt={customer.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted-foreground/10 flex items-center justify-center">
              <UserCircle className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-lg">{customer?.name}</p>
          {customer?.memberId && (
            <p className="text-sm text-muted-foreground">ID: {customer.memberId}</p>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Alert Dialog */}
      <AlertDialog open={showAlertDialog} onOpenChange={handleCloseAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {alertData?.status === 'unified-select' ? (
                <>
                  <User className="h-5 w-5 text-primary" />
                  Check In
                </>
              ) : alertData?.status === 'no-products' ? (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  No Products Found
                </>
              ) : alertData?.status === 'prepaid-select' ? (
                <>
                  <Ticket className="h-5 w-5 text-primary" />
                  Prepaid Pass
                </>
              ) : alertData?.status === 'prepaid-depleted' ? (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Prepaid Pass Depleted
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
            <CustomerInfoCard customer={alertData?.customer} />

            {/* ========== UNIFIED SELECT ========== */}
            {alertData?.status === 'unified-select' && !unifiedResult && (
              <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
                {/* Classes & Courses Section */}
                {unifiedData?.classes?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Classes & Courses</span>
                    </div>
                    <div className="space-y-2">
                      {unifiedData.classes.map((cls) => {
                        const key = `${cls.scheduleId}:${cls.locationIndex}:${cls.classIndex}`
                        const disabled = cls.alreadyCheckedIn
                        return (
                          <div
                            key={key}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted/50'}`}
                            onClick={() => {
                              if (disabled) return
                              setSelectedClasses(prev => {
                                const next = new Set(prev)
                                if (next.has(key)) next.delete(key)
                                else next.add(key)
                                return next
                              })
                            }}
                          >
                            <SelectionCheck
                              checked={disabled || selectedClasses.has(key)}
                              disabled={disabled}
                              onCheckedChange={(checked) => {
                                if (disabled) return
                                setSelectedClasses(prev => {
                                  const next = new Set(prev)
                                  if (checked) next.add(key)
                                  else next.delete(key)
                                  return next
                                })
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{cls.product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {dayjs(cls.datetime).format('M/D/YYYY, h:mm A')}
                              </p>
                            </div>
                            {disabled && (
                              <Badge variant="secondary">Checked In</Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Memberships Section */}
                {unifiedData?.memberships?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Memberships</span>
                    </div>
                    <div className="space-y-2">
                      {unifiedData.memberships.map((m) => {
                        const disabled = !m.isValid
                        return (
                          <div
                            key={m.membershipId}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted/50'}`}
                            onClick={() => {
                              if (disabled) return
                              setSelectedMemberships(prev => {
                                const next = new Set(prev)
                                if (next.has(m.membershipId)) next.delete(m.membershipId)
                                else next.add(m.membershipId)
                                return next
                              })
                            }}
                          >
                            <SelectionCheck
                              checked={selectedMemberships.has(m.membershipId)}
                              disabled={disabled}
                              onCheckedChange={(checked) => {
                                if (disabled) return
                                setSelectedMemberships(prev => {
                                  const next = new Set(prev)
                                  if (checked) next.add(m.membershipId)
                                  else next.delete(m.membershipId)
                                  return next
                                })
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{m.product.name}</p>
                              {m.location && (
                                <p className="text-xs text-muted-foreground">{m.location.name}</p>
                              )}
                            </div>
                            {m.status === 'suspended' ? (
                              <Badge variant="outline">Suspended</Badge>
                            ) : m.isValid ? (
                              <Badge variant="secondary">Active</Badge>
                            ) : (
                              <Badge variant="destructive">Expired</Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Prepaid Passes Section */}
                {unifiedData?.prepaidPasses?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Prepaid Passes</span>
                    </div>
                    <div className="space-y-3">
                      {unifiedData.prepaidPasses.map((pass) => {
                        const currentSelected = selectedPrepaid[pass.passCode]?.size || 0
                        return (
                          <div key={pass.passId} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium">{pass.packName}</p>
                              <span className="text-xs text-muted-foreground">
                                {pass.remainingPasses}/{pass.totalPasses} remaining
                              </span>
                            </div>
                            <div className="space-y-2">
                              {pass.products.map((product) => (
                                <div
                                  key={product._id}
                                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                                  onClick={() => togglePrepaidProduct(pass.passCode, product._id.toString(), pass.remainingPasses)}
                                >
                                  <SelectionCheck
                                    checked={selectedPrepaid[pass.passCode]?.has(product._id.toString()) || false}
                                  />
                                  <span className="text-sm flex-1">{product.name}</span>
                                  <ProductThumbnail
                                    src={product.thumbnail}
                                    alt={product.name}
                                    size="lg"
                                  />
                                </div>
                              ))}
                            </div>
                            {currentSelected > pass.remainingPasses && (
                              <p className="text-sm text-destructive mt-2">
                                Selected {currentSelected} but only {pass.remainingPasses} remaining
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Unified Submit Button */}
            {alertData?.status === 'unified-select' && !unifiedResult && (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleCloseAlert} className="cursor-pointer flex-1">
                  Dismiss
                </Button>
                <Button
                  onClick={handleUnifiedSubmit}
                  disabled={totalSelectedItems === 0 || isSubmitting}
                  className="cursor-pointer flex-1"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
                  ) : (
                    `Check In (${totalSelectedItems} item${totalSelectedItems !== 1 ? 's' : ''})`
                  )}
                </Button>
              </div>
            )}

            {/* Unified Result */}
            {alertData?.status === 'unified-select' && unifiedResult && (
              <div className="space-y-3">
                {unifiedResult.success ? (
                  <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900 dark:text-green-100">
                      {unifiedResult.message}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-destructive/10 border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription>{unifiedResult.message}</AlertDescription>
                  </Alert>
                )}

                {/* Per-item results */}
                {unifiedResult.results && (
                  <div className="space-y-1 text-sm">
                    {unifiedResult.results.classes?.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {r.success ? (
                          <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                        )}
                        <span>{r.product || 'Class'}{r.alreadyCheckedIn ? ' (already checked in)' : ''}</span>
                      </div>
                    ))}
                    {unifiedResult.results.memberships?.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {r.success ? (
                          <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                        )}
                        <span>{r.product || 'Membership'}{r.error ? ` — ${r.error}` : ''}</span>
                      </div>
                    ))}
                    {unifiedResult.results.prepaid?.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {r.success ? (
                          <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                        )}
                        <span>
                          {r.success
                            ? `Redeemed ${r.redeemedProducts?.length} pass${r.redeemedProducts?.length !== 1 ? 'es' : ''} (${r.remainingPasses} left)`
                            : r.error
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleCloseAlert} className="cursor-pointer">
                    Dismiss
                  </Button>
                  <p className="text-xs text-muted-foreground">Auto-closing in 5 seconds</p>
                </div>
              </div>
            )}

            {/* ========== NO PRODUCTS ========== */}
            {alertData?.status === 'no-products' && (
              <div className="space-y-3">
                <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900 dark:text-amber-100">
                    No classes, memberships, or prepaid passes found for this customer.
                  </AlertDescription>
                </Alert>
                <div className="flex flex-col items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleCloseAlert} className="cursor-pointer">
                    Dismiss
                  </Button>
                  <p className="text-xs text-muted-foreground">Auto-closing in 8 seconds</p>
                </div>
              </div>
            )}

            {/* ========== LEGACY PP: PREFIX PREPAID SELECT ========== */}
            {alertData?.status === 'prepaid-select' && !prepaidResult && (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Select products to redeem</p>
                    <p className="text-sm text-muted-foreground">
                      {alertData.remainingPasses} of {alertData.totalPasses} remaining
                    </p>
                  </div>
                  <div className="space-y-2">
                    {prepaidProducts.map((product) => (
                      <label
                        key={product._id}
                        className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedPrepaidProducts.has(product._id.toString())}
                          onCheckedChange={(checked) => {
                            setSelectedPrepaidProducts(prev => {
                              const next = new Set(prev)
                              if (checked) next.add(product._id.toString())
                              else next.delete(product._id.toString())
                              return next
                            })
                          }}
                        />
                        <span className="text-sm font-medium">{product.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedPrepaidProducts.size > alertData.remainingPasses && (
                    <p className="text-sm text-destructive mt-2">
                      Selected {selectedPrepaidProducts.size} but only {alertData.remainingPasses} passes remaining
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCloseAlert} className="cursor-pointer flex-1">
                    Dismiss
                  </Button>
                  <Button
                    onClick={handlePrepaidRedeem}
                    disabled={selectedPrepaidProducts.size === 0 || selectedPrepaidProducts.size > alertData.remainingPasses || isRedeeming}
                    className="cursor-pointer flex-1"
                  >
                    {isRedeeming ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redeeming...</>
                    ) : (
                      `Redeem ${selectedPrepaidProducts.size} Pass${selectedPrepaidProducts.size !== 1 ? 'es' : ''}`
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Legacy Prepaid Result */}
            {alertData?.status === 'prepaid-select' && prepaidResult && (
              <div className="space-y-3">
                {prepaidResult.success ? (
                  <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900 dark:text-green-100">
                      {prepaidResult.message}
                      <div className="text-sm mt-1">
                        {prepaidResult.remainingPasses} passes remaining
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-destructive/10 border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription>{prepaidResult.message}</AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-col items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleCloseAlert} className="cursor-pointer">
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* Legacy Prepaid Depleted */}
            {alertData?.status === 'prepaid-depleted' && (
              <div className="space-y-3">
                <Alert className="bg-destructive/10 border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription>
                    This prepaid pass has been fully used. All passes have been redeemed.
                  </AlertDescription>
                </Alert>
                <div className="flex flex-col items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleCloseAlert} className="cursor-pointer">
                    Dismiss
                  </Button>
                  <p className="text-xs text-muted-foreground">Auto-closing in 8 seconds</p>
                </div>
              </div>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>

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
            <h2 className="text-4xl font-bold mb-2">{org?.name || 'Marks Gyms'}</h2>
            <p className="text-lg opacity-90">Your journey to fitness starts here</p>
          </div>
        </div>
      </div>

      {/* Right side - Check-in functionality */}
      <div className="flex-1 flex items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">{org?.name || 'Marks Gyms'} Check In</h1>
            <p className="text-muted-foreground mt-2">
              {showManualEntry ? 'Enter your member ID' : 'Hold your QR code up to the camera'}
            </p>
          </div>

          {!showManualEntry ? (
            <>
              <div className="relative">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 md:w-64 md:h-64 border-2 border-white/50 rounded-lg">
                      <div className="w-full h-full border-2 border-white rounded-lg animate-pulse"></div>
                    </div>
                  </div>

                  {scanStatus === 'scanning' && !isProcessing && (
                    <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Ready to scan
                    </div>
                  )}

                  {isProcessing && (
                    <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </div>
                  )}

                  {scanStatus === 'error' && cameraError && (
                    <div className="absolute top-4 left-4 bg-red-600/90 text-white px-3 py-1 rounded-full text-sm">
                      {cameraError}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <div className="relative my-4">
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
                  className="cursor-pointer"
                >
                  Enter Member ID Manually
                </Button>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handleManualSubmit} className="space-y-4">
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
                      className="cursor-pointer"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </form>

              <div className="text-center mt-6">
                <Button
                  variant="ghost"
                  onClick={() => setShowManualEntry(false)}
                  className="gap-2 cursor-pointer"
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
  )
}
