'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGlobals } from '@/lib/globals'
import PinDialog from '@/components/pin-dialog'
import { Loader2 } from 'lucide-react'

export default function ShopLayout({ children }) {
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const { employee } = useGlobals()
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    if (!employee?._id) {
      router.push('/login')
      return
    }

    // Check if PIN authentication is required
    const pinAuth = employee.pinAuth
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    console.log('Shop layout auth check:', { 
      hasEmployee: !!employee?._id,
      hasPinAuth: !!pinAuth,
      pinAuthExpired: pinAuth ? new Date(pinAuth) < fiveMinutesAgo : 'no pinAuth',
      employeePin: employee?.pin
    })

    // If no pinAuth or it's older than 5 minutes, require PIN
    if (!pinAuth || new Date(pinAuth) < fiveMinutesAgo) {
      setShowPinDialog(true)
      setIsAuthenticated(false)
    } else {
      setIsAuthenticated(true)
    }
    setIsChecking(false)
  }, [employee, router])

  const handlePinSuccess = (data) => {
    console.log('PIN success callback:', { data, pinAuth: data?.pinAuth })
    setShowPinDialog(false)
    setIsAuthenticated(true)
    console.log('PIN authenticated successfully:', data.sameEmployee ? 'same employee' : 'employee switched')
  }

  const handlePinCancel = () => {
    // Redirect back to dashboard if user cancels PIN entry
    router.push('/dashboard')
  }

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show PIN dialog if needed
  if (!isAuthenticated && showPinDialog) {
    return (
      <>
        <div className="min-h-screen bg-background">
          <PinDialog
            open={showPinDialog}
            onOpenChange={(open) => {
              if (!open) {
                handlePinCancel()
              }
              setShowPinDialog(open)
            }}
            onSuccess={handlePinSuccess}
          />
        </div>
      </>
    )
  }

  // Show content if authenticated
  if (isAuthenticated) {
    return children
  }

  // Fallback loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
} 