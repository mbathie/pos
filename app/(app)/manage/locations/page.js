'use client'
import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { MapPin, Plus, Search, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Building2, Info } from 'lucide-react'
import { useGlobals } from '@/lib/globals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

export default function Page() {
  const [locations, setLocations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [selectedPOSLocation, setSelectedPOSLocation] = useState(null)
  const [browserInfo, setBrowserInfo] = useState(null)
  const { pushBreadcrumb, resetBreadcrumb, location: currentLocation, setLocation, employee, setEmployee } = useGlobals()
  
  useEffect(() => {
    resetBreadcrumb({ name: "Locations", href: "/manage/locations" })
  }, [])

  const fetchLocations = async () => {
    setLoading(true)
    try {
      // Fetch locations
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/locations')
      const data = await res.json()
      setLocations(data)
      
      // Check for browser-tied location
      const browserRes = await fetch('/api/locations/browser')
      const browserData = await browserRes.json()
      
      if (browserData.locationId) {
        setSelectedPOSLocation(browserData.locationId)
        setBrowserInfo(browserData)
        console.log('🖥️ Browser tied to location:', browserData.locationName)
      } else if (currentLocation && currentLocation._id) {
        // Fallback to current location if no browser association
        setSelectedPOSLocation(currentLocation._id)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLocations()
  }, [])

  const handlePOSSelection = async (locationId) => {
    // If clicking the already selected location, unset it
    if (selectedPOSLocation === locationId) {
      setSelectedPOSLocation(null)
      setBrowserInfo(null)
      
      // Call API to remove browser association
      try {
        const res = await fetch(`/api/locations/${locationId}/setbrowser`, {
          method: 'DELETE',
        })
        const data = await res.json()
        if (data.success) {
          console.log('✅ Browser location association cleared')
        }
      } catch (error) {
        console.error('Error clearing browser location:', error)
      }
      return
    }
    
    // Set the new selection
    const selectedLocation = locations.find(loc => loc._id === locationId)
    setSelectedPOSLocation(locationId)
    
    // Call API to set browser association
    try {
      const res = await fetch(`/api/locations/${locationId}/setbrowser`, {
        method: 'POST',
      })
      const data = await res.json()
      
      if (data.success) {
        console.log('✅ Browser tied to location:', data.message)
        setBrowserInfo({
          browserId: data.browserId,
          locationId: locationId,
          locationName: selectedLocation?.name
        })
        
        // Update the global location state
        setLocation(selectedLocation)
        console.log('📍 Updated globals.location to:', selectedLocation)
        
        // Update the employee's selectedLocationId
        if (employee) {
          const updatedEmployee = {
            ...employee,
            selectedLocationId: locationId
          }
          setEmployee(updatedEmployee)
          console.log('👤 Updated globals.employee with selectedLocationId:', locationId)
          console.log('👤 Full updated employee object:', updatedEmployee)
        }
        
        // Check server-side employee data (for debugging)
        console.log('🔄 Fetching server-side employee data to verify...')
        fetch('/api/users/me')
          .then(res => res.json())
          .then(data => {
            console.log('🖥️ Server-side employee (JWT-based):', data.employee)
            console.log('🖥️ Server selectedLocationId (from JWT):', data.employee?.selectedLocationId)
            console.log('⚠️ Note: JWT selectedLocationId won\'t update until next login')
          })
          .catch(err => console.error('Error fetching server employee:', err))
        
        // No page reload needed - globals are updated
        console.log('✅ Location switch complete - globals updated, no refresh needed')
      } else {
        console.error('Failed to set browser location:', data.error)
        // Revert selection on error
        setSelectedPOSLocation(null)
        setBrowserInfo(null)
      }
    } catch (error) {
      console.error('Error setting browser location:', error)
      // Revert selection on error
      setSelectedPOSLocation(null)
      setBrowserInfo(null)
    }
  }

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const handleHeaderKey = (e, key) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSort(key)
    }
  }

  // Get sort icon
  const getSortIcon = (column) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />
  }

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = locations

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.address1?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.zip?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]
        
        // Handle address sorting specially
        if (sortConfig.key === 'address') {
          aValue = [a.address1, a.city, a.state].filter(Boolean).join(', ')
          bValue = [b.address1, b.city, b.state].filter(Boolean).join(', ')
        }
        
        if (!aValue) return 1
        if (!bValue) return -1
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [locations, searchQuery, sortConfig])

  // Pagination calculations
  const totalPages = Math.ceil(processedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = processedData.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('ellipsis')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('ellipsis')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  const formatAddress = (loc) => {
    const parts = [loc.address1, loc.city, loc.state]
    const filtered = parts.filter(Boolean)
    if (loc.zip) filtered.push(loc.zip)
    return filtered.join(', ') || '—'
  }

  return (
    <div className="px-4 max-w-7xl flex flex-col py-4">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-semibold mb-1">Store Locations</h1>
        <p className="text-sm text-muted-foreground">
          Manage your business locations and their settings
        </p>
        {browserInfo && browserInfo.locationName && (
          <div className="mt-2 p-2 bg-muted/50 rounded-md flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-sm">
              This browser/POS is tied to <strong>{browserInfo.locationName}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Add Location Button */}
          <Link href="/manage/locations/create">
            <Button className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </Link>
        </div>
      </div>

      {/* Table Container - Scrollable */}
      <div className="flex-1 flex flex-col min-h-0 top-0 relative">
        {/* Table */}
        <div className="rounded-md border flex-1 overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
              <tr className="border-b bg-muted/50 hover:bg-muted/50">
                <th 
                  scope="col"
                  aria-sort={sortConfig.key==='name' ? (sortConfig.direction==='asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('name')}
                  onKeyDown={(e) => handleHeaderKey(e, 'name')}
                >
                  <div className="flex items-center">
                    Location Name
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  scope="col"
                  aria-sort={sortConfig.key==='address' ? (sortConfig.direction==='asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('address')}
                  onKeyDown={(e) => handleHeaderKey(e, 'address')}
                >
                  <div className="flex items-center">
                    Address
                    {getSortIcon('address')}
                  </div>
                </th>
                <th 
                  scope="col"
                  aria-sort={sortConfig.key==='phone' ? (sortConfig.direction==='asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('phone')}
                  onKeyDown={(e) => handleHeaderKey(e, 'phone')}
                >
                  <div className="flex items-center">
                    Phone
                    {getSortIcon('phone')}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="h-12 px-4 text-center align-middle font-medium text-muted-foreground"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1 cursor-help">
                          <span>This POS</span>
                          <Info className="h-3 w-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Indicates for this POS which location it is tied to. Anyone logging into this POS will be tied to the selected location</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </th>
                <th scope="col" className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                <tr className="border-b">
                  <td colSpan={5} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">Loading locations...</p>
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={5} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No locations found matching your search' : 'No locations found. Add your first location to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                currentData.map((loc) => (
                  <tr
                    key={loc._id}
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => window.location.href = `/manage/locations/${loc._id}`}
                  >
                    <td className="px-4 py-3 font-medium align-middle">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{loc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="text-foreground">{formatAddress(loc)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {loc.phone || '—'}
                    </td>
                    <td className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={selectedPOSLocation === loc._id}
                          onCheckedChange={() => handlePOSSelection(loc._id)}
                          className="cursor-pointer"
                          aria-label={`Set ${loc.name} as this POS location`}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <ChevronRight className="h-5 w-5 text-muted-foreground inline-block" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination and Info - Fixed at bottom */}
        {processedData.length > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-4 flex-shrink-0">
            <div className="text-sm text-muted-foreground text-nowrap">
              {startIndex + 1} to {Math.min(endIndex, processedData.length)} of {processedData.length} locations
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent className="ml-auto">
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage > 1) setCurrentPage(currentPage - 1)
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers().map((page, index) => (
                    <PaginationItem key={index}>
                      {page === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage(page)
                          }}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
