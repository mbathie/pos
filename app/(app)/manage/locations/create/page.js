'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LocationForm from '@/components/location-form'
import { toast } from 'sonner'

export default function CreateLocationPage() {
  const router = useRouter()
  const [location] = useState({
    name: '',
    phone: '',
    address1: '',
    city: '',
    state: '',
    postcode: '',
    storeHours: [
      { d: 0, open: "", close: "" },
      { d: 1, open: "", close: "" },
      { d: 2, open: "", close: "" },
      { d: 3, open: "", close: "" },
      { d: 4, open: "", close: "" },
      { d: 5, open: "", close: "" },
      { d: 6, open: "", close: "" },
    ]
  })

  const handleSubmit = async (data) => {
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create location')
      }

      toast.success('Location created successfully')
      router.push('/manage/locations')
    } catch (error) {
      console.error('Failed to create location:', error)
      toast.error(error.message || 'Failed to create location')
    }
  }

  return (
    <LocationForm
      initialData={location}
      onSubmit={handleSubmit}
      submitLabel="Create Location"
    />
  )
}