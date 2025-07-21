'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select'

const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export default function LocationForm({ initialData, onSubmit, submitLabel = 'Save' }) {
  const [location, setLocation] = useState(initialData)

  const isValid = location.name?.trim() !== '' && location.address1?.trim() !== ''

  return (

    <div className='mx-4'>
      <div className='flex items-center mb-2'>
        <div className='font-semibold mb-2 mr-auto'>{location.name}</div>
      </div>

      <Card>
        {/* <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>Enter store details</CardDescription>
        </CardHeader> */}
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={location.name}
              onChange={(e) => setLocation({ ...location, name: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={location.phone}
              onChange={(e) => setLocation({ ...location, phone: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="address1">Address Line</Label>
            <Input
              id="address1"
              value={location.address1}
              onChange={(e) => setLocation({ ...location, address1: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={location.city}
              onChange={(e) => setLocation({ ...location, city: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col gap-1 w-full">
              <Label htmlFor="state">State</Label>
              <Select value={location.state} onValueChange={(value) => setLocation({ ...location, state: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NSW">NSW</SelectItem>
                  <SelectItem value="VIC">VIC</SelectItem>
                  <SelectItem value="QLD">QLD</SelectItem>
                  <SelectItem value="WA">WA</SelectItem>
                  <SelectItem value="SA">SA</SelectItem>
                  <SelectItem value="TAS">TAS</SelectItem>
                  <SelectItem value="ACT">ACT</SelectItem>
                  <SelectItem value="NT">NT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 w-full">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={location.postcode}
                onChange={(e) => setLocation({ ...location, postcode: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Store Hours</Label>
            {location.storeHours.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-24 capitalize">{dayNames[entry.d]}</div>
                <Input
                  type="time"
                  className="w-32"
                  value={entry.open}
                  onChange={(e) => {
                    const updated = [...location.storeHours]
                    updated[index].open = e.target.value
                    setLocation({ ...location, storeHours: updated })
                  }}
                />
                <span>to</span>
                <Input
                  type="time"
                  className="w-32"
                  value={entry.close}
                  onChange={(e) => {
                    const updated = [...location.storeHours]
                    updated[index].close = e.target.value
                    setLocation({ ...location, storeHours: updated })
                  }}
                />
              </div>
            ))}
          </div>

          <Button disabled={!isValid} onClick={() => onSubmit(location)} className="w-full">
            {submitLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
