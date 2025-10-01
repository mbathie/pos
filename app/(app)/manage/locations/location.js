'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, CalendarIcon } from 'lucide-react'
import Link from 'next/link'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'

const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export default function LocationForm({ initialData, onSubmit, submitLabel = 'Save' }) {
  const [location, setLocation] = useState(() => ({
    ...initialData,
    closedDays: initialData.closedDays || []
  }))

  const isValid = location.name?.trim() !== '' && location.address1?.trim() !== ''

  const addClosedDay = () => {
    const newClosedDay = {
      name: '',
      startDate: '',
      endDate: ''
    }
    setLocation({ ...location, closedDays: [...location.closedDays, newClosedDay] })
  }

  const removeClosedDay = (index) => {
    const updated = [...location.closedDays]
    updated.splice(index, 1)
    setLocation({ ...location, closedDays: updated })
  }

  const updateClosedDay = (index, field, value) => {
    const updated = [...location.closedDays]
    updated[index][field] = value
    setLocation({ ...location, closedDays: updated })
  }

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
            <Label htmlFor="city">Suburb / Locality</Label>
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
                  value={entry.open || ''}
                  onChange={(e) => {
                    const updated = [...location.storeHours]
                    updated[index].open = e.target.value
                    setLocation({ ...location, storeHours: updated })
                  }}
                  className="w-32"
                />
                <span>to</span>
                <Input
                  type="time"
                  value={entry.close || ''}
                  onChange={(e) => {
                    const updated = [...location.storeHours]
                    updated[index].close = e.target.value
                    setLocation({ ...location, storeHours: updated })
                  }}
                  className="w-32"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Closed Days / Public Holidays</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addClosedDay}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Closed Day
              </Button>
            </div>

            {location.closedDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No closed days added yet</p>
            ) : (
              <div className="space-y-3">
                {location.closedDays.map((closedDay, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 border rounded-md">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Holiday name (e.g., Christmas Day)"
                        value={closedDay.name}
                        onChange={(e) => updateClosedDay(index, 'name', e.target.value)}
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !closedDay.startDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {closedDay.startDate ? dayjs(closedDay.startDate).format('MMM D, YYYY') : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={closedDay.startDate ? new Date(closedDay.startDate) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    updateClosedDay(index, 'startDate', dayjs(date).format('YYYY-MM-DD'))
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !closedDay.endDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {closedDay.endDate ? dayjs(closedDay.endDate).format('MMM D, YYYY') : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={closedDay.endDate ? new Date(closedDay.endDate) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    updateClosedDay(index, 'endDate', dayjs(date).format('YYYY-MM-DD'))
                                  }
                                }}
                                initialFocus
                                disabled={(date) => {
                                  // Disable dates before the start date if start date is set
                                  if (closedDay.startDate) {
                                    return date < new Date(closedDay.startDate);
                                  }
                                  return false;
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeClosedDay(index)}
                      className="cursor-pointer mt-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button disabled={!isValid} onClick={() => onSubmit(location)} className="w-full">
            {submitLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
