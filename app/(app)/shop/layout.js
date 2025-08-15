'use client'
import { useEffect, useState } from 'react'
// import { useRouter } from 'next/navigation'
// import { useGlobals } from '@/lib/globals'
import PinDialogSet from '@/components/pin-dialog-set'
import PinDialogEntry from '@/components/pin-dialog-entry'

export default function ShopLayout({ children }) {
  const [needsPinSet, setNeedsPinSet] = useState(false)   
  const [needsPinEntry, setNeedsPinEntry] = useState(false)
  // const [loading, setLoading] = useState(true)
  // const { employee } = useGlobals()
  // const router = useRouter()

  useEffect(() => {
    checkPinRequirement()
  }, [])

  const checkPinRequirement = async () => {
    console.log('Checking PIN requirement')
    const response = await fetch('/api/auth/pin/status')
    const data = await response.json()
    console.log('PIN check result:', data)

    if (!data.hasPinSet)
      setNeedsPinSet(true)
    if (data.needsPinEntry)
      setNeedsPinEntry(true)

  }

  // Need PIN entry/setup
  if (needsPinSet) {
    return (
      <PinDialogSet
        open={true}
      />
    )
  }
  else if (needsPinEntry) {
    return (
      <PinDialogEntry
        open={true}
        onOpenChange={() => setNeedsPinEntry(false)}
        onSuccess={() => {
          setNeedsPinEntry(false)
          // window.location.reload() // Reload to refresh the shop
        }}
      />
    )
  }

  // All good, show the shop
  return children
}