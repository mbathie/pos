'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import LocationForm from '../location'
import { useGlobals } from '@/lib/globals'

export default function Page() {
  const router = useRouter()
  const { pushBreadcrumb } = useGlobals()
  
  useEffect(() => {
    pushBreadcrumb({ name: "Create Location", href: "/locations/create" })
  }, []);

  const [ location, setLocation ] = useState({
    name: '', phone: '',
    address1: '', city: '', state: '', postcode: '',
    storeHours: [
      { d: 0, open: '', close: '' },
      { d: 1, open: '', close: '' },
      { d: 2, open: '', close: '' },
      { d: 3, open: '', close: '' },
      { d: 4, open: '', close: '' },
      { d: 5, open: '', close: '' },
      { d: 6, open: '', close: '' }
    ]
  })

  const handleSubmit = async (location) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location)
    })
    router.push('/locations')
  }

  if (!location) return <div className="p-4">Loading...</div>

  return (
    <LocationForm
      initialData={location}
      onSubmit={handleSubmit}
      submitLabel="Create Location"
    />
  )
}


// 'use client'
// import React, { useEffect, useState } from 'react'
// import { useGlobals } from '@/lib/globals'

// import { useRouter } from 'next/navigation'

// import { Label } from '@/components/ui/label'
// import { Input } from '@/components/ui/input'
// import {
//   Select, SelectTrigger, SelectValue, SelectContent, SelectItem
// } from '@/components/ui/select'
// import { Button } from '@/components/ui/button'
// import { Card, CardContent } from '@/components/ui/card'

// export default function Page() {
//   const router = useRouter()
//   const { pushBreadcrumb } = useGlobals()
  
//   useEffect(() => {
//     pushBreadcrumb({ name: "Create Location", href: "/locations/create" })
//   }, []);

//   const [location, setLocation] = useState({
//     name: '', phone: '', address1: '', city: '', state: '', postcode: '', 
//     storeHours: [
//       { d: 0, open: "", close: "" },
//       { d: 1, open: "", close: "" },
//       { d: 2, open: "", close: "" },
//       { d: 3, open: "", close: "" },
//       { d: 4, open: "", close: "" },
//       { d: 5, open: "", close: "" },
//       { d: 6, open: "", close: "" },
//     ]
//   })

//   const isValid = location.name.trim() !== '' && location.address1.trim() !== ''

//   const create = async () => {
//     try {
//       await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/locations', {
//         method: 'POST', headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(location)
//       })
//       router.push('/locations')
//     } catch (error) {
//       console.error('Failed to create location:', error)
//     }
//   }

//   return (
//     <div className='mx-4'>

//       <div className='font-semibold mb-2 mr-auto'>Create Location</div>

//       <Card>
//         <CardContent className="space-y-4">
//           <div className="flex flex-col gap-1">
//             <Label htmlFor="name">Name</Label>
//             <Input
//               type="text"
//               id="name"
//               placeholder="Store Name"
//               value={location.name}
//               onChange={(e) => setLocation({ ...location, name: e.target.value })}
//             />
//           </div>

//           <div className="flex flex-col gap-1">
//             <Label htmlFor="phone">Phone</Label>
//             <Input
//               type="text"
//               id="phone"
//               placeholder="1234 567 890"
//               value={location.phone}
//               onChange={(e) => setLocation({ ...location, phone: e.target.value })}
//             />
//           </div>

//           <div className="flex flex-col gap-1">
//             <Label htmlFor="address1">Address</Label>
//             <Input
//               type="text"
//               id="address1"
//               placeholder="123 Main St"
//               value={location.address1}
//               onChange={(e) => setLocation({ ...location, address1: e.target.value })}
//             />
//           </div>

//           <div className="flex flex-col gap-1">
//             <Label htmlFor="city">City</Label>
//             <Input
//               type="text"
//               id="city"
//               placeholder="Sydney"
//               value={location.city}
//               onChange={(e) => setLocation({ ...location, city: e.target.value })}
//             />
//           </div>

//           <div className="flex gap-2">
//             <div className="flex flex-col gap-1 w-full">
//               <Label htmlFor="state">State</Label>
//               <Select value={location.state} onValueChange={(value) => setLocation({ ...location, state: value })}>
//                 <SelectTrigger className="w-full">
//                   <SelectValue placeholder="Select state" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="NSW">NSW</SelectItem>
//                   <SelectItem value="VIC">VIC</SelectItem>
//                   <SelectItem value="QLD">QLD</SelectItem>
//                   <SelectItem value="WA">WA</SelectItem>
//                   <SelectItem value="SA">SA</SelectItem>
//                   <SelectItem value="TAS">TAS</SelectItem>
//                   <SelectItem value="ACT">ACT</SelectItem>
//                   <SelectItem value="NT">NT</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>

//             <div className="flex flex-col gap-1 w-full">
//               <Label htmlFor="postcode">Postcode</Label>
//               <Input
//                 type="text"
//                 id="postcode"
//                 placeholder="2000"
//                 value={location.postcode}
//                 onChange={(e) => setLocation({ ...location, postcode: e.target.value })}
//               />
//             </div>
//           </div>

//           <div className="flex flex-col gap-2">
//             <Label>Store Hours</Label>
//             {location.storeHours.map((entry, index) => (
//               <div key={index} className="flex items-center gap-2">
//                 <div className="w-24 capitalize">{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][entry.d]}</div>
//                 <Input
//                   type="time"
//                   className="w-32"
//                   value={entry.open}
//                   onChange={(e) => {
//                     const updated = [...location.storeHours]
//                     updated[index].open = e.target.value
//                     setLocation({ ...location, storeHours: updated })
//                   }}
//                 />
//                 <span>to</span>
//                 <Input
//                   type="time"
//                   className="w-32"
//                   value={entry.close}
//                   onChange={(e) => {
//                     const updated = [...location.storeHours]
//                     updated[index].close = e.target.value
//                     setLocation({ ...location, storeHours: updated })
//                   }}
//                 />
//               </div>
//             ))}
//           </div>

//           <Button
//             disabled={!isValid}
//             className="w-full"
//             onClick={create}
//           >
//             Create Location
//           </Button>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }