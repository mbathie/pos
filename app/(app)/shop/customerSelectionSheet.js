'use client'

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, AlertCircle, ChevronsUpDown } from 'lucide-react'
import { cn } from "@/lib/utils"
import dayjs from 'dayjs'

export default function CustomerSelectionSheet({ 
  open, 
  onOpenChange, 
  onConfirm,
  cart,
  requiresWaiver = false
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState([])
  const [recentCustomers, setRecentCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [checkedItems, setCheckedItems] = useState({
    customer: false,
    dependents: {}
  })
  const [comboboxOpen, setComboboxOpen] = useState(false)

  // Calculate needed slots
  const getNeededSlots = () => {
    const slots = {
      adult: 0,
      minor: 0,
      total: 0
    }
    
    cart.products?.forEach(product => {
      if (['class', 'course', 'general'].includes(product.type)) {
        product.prices?.forEach(price => {
          const qty = price.qty || price.customers?.length || 0
          if (price.minor) {
            slots.minor += qty
          } else {
            slots.adult += qty
          }
          slots.total += qty
        })
      }
    })
    
    return slots
  }

  const slots = getNeededSlots()

  // Fetch recent customers (waiver in last 4 hours)
  useEffect(() => {
    if (!open) {
      // Reset state when closed
      setSearchQuery('')
      setCustomers([])
      setSelectedCustomer(null)
      setCheckedItems({ customer: false, dependents: {} })
      setComboboxOpen(false)
      return
    }

    const fetchRecentCustomers = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (requiresWaiver) {
          params.append('recentWaiver', '1')
        }
        
        const res = await fetch(`/api/customers?${params}`)
        if (res.ok) {
          const data = await res.json()
          setRecentCustomers(data.customers || data || [])
        }
      } catch (error) {
        console.error('Error fetching recent customers:', error)
        setRecentCustomers([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecentCustomers()
  }, [open, requiresWaiver])

  // Search for customers when query changes
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setCustomers([])
      return
    }

    const searchCustomers = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('search', searchQuery.trim())
        if (requiresWaiver) {
          params.append('requiresWaiver', 'true')
        }
        
        const res = await fetch(`/api/customers?${params}`)
        if (res.ok) {
          const data = await res.json()
          setCustomers(data.customers || data || [])
        }
      } catch (error) {
        console.error('Error searching customers:', error)
        setCustomers([])
      } finally {
        setLoading(false)
      }
    }

    const delayedSearch = setTimeout(searchCustomers, 300)
    return () => clearTimeout(delayedSearch)
  }, [searchQuery, requiresWaiver])

  // Handle customer selection
  const handleCustomerSelect = (customerId) => {
    const customer = [...recentCustomers, ...customers].find(c => c._id === customerId)
    if (customer) {
      setSelectedCustomer(customer)
      // Reset checkboxes when switching customers
      setCheckedItems({ customer: false, dependents: {} })
      setComboboxOpen(false)
    }
  }

  // Handle checkbox changes
  const handleCustomerCheck = (checked) => {
    setCheckedItems(prev => ({ ...prev, customer: checked }))
  }

  const handleDependentCheck = (dependentId, checked) => {
    setCheckedItems(prev => ({
      ...prev,
      dependents: { ...prev.dependents, [dependentId]: checked }
    }))
  }

  // Calculate what's been selected
  const getSelectionCount = () => {
    let adultCount = checkedItems.customer ? 1 : 0
    let minorCount = Object.values(checkedItems.dependents).filter(Boolean).length
    return { adultCount, minorCount }
  }

  const { adultCount, minorCount } = getSelectionCount()

  // Handle confirmation
  const handleConfirm = () => {
    if (!selectedCustomer) return

    const selection = {
      customer: checkedItems.customer ? selectedCustomer : null,
      dependents: selectedCustomer.dependents?.filter(dep => 
        checkedItems.dependents[dep._id]
      ) || []
    }

    // Build assignments array for auto-assignment
    const assignments = []
    
    // Add customer if selected
    if (checkedItems.customer) {
      assignments.push({
        customer: selectedCustomer,
        dependent: null,
        isMinor: false
      })
    }
    
    // Add selected dependents
    selection.dependents.forEach(dep => {
      assignments.push({
        customer: selectedCustomer,
        dependent: dep,
        isMinor: true
      })
    })

    onConfirm(assignments)
    onOpenChange(false)
  }

  const getAge = (dob) => {
    if (!dob) return null
    return dayjs().diff(dayjs(dob), 'year')
  }

  const canConfirm = adultCount > 0 || minorCount > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>
            Select Customer{slots.total > 1 ? 's' : ''}
          </SheetTitle>
          <SheetDescription>
            {slots.total === 1 ? (
              slots.minor > 0 
                ? 'Select a parent/guardian for the minor pricing'
                : 'Select a customer for this purchase'
            ) : (
              <>
                Select customers for {slots.total} spot{slots.total !== 1 ? 's' : ''}: {' '}
                {slots.adult > 0 && <>{slots.adult} adult{slots.adult !== 1 ? 's' : ''}</>}
                {slots.adult > 0 && slots.minor > 0 && ', '}
                {slots.minor > 0 && <>{slots.minor} minor{slots.minor !== 1 ? 's' : ''}</>}
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 pt-0 gap-4 flex flex-col">
          {/* Customer Selection Combobox */}
          <div className="space-y-2">
            <Label>Select Customer</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between cursor-pointer"
                >
                  {selectedCustomer ? selectedCustomer.name : "Search or select a customer..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[550px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Search by name, email, or member ID..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {searchQuery.length < 2 
                        ? "Type at least 2 characters to search..."
                        : loading 
                        ? "Searching..." 
                        : "No customers found."}
                    </CommandEmpty>
                    
                    {/* Recent customers */}
                    {recentCustomers.length > 0 && !searchQuery && (
                      <CommandGroup heading="Recent (last 4 hours)">
                        {recentCustomers.map((customer) => (
                          <CommandItem
                            key={customer._id}
                            value={customer._id}
                            onSelect={() => handleCustomerSelect(customer._id)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCustomer?._id === customer._id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs text-muted-foreground">{customer.email}</div>
                            </div>
                            {customer.dependents?.length > 0 && (
                              <Badge variant="secondary" className="text-xs ml-2">
                                {customer.dependents.length} dependent{customer.dependents.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    
                    {/* Search results */}
                    {customers.length > 0 && searchQuery && (
                      <CommandGroup heading="Search results">
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer._id}
                            value={customer._id}
                            onSelect={() => handleCustomerSelect(customer._id)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCustomer?._id === customer._id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs text-muted-foreground">{customer.email}</div>
                            </div>
                            {customer.dependents?.length > 0 && (
                              <Badge variant="secondary" className="text-xs ml-2">
                                {customer.dependents.length} dependent{customer.dependents.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selected Customer Details */}
          {selectedCustomer && (
            <div className="space-y-4">
              {/* Customer info with checkbox */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Customer Details</Label>
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        id="customer"
                        checked={checkedItems.customer}
                        onCheckedChange={handleCustomerCheck}
                        disabled={slots.adult === 0}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="customer" className="font-medium cursor-pointer">
                          {selectedCustomer.name}
                        </Label>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <div>{selectedCustomer.email}</div>
                          {selectedCustomer.phone && <div>{selectedCustomer.phone}</div>}
                          {selectedCustomer.memberId && <div>ID: {selectedCustomer.memberId}</div>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Waiver
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Adult
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dependents with checkboxes */}
              {selectedCustomer.dependents && selectedCustomer.dependents.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Dependents</Label>
                  <div className="space-y-2">
                    {selectedCustomer.dependents.map((dependent, index) => {
                      const age = getAge(dependent.dob)
                      // Use the dependent's _id if available, otherwise use index as fallback
                      const depId = dependent._id || `dep-${index}`
                      
                      return (
                        <div key={depId} className="border rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={depId}
                              checked={checkedItems.dependents[depId] || false}
                              onCheckedChange={(checked) => handleDependentCheck(depId, checked)}
                              disabled={slots.minor === 0}
                            />
                            <Label 
                              htmlFor={depId} 
                              className="flex items-center gap-2 cursor-pointer flex-1"
                            >
                              <span>{dependent.name}</span>
                              {dependent.gender && (
                                <span className="text-xs text-muted-foreground capitalize">
                                  ({dependent.gender})
                                </span>
                              )}
                              {age !== null && (
                                <Badge variant="outline" className="text-xs">
                                  {age} yr{age !== 1 ? 's' : ''} old
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs ml-auto">
                                Minor
                              </Badge>
                            </Label>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* Debug: Show if no dependents */}
              {(!selectedCustomer.dependents || selectedCustomer.dependents.length === 0) && slots.minor > 0 && (
                <div className="text-sm text-muted-foreground">
                  This customer has no registered dependents.
                </div>
              )}

              {/* Selection Summary */}
              <div className="bg-muted rounded-lg p-3">
                <div className="text-sm space-y-1">
                  <div className="font-medium">Selected:</div>
                  <div className="flex gap-4">
                    <span className={adultCount > slots.adult ? 'text-destructive' : ''}>
                      {adultCount} / {slots.adult} adult{slots.adult !== 1 ? 's' : ''}
                    </span>
                    <span className={minorCount > slots.minor ? 'text-destructive' : ''}>
                      {minorCount} / {slots.minor} minor{slots.minor !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {(adultCount > slots.adult || minorCount > slots.minor) && (
                    <div className="text-destructive text-xs mt-2">
                      Too many selections. Please adjust to match required slots.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No customer selected message */}
          {!selectedCustomer && !loading && (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Select a customer to continue
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!canConfirm || adultCount > slots.adult || minorCount > slots.minor}
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}