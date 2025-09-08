'use client'

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from "@/components/ui/label"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { X, UserPlus } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import dayjs from 'dayjs'
import { Input } from "@/components/ui/input"

export default function CustomerSelectionSheet({ 
  open, 
  onOpenChange, 
  onConfirm,
  selectedSlot,
  singleSelection = true
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedDependent, setSelectedDependent] = useState(null)
  const [selectedMinors, setSelectedMinors] = useState([]) // [{ customer, dependent }]
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' })
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  // Get slot type (minor or adult)
  const isMinorSlot = selectedSlot?.isMinor || false

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setCustomers([])
      setSelectedCustomer(null)
      setSelectedDependent(null)
      setSelectedMinors([])
      setShowNewCustomer(false)
      setNewCustomer({ name: '', email: '', phone: '' })
    }
  }, [open])

  // Fetch customers when search changes
  useEffect(() => {
    if (!open || !searchQuery) {
      setCustomers([])
      return
    }

    const fetchCustomers = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('search', searchQuery)
        
        const res = await fetch(`/api/customers?${params}`)
        if (res.ok) {
          const data = await res.json()
          // Handle both response formats - array or object with customers property
          const customerList = Array.isArray(data) ? data : (data.customers || data || [])
          setCustomers(customerList)
        }
      } catch (error) {
        console.error('Error fetching customers:', error)
        setCustomers([])
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timer = setTimeout(() => {
      fetchCustomers()
    }, 300)

    return () => clearTimeout(timer)
  }, [open, searchQuery])

  // Create new customer
  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) return
    
    setCreatingCustomer(true)
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      })
      
      if (response.ok) {
        const createdCustomer = await response.json()
        // Select the new customer
        handleSelectCustomer(createdCustomer)
        // Hide the new customer form
        setShowNewCustomer(false)
        setNewCustomer({ name: '', email: '', phone: '' })
      }
    } catch (error) {
      console.error('Error creating customer:', error)
    } finally {
      setCreatingCustomer(false)
    }
  }

  // Handle customer selection
  const handleSelectCustomer = (customer, dependent = null) => {
    setSelectedCustomer(customer)
    setSelectedDependent(dependent)
    // Clear search to hide dropdown
    setSearchQuery('')
    setCustomers([])
  }

  // Handle confirmation
  const handleConfirm = () => {
    // Multi-minor selection flow
    if ((selectedSlot?.isMinor && selectedSlot?.multi) && selectedMinors.length > 0) {
      onConfirm({ minors: selectedMinors })
      onOpenChange(false)
      return
    }

    if (!selectedCustomer) return
    const minors = selectedMinors.length > 0 
      ? selectedMinors 
      : (selectedDependent ? [{ customer: selectedCustomer, dependent: selectedDependent }] : [])
    const selection = {
      customer: selectedCustomer,
      dependent: selectedDependent,
      isMinor: !!selectedDependent,
      minors
    }
    onConfirm(selection)
    onOpenChange(false)
  }

  const getAge = (dob) => {
    if (!dob) return null
    return dayjs().diff(dayjs(dob), 'year')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle>
            Select Customer
          </SheetTitle>
          <SheetDescription>
            {isMinorSlot 
              ? 'Select a minor (dependent) for this slot'
              : 'Select a customer for this slot'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4-">
          {/* Add Customer Section */}
          <div className="space-y-4">
            <Label>Add Customer</Label>
            <Command className="rounded-lg border">
              <CommandInput 
                placeholder="Search or select a customer..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {loading ? (
                  <CommandEmpty>Loading...</CommandEmpty>
                ) : searchQuery && customers.length === 0 ? (
                  <CommandEmpty>
                    No customers found.
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        setNewCustomer({ ...newCustomer, name: searchQuery })
                        setShowNewCustomer(true)
                      }}
                    >
                      <UserPlus className="mr-2 size-4" />
                      Create "{searchQuery}"
                    </Button>
                  </CommandEmpty>
                ) : customers.length > 0 ? (
                  <CommandGroup>
                    {customers.map((customer) => {
                      const age = getAge(customer.dob)
                      const hasValidDependents = customer.dependents?.some(dep => {
                        const depAge = getAge(dep.dob)
                        return depAge && depAge < 18
                      })

                      if (isMinorSlot) {
                        if (!hasValidDependents) return null
                        const parentChecked = selectedCustomer?._id === customer._id
                        return (
                          <div key={customer._id} className="px-3 py-2 border-b">
                            {/* Parent row with checkbox */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={parentChecked}
                                  onCheckedChange={(checked) => {
                                    if (checked) setSelectedCustomer(customer)
                                    else {
                                      setSelectedCustomer(null)
                                      setSelectedMinors([])
                                    }
                                  }}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{customer.name}</span>
                                  <span className="text-xs text-muted-foreground">{customer.email}</span>
                                </div>
                              </div>
                              {customer.waiver?.signed && (
                                <Badge variant="outline" className="text-xs">Waiver ✓</Badge>
                              )}
                            </div>

                            {/* Dependents for this parent */}
                            {customer.dependents?.map((dependent) => {
                              const depAge = getAge(dependent.dob)
                              if (!depAge || depAge >= 18) return null
                              const checked = selectedMinors.some(m => m.dependent?._id === dependent._id)
                              const disabled = selectedSlot?.multi && typeof selectedSlot.remaining === 'number'
                                ? (!checked && selectedMinors.length >= selectedSlot.remaining)
                                : false

                              return (
                                <div key={dependent._id} className="flex items-center justify-between pl-8 py-1">
                                  <div className="flex items-center gap-2">
                                    <span>{dependent.name}</span>
                                    <Badge variant="secondary" className="text-xs">Minor ({depAge}y)</Badge>
                                  </div>
                                  <Checkbox
                                    checked={checked}
                                    disabled={disabled || !parentChecked}
                                    onCheckedChange={(isChecked) => {
                                      setSelectedCustomer(customer) // ensure parent set when selecting
                                      setSelectedMinors(prev => {
                                        if (isChecked) {
                                          if (disabled) return prev
                                          return [...prev, { customer, dependent }]
                                        } else {
                                          return prev.filter(m => m.dependent?._id !== dependent._id)
                                        }
                                      })
                                    }}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        )
                      }

                      // Adult slot search item (unchanged)
                      return (
                        <CommandItem
                          key={customer._id}
                          value={customer.name}
                          onSelect={() => handleSelectCustomer(customer)}
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{customer.name}</span>
                              {customer.waiver?.signed && (
                                <Badge variant="" className="text-xs">Waiver</Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {customer.email} • {customer.memberId ? `#${customer.memberId}` : 'No ID'}
                            </span>
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                ) : null}
              </CommandList>
            </Command>
          </div>

          {/* New Customer Form */}
          {showNewCustomer && (
            <div className="space-y-4 rounded-lg border p-4">
              <h4 className="font-medium">Create New Customer</h4>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateCustomer}
                  disabled={!newCustomer.name || !newCustomer.email || creatingCustomer}
                  className="cursor-pointer"
                >
                  {creatingCustomer ? 'Creating...' : 'Create Customer'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewCustomer(false)
                    setNewCustomer({ name: '', email: '', phone: '' })
                  }}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Selected Customer Display */}
          {selectedCustomer && (
            <div className="space-y-4 rounded-lg border p-4 mt-4">
              {/* <h4 className="font-medium">Selected Customer</h4> */}
              
              {/* Main Customer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={true}
                    disabled
                  />
                  <div>
                    <p className="font-medium">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.email} • {selectedCustomer.memberId ? `#${selectedCustomer.memberId}` : 'No ID'}
                    </p>
                  </div>
                </div>
                {selectedCustomer.waiver?.signed && (
                  <Badge variant="outline" className="text-xs">
                    Waiver ✓
                  </Badge>
                )}
              </div>

              {/* Dependents */}
              {selectedCustomer.dependents?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Dependents</p>
                  {selectedCustomer.dependents.map((dep) => {
                    const depAge = getAge(dep.dob)
                    const isMinor = depAge && depAge < 18
                    
                    if (!isMinor && isMinorSlot) return null // hide adult dependents if in minor-only sheet

                    // In adult mode, allow multi-select minors here to attach dependents too
                    const checked = selectedMinors.some(m => m.dependent?._id === dep._id)
                    return (
                      <div key={dep._id} className="flex items-center gap-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(isChecked) => {
                            setSelectedMinors(prev => {
                              if (isChecked) {
                                return [...prev, { customer: selectedCustomer, dependent: dep }]
                              } else {
                                return prev.filter(m => m.dependent?._id !== dep._id)
                              }
                            })
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{dep.name}</span>
                          {isMinor && (
                            <Badge variant="secondary" className="text-xs">Minor ({depAge}y)</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCustomer(null)
                  setSelectedDependent(null)
                }}
                className="cursor-pointer w-full"
              >
                <X className="size-4 mr-2" />
                Clear Selection
              </Button> */}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 border-t p-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isMinorSlot ? selectedMinors.length === 0 : !selectedCustomer}
            className="cursor-pointer"
          >
            Confirm Selection
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
