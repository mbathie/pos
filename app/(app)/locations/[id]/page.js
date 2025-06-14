

'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import LocationForm from '../location'
import { useGlobals } from '@/lib/globals'

export default function Page() {
  const { id } = useParams()
  const router = useRouter()
  const [location, setLocation] = useState(null)
  const { pushBreadcrumb } = useGlobals()
  
  useEffect(() => {
    pushBreadcrumb({ name: "Update Location", href: `/locations/${location?._id}` })
  }, []);

  useEffect(() => {
    const fetchLocation = async () => {
      const res = await fetch(`/api/locations/${id}`)
      const data = await res.json()
      setLocation(data)
    }
    fetchLocation()
  }, [id])

  const handleSubmit = async (updatedLocation) => {
    await fetch(`/api/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedLocation)
    })
    router.push('/locations')
  }

  if (!location) return <div className="p-4">Loading...</div>

  return (
    <LocationForm
      initialData={location}
      onSubmit={handleSubmit}
      submitLabel="Update Location"
    />
  )
}