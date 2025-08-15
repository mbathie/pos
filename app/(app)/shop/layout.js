'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGlobals } from '@/lib/globals'
import SimplePinDialog from '@/components/simple-pin-dialog'

export default function ShopLayout({ children }) {
  const [needsPin, setNeedsPin] = useState(false)
  // const [loading, setLoading] = useState(true)
  const { employee } = useGlobals()
  const router = useRouter()

  useEffect(() => {
    checkPinRequirement()
  }, [])

  const checkPinRequirement = async () => {
    const response = await fetch('/api/auth/pin/check')
    const data = await response.json()
    console.log('PIN check result:', data)

    if (!data.hasPinSet)
      setNeedsPin(true)

    // No employee? Redirect to login
    // if (!employee?._id) {
    //   router.push('/login')
    //   return
    // }

    // try {
    //   // Check PIN status from server
    //   const response = await fetch('/api/auth/pin/check')
    //   const data = await response.json()
      
    //   console.log('PIN check result:', data)
      
    //   if (!response.ok) {
    //     console.error('PIN check failed:', data.error)
    //     router.push('/login')
    //     return
    //   }

    //   // Determine if we need PIN entry
    //   if (!data.hasPinSet || data.needsPinEntry) {
    //     setNeedsPin(true)
    //   } else {
    //     setNeedsPin(false)
    //   }
    // } catch (error) {
    //   console.error('Error checking PIN:', error)
    //   router.push('/shop')
    // } finally {
    //   setLoading(false)
    // }
  }

  const handlePinSuccess = () => {
    console.log('PIN successfully entered/set')
    setNeedsPin(false)
    // Refresh the check to update state
    checkPinRequirement()
  }

  const handlePinCancel = () => {
    router.push('/shop')
  }

  // Loading state
  // if (loading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
  //         <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
  //       </div>
  //     </div>
  //   )
  // }

  // Need PIN entry/setup
  if (needsPin) {
    return (
      <SimplePinDialog
        open={true}
        onSuccess={handlePinSuccess}
        onCancel={handlePinCancel}
      />
    )
  }

  // All good, show the shop
  return children
}