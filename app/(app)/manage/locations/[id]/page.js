

'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import LocationForm from '@/app/(app)/manage/locations/location'
import { useGlobals } from '@/lib/globals'

export default function Page() {
  const { id } = useParams()
  const router = useRouter()
  const [location, setLocation] = useState(null)
  const { pushBreadcrumb, setLocations, location: currentLocation, setLocation: setCurrentLocation } = useGlobals()
  
  useEffect(() => {
    pushBreadcrumb({ name: "Update Location", href: `/locations/${location?._id}` })
  }, []);

  useEffect(() => {
    const fetchLocation = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${id}`)
      const data = await res.json()
      
      // Reorder storeHours to display Monday-Sunday (1,2,3,4,5,6,0)
      if (data.storeHours && data.storeHours.length === 7) {
        const reordered = [];
        // Add Monday through Saturday (days 1-6)
        for (let d = 1; d <= 6; d++) {
          const dayData = data.storeHours.find(h => h.d === d) || { d, open: '', close: '' };
          reordered.push(dayData);
        }
        // Add Sunday (day 0) at the end
        const sundayData = data.storeHours.find(h => h.d === 0) || { d: 0, open: '', close: '' };
        reordered.push(sundayData);
        
        data.storeHours = reordered;
      }
      
      setLocation(data)
    }
    fetchLocation()
  }, [id])

  const handleSubmit = async (updatedLocation) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedLocation)
    })
    
    if (res.ok) {
      // Refresh the global locations list
      const locationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations`)
      if (locationsRes.ok) {
        const allLocations = await locationsRes.json()
        setLocations(allLocations)
        
        // If the updated location is the current location, update it too
        if (currentLocation && currentLocation._id === id) {
          const updatedCurrentLocation = allLocations.find(loc => loc._id === id)
          if (updatedCurrentLocation) {
            setCurrentLocation(updatedCurrentLocation)
          }
        }
      }
    }
    
    router.push('/manage/locations')
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