'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGlobals } from '@/lib/globals'
import PinDialog from '@/components/pin-dialog'

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
    return null
  }

  // Show PIN dialog if needed
  if (!isAuthenticated && showPinDialog) {
    return (
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
    )
  }

  // Show content if authenticated
  if (isAuthenticated) {
    return children
  }

  // Fallback - should not reach here
  return null
} 