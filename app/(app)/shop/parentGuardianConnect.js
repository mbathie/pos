'use client'

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Search, User, Users, Check, AlertCircle } from 'lucide-react'
import dayjs from 'dayjs'

export default function ParentGuardianConnect({ 
  open, 
  onOpenChange, 
  onSelectCustomer,
  priceInfo // { name, isMinor, productName }
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedDependent, setSelectedDependent] = useState(null)

  // Search for customers with completed waivers
  useEffect(() => {
    if (!open) {
      // Reset state when closed
      setSearchQuery('')
      setCustomers([])
      setSelectedCustomer(null)
      setSelectedDependent(null)
      return
    }

    const searchCustomers = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim())
        }
        params.append('requiresWaiver', 'true') // Only customers with completed waivers
        
        const res = await fetch(`/api/customers?${params}`)
        if (res.ok) {
          const data = await res.json()
          // Filter to only show customers with dependents if this is a minor price
          const filteredCustomers = priceInfo?.isMinor 
            ? (data.customers || data).filter(c => c.dependents?.length > 0)
            : (data.customers || data)
          setCustomers(filteredCustomers)
        }
      } catch (error) {
        console.error('Error searching customers:', error)
        setCustomers([])
      } finally {
        setLoading(false)
      }
    }

    const delayedSearch = setTimeout(searchCustomers, searchQuery ? 300 : 0)
    return () => clearTimeout(delayedSearch)
  }, [open, searchQuery, priceInfo?.isMinor])

  const handleConfirm = () => {
    if (priceInfo?.isMinor && selectedDependent) {
      // For minor prices, return the parent customer with the selected dependent
      onSelectCustomer({
        customer: selectedCustomer,
        dependent: selectedDependent
      })
    } else if (selectedCustomer) {
      // For adult prices, just return the customer
      onSelectCustomer({
        customer: selectedCustomer,
        dependent: null
      })
    }
    onOpenChange(false)
  }

  const getAge = (dob) => {
    if (!dob) return null
    return dayjs().diff(dayjs(dob), 'year')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px]">
        <SheetHeader>
          <SheetTitle>
            {priceInfo?.isMinor ? 'Select Parent/Guardian' : 'Select Customer'}
          </SheetTitle>
          <SheetDescription>
            {priceInfo?.isMinor 
              ? `Select a parent/guardian who has completed a waiver for their minor(s). This is for "${priceInfo?.name}" pricing.`
              : `Select a customer who has completed a waiver. This is for "${priceInfo?.name}" pricing.`
            }
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, email, or member ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Results */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Searching customers...
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {priceInfo?.isMinor 
                    ? 'No customers found with completed waivers and dependents'
                    : 'No customers found with completed waivers'
                  }
                </p>
              </div>
            ) : (
              customers.map((customer) => (
                <div 
                  key={customer._id} 
                  className={`border rounded-lg p-4 space-y-3 cursor-pointer transition-colors ${
                    selectedCustomer?._id === customer._id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => {
                    setSelectedCustomer(customer)
                    // Auto-select first dependent if minor price and customer has dependents
                    if (priceInfo?.isMinor && customer.dependents?.length > 0 && !selectedDependent) {
                      setSelectedDependent(customer.dependents[0])
                    }
                  }}
                >
                  {/* Customer Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                        {customer.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                        {customer.memberId && (
                          <div className="text-xs text-muted-foreground">ID: {customer.memberId}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Waiver
                      </Badge>
                      {customer.dependents?.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {customer.dependents.length} dependent{customer.dependents.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Show dependents if this is a minor price and customer is selected */}
                  {priceInfo?.isMinor && selectedCustomer?._id === customer._id && customer.dependents?.length > 0 && (
                    <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                      <Label className="text-sm font-medium">Select dependent for {priceInfo.name} pricing:</Label>
                      <RadioGroup 
                        value={selectedDependent?._id} 
                        onValueChange={(value) => {
                          const dep = customer.dependents.find(d => d._id === value)
                          setSelectedDependent(dep)
                        }}
                      >
                        {customer.dependents.map((dependent) => {
                          const age = getAge(dependent.dob)
                          return (
                            <div key={dependent._id} className="flex items-center space-x-2">
                              <RadioGroupItem value={dependent._id} id={dependent._id} />
                              <Label 
                                htmlFor={dependent._id} 
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
                              </Label>
                            </div>
                          )
                        })}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!selectedCustomer || (priceInfo?.isMinor && !selectedDependent)}
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}