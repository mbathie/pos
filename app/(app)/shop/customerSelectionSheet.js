'use client'

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, AlertCircle, ChevronsUpDown, X } from 'lucide-react'
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
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [checkedItems, setCheckedItems] = useState({})
  const [comboboxOpen, setComboboxOpen] = useState(false)

  // Calculate needed slots and check if we have shop items
  const getNeededSlots = () => {
    const slots = {
      adult: 0,
      minor: 0,
      total: 0,
      hasShopItems: false
    }
    
    cart.products?.forEach(product => {
      if (['class', 'course', 'general', 'membership'].includes(product.type)) {
        product.prices?.forEach(price => {
          const qty = price.qty || price.customers?.length || 0
          if (price.minor) {
            slots.minor += qty
          } else {
            slots.adult += qty
          }
          slots.total += qty
        })
      } else if (product.type === 'shop' || !product.type) {
        slots.hasShopItems = true
      }
    })
    
    return slots
  }

  const slots = getNeededSlots()
  const isShopOnly = slots.hasShopItems && slots.total === 0

  // Fetch recent customers (waiver in last 4 hours)
  useEffect(() => {
    if (!open) {
      // Reset state when closed
      setSearchQuery('')
      setCustomers([])
      setSelectedCustomers([])
      setCheckedItems({})
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

  // Handle customer selection - append to list instead of replace
  const handleCustomerSelect = (customerId) => {
    const customer = [...recentCustomers, ...customers].find(c => c._id === customerId)
    if (customer && !selectedCustomers.find(c => c._id === customerId)) {
      setSelectedCustomers(prev => [...prev, customer])
      // Initialize checkbox state for this customer
      setCheckedItems(prev => ({
        ...prev,
        [customerId]: { customer: true, dependents: {} }
      }))
      setComboboxOpen(false)
      setSearchQuery('')
    }
  }

  // Remove a customer from selection
  const handleRemoveCustomer = (customerId) => {
    setSelectedCustomers(prev => prev.filter(c => c._id !== customerId))
    setCheckedItems(prev => {
      const updated = { ...prev }
      delete updated[customerId]
      return updated
    })
  }

  // Handle checkbox changes
  const handleCustomerCheck = (customerId, checked) => {
    setCheckedItems(prev => ({
      ...prev,
      [customerId]: { ...prev[customerId], customer: checked }
    }))
  }

  const handleDependentCheck = (customerId, dependentId, checked) => {
    setCheckedItems(prev => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        dependents: { ...prev[customerId].dependents, [dependentId]: checked }
      }
    }))
  }

  // Calculate what's been selected across all customers
  const getSelectionCount = () => {
    let adultCount = 0
    let minorCount = 0
    
    Object.entries(checkedItems).forEach(([customerId, items]) => {
      if (items.customer) adultCount++
      minorCount += Object.values(items.dependents || {}).filter(Boolean).length
    })
    
    return { adultCount, minorCount }
  }

  const { adultCount, minorCount } = getSelectionCount()

  // Handle confirmation
  const handleConfirm = () => {
    if (selectedCustomers.length === 0) return

    // Build assignments array for auto-assignment
    const assignments = []
    
    selectedCustomers.forEach(customer => {
      const items = checkedItems[customer._id]
      if (!items) return
      
      // For minor-only pricing, don't add the parent as an assignment
      // They're just the guardian/payer, not a participant
      const isMinorOnlyPricing = slots.minor > 0 && slots.adult === 0
      
      // Add customer if selected (but not for minor-only pricing)
      if (items.customer && !isMinorOnlyPricing) {
        assignments.push({
          customer: customer,
          dependent: null,
          isMinor: false
        })
      }
      
      // Add selected dependents
      if (items.dependents) {
        customer.dependents?.forEach(dep => {
          if (items.dependents[dep._id]) {
            assignments.push({
              customer: customer, // This is the parent/guardian who will be stored
              dependent: dep, // This is the minor who is actually taking the class
              isMinor: true
            })
          }
        })
      }
    })

    onConfirm(assignments)
    onOpenChange(false)
  }

  const getAge = (dob) => {
    if (!dob) return null
    return dayjs().diff(dayjs(dob), 'year')
  }

  // For minor pricing, we need at least one parent selected along with the minor
  const needsParentForMinor = slots.minor > 0 && slots.adult === 0
  const canConfirm = needsParentForMinor 
    ? (adultCount > 0 && minorCount > 0) // Need both parent and minor
    : (adultCount > 0 || minorCount > 0) // Need at least one of either

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>
            Select Customer{slots.total > 1 ? 's' : ''}
          </SheetTitle>
          <SheetDescription>
            {isShopOnly ? (
              'Select a customer for this purchase'
            ) : slots.total === 0 ? (
              'Select a customer'
            ) : slots.total === 1 && slots.minor > 0 ? (
              'Select a parent/guardian for the minor pricing'
            ) : (
              'Select a customer for this purchase'
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 pt-0 gap-4 flex flex-col">
          {/* Customer Selection Combobox */}
          <div className="space-y-2">
            <Label>Add Customer</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between cursor-pointer"
                >
                  {"Search or select a customer..."}
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
                                selectedCustomers.find(c => c._id === customer._id) ? "opacity-100" : "opacity-0"
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
                                selectedCustomers.find(c => c._id === customer._id) ? "opacity-100" : "opacity-0"
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
          {selectedCustomers.length > 0 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Selected Customers</Label>
              
              {selectedCustomers.map((customer) => (
                <div key={customer._id} className="space-y-3 border rounded-lg p-4">
                  {/* Customer info with checkbox */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        id={`customer-${customer._id}`}
                        checked={checkedItems[customer._id]?.customer || false}
                        onCheckedChange={(checked) => handleCustomerCheck(customer._id, checked)}
                        disabled={!isShopOnly && slots.adult === 0}
                      />
                      <div className="space-y-1">
                        <Label htmlFor={`customer-${customer._id}`} className="font-medium cursor-pointer">
                          {customer.name}
                        </Label>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <div>{customer.email}</div>
                          {customer.phone && <div>{customer.phone}</div>}
                          {customer.memberId && <div>ID: {customer.memberId}</div>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveCustomer(customer._id)}
                        className="cursor-pointer h-6 w-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Badge variant="outline" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Waiver
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Adult
                      </Badge>
                    </div>
                  </div>

                  {/* Dependents with checkboxes */}
                  {customer.dependents && customer.dependents.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">Dependents</Label>
                      {customer.dependents.map((dependent, index) => {
                        const age = getAge(dependent.dob)
                        // Use the dependent's _id if available, otherwise use index as fallback
                        const depId = dependent._id || `dep-${index}`
                        
                        return (
                          <div key={depId} className="flex items-center gap-3">
                            <Checkbox
                              id={`${customer._id}-${depId}`}
                              checked={checkedItems[customer._id]?.dependents?.[depId] || false}
                              onCheckedChange={(checked) => handleDependentCheck(customer._id, depId, checked)}
                              disabled={!isShopOnly && slots.minor === 0}
                            />
                            <div className="flex items-center justify-between flex-1">
                              <Label 
                                htmlFor={`${customer._id}-${depId}`} 
                                className="flex items-center gap-2 cursor-pointer text-sm"
                              >
                                <span>{dependent.name}</span>
                                {dependent.gender && (
                                  <span className="text-xs text-muted-foreground capitalize">
                                    ({dependent.gender})
                                  </span>
                                )}
                                {age !== null && (
                                  <span className="text-xs text-muted-foreground">
                                    {age} yr{age !== 1 ? 's' : ''} old
                                  </span>
                                )}
                              </Label>
                              <Badge variant="secondary" className="text-xs">
                                Minor
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No customer selected message */}
          {selectedCustomers.length === 0 && !loading && (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Search and add customers to continue
              </p>
            </div>
          )}

          {/* Helper message for minor pricing */}
          {needsParentForMinor && minorCount > 0 && adultCount === 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                Please also select the parent/guardian (check the box next to their name)
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!canConfirm || (!isShopOnly && !needsParentForMinor && (adultCount > slots.adult || minorCount > slots.minor))}
              className="cursor-pointer"
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}