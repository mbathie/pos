'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, CalendarIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import dayjs from 'dayjs'

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const defaultLocation = {
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
  ],
  closedDays: []
}

export function AddLocationSheet({ children, onSuccess }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [location, setLocation] = useState({ ...defaultLocation })

  const isValid = location.name?.trim() !== '' && location.address1?.trim() !== ''

  const resetForm = () => {
    setLocation({
      ...defaultLocation,
      storeHours: defaultLocation.storeHours.map(h => ({ ...h })),
      closedDays: []
    })
  }

  const addClosedDay = () => {
    const newClosedDay = {
      name: '',
      startDate: '',
      endDate: '',
      repeats: 'none'
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

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create location')
      }

      const newLocation = await res.json()
      toast.success('Location created successfully')
      setOpen(false)
      resetForm()
      onSuccess?.(newLocation)
    } catch (error) {
      console.error('Failed to create location:', error)
      toast.error(error.message || 'Failed to create location')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[75vw] sm:max-w-[75vw] overflow-y-auto p-4">
        <SheetHeader>
          <SheetTitle>Add Location</SheetTitle>
          <SheetDescription>
            Create a new store location for your business
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Main Store"
              value={location.name}
              onChange={(e) => setLocation({ ...location, name: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="e.g. 02 1234 5678"
              value={location.phone}
              onChange={(e) => setLocation({ ...location, phone: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="address1">Address Line</Label>
            <Input
              id="address1"
              placeholder="e.g. 123 Main Street"
              value={location.address1}
              onChange={(e) => setLocation({ ...location, address1: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="city">Suburb / Locality</Label>
            <Input
              id="city"
              placeholder="e.g. Sydney"
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
                placeholder="e.g. 2000"
                value={location.postcode}
                onChange={(e) => setLocation({ ...location, postcode: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Store Hours</Label>
            {location.storeHours.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-24 text-sm">{dayNames[entry.d]}</div>
                <Input
                  type="time"
                  value={entry.open || ''}
                  onChange={(e) => {
                    const updated = [...location.storeHours]
                    updated[index].open = e.target.value
                    setLocation({ ...location, storeHours: updated })
                  }}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={entry.close || ''}
                  onChange={(e) => {
                    const updated = [...location.storeHours]
                    updated[index].close = e.target.value
                    setLocation({ ...location, storeHours: updated })
                  }}
                  className="w-28"
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
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`closedDay-name-${index}`}>Name</Label>
                        <Input
                          id={`closedDay-name-${index}`}
                          placeholder="Holiday name (e.g., Christmas Day)"
                          value={closedDay.name}
                          onChange={(e) => updateClosedDay(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <div className="flex-1 min-w-[140px] flex flex-col gap-1">
                          <Label htmlFor={`closedDay-start-${index}`}>Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id={`closedDay-start-${index}`}
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal cursor-pointer",
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
                        <div className="flex-1 min-w-[140px] flex flex-col gap-1">
                          <Label htmlFor={`closedDay-end-${index}`}>End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id={`closedDay-end-${index}`}
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal cursor-pointer",
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
                                  if (closedDay.startDate) {
                                    return date < new Date(closedDay.startDate);
                                  }
                                  return false;
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex-1 min-w-[140px] flex flex-col gap-1">
                          <Label htmlFor={`closedDay-repeats-${index}`}>Repeats</Label>
                          <Select
                            value={closedDay.repeats || 'none'}
                            onValueChange={(value) => updateClosedDay(index, 'repeats', value)}
                          >
                            <SelectTrigger id={`closedDay-repeats-${index}`}>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Does not repeat</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="fortnightly">Fortnightly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
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

          <Button
            disabled={!isValid || saving}
            onClick={handleSubmit}
            className="w-full cursor-pointer"
          >
            {saving ? 'Creating...' : 'Create Location'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
