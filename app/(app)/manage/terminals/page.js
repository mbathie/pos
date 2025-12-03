'use client'

import { useState, useEffect, Fragment } from 'react'
import { Plus, Terminal, Wifi, WifiOff, Trash2, MoreHorizontal, Link as LinkIcon, Unlink, Loader2, Edit2, Monitor, ChevronRight, Info, CreditCard, LayoutGrid, Smartphone, Chrome, Apple } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useGlobals } from '@/lib/globals'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AddLocationSheet } from '@/components/AddLocationSheet'
import LocationForm from '@/app/(app)/manage/locations/location'

export default function TerminalsPage() {
  const { locations: globalLocations, setLocations, location: currentLocation, device: globalDevice, setDevice } = useGlobals()
  const router = useRouter()
  const [locations, setLocalLocations] = useState([])
  const [terminals, setTerminals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentBrowserId, setCurrentBrowserId] = useState(null)
  const [currentDevice, setCurrentDevice] = useState(null)

  // Device sheet state
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [devices, setDevices] = useState([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Terminal management
  const [addTerminalDialogOpen, setAddTerminalDialogOpen] = useState(false)
  const [newTerminal, setNewTerminal] = useState({ label: '', type: 'simulated', registrationCode: '' })
  const [deleteTerminalDialogOpen, setDeleteTerminalDialogOpen] = useState(false)
  const [terminalToDelete, setTerminalToDelete] = useState(null)

  // Device management
  const [editDeviceDialogOpen, setEditDeviceDialogOpen] = useState(false)
  const [deviceToEdit, setDeviceToEdit] = useState(null)
  const [deviceName, setDeviceName] = useState('')
  const [deleteDeviceDialogOpen, setDeleteDeviceDialogOpen] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState(null)
  const [moveDeviceDialogOpen, setMoveDeviceDialogOpen] = useState(false)
  const [deviceToMove, setDeviceToMove] = useState(null)
  const [targetLocationId, setTargetLocationId] = useState('')

  // POS Interface management
  const [posInterfaces, setPosInterfaces] = useState([])
  const [changePOSInterfaceDialogOpen, setChangePOSInterfaceDialogOpen] = useState(false)
  const [deviceToChangePOS, setDeviceToChangePOS] = useState(null)
  const [selectedPOSInterfaceId, setSelectedPOSInterfaceId] = useState('')

  // Add location
  const [addLocationSheetOpen, setAddLocationSheetOpen] = useState(false)

  // Edit location address
  const [editLocationSheetOpen, setEditLocationSheetOpen] = useState(false)
  const [locationToEdit, setLocationToEdit] = useState(null)

  // Terminal linking
  const [linkTerminalDialogOpen, setLinkTerminalDialogOpen] = useState(false)
  const [deviceToLink, setDeviceToLink] = useState(null)
  const [selectedTerminalId, setSelectedTerminalId] = useState('')

  useEffect(() => {
    loadData()
    loadCurrentBrowserId()
  }, [])

  // Find current device when locations or browserId changes
  useEffect(() => {
    if (!currentBrowserId || !locations.length) return

    // Search through all locations to find device with matching browserId
    for (const loc of locations) {
      const device = loc.devices?.find(d => d.browserId === currentBrowserId)
      if (device) {
        setCurrentDevice(device)
        return
      }
    }
    setCurrentDevice(null)
  }, [currentBrowserId, locations])

  const loadCurrentBrowserId = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/browser-id`)
      if (res.ok) {
        const data = await res.json()
        setCurrentBrowserId(data.browserId)
      }
    } catch (error) {
      console.error('Error loading browser ID:', error)
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch locations
      const locationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations`)
      if (locationsRes.ok) {
        const locationsData = await locationsRes.json()
        setLocalLocations(locationsData)
        setLocations(locationsData)
      }

      // Fetch all terminals
      const terminalsRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/terminals`)
      if (terminalsRes.ok) {
        const terminalsData = await terminalsRes.json()
        setTerminals(terminalsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadDevices = async (locationId) => {
    setDevicesLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${locationId}/devices`)
      if (res.ok) {
        const data = await res.json()
        setDevices(data.devices || [])
      }
    } catch (error) {
      console.error('Error loading devices:', error)
      toast.error('Failed to load devices')
    } finally {
      setDevicesLoading(false)
    }
  }

  const loadPOSInterfaces = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces`)
      if (res.ok) {
        const data = await res.json()
        setPosInterfaces(data.interfaces || [])
      }
    } catch (error) {
      console.error('Error loading POS interfaces:', error)
    }
  }

  const getPOSInterfaceForDevice = (locationId, browserId) => {
    return posInterfaces.find(iface =>
      iface.devices?.some(d =>
        (d.locationId === locationId || d.locationId?._id === locationId) &&
        d.browserId === browserId
      )
    )
  }

  const openLocationSheet = async (location) => {
    setSelectedLocation(location)
    setSheetOpen(true)
    await Promise.all([
      loadDevices(location._id),
      loadPOSInterfaces()
    ])
  }

  const handleAddTerminal = async () => {
    if (!selectedLocation || !newTerminal.label) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/terminals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTerminal,
          locationId: selectedLocation._id
        })
      })

      if (res.ok) {
        const data = await res.json()
        const createdTerminal = data.terminal || data

        // If deviceToLink is set, automatically link the new terminal to that device
        if (deviceToLink && createdTerminal._id) {
          const linkRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${selectedLocation._id}/devices/${deviceToLink._id}/terminal`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ terminalId: createdTerminal._id })
            }
          )

          if (linkRes.ok) {
            const linkData = await linkRes.json()
            toast.success('Terminal added and linked successfully')

            // Update global device if this is the current device
            if (deviceToLink.browserId === currentBrowserId && linkData.device) {
              setDevice(linkData.device)
            }
          } else {
            toast.success('Terminal added (linking failed)')
          }
        } else {
          toast.success('Terminal added successfully')
        }

        await loadData()
        await loadDevices(selectedLocation._id)
        setAddTerminalDialogOpen(false)
        setNewTerminal({ label: '', type: 'simulated', registrationCode: '' })
        setDeviceToLink(null)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to add terminal')
      }
    } catch (error) {
      console.error('Error adding terminal:', error)
      toast.error('Failed to add terminal')
    }
  }

  const handleDeleteTerminal = async () => {
    if (!terminalToDelete) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/terminals/${terminalToDelete._id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Terminal deleted successfully')
        await loadData()
        if (selectedLocation) {
          await loadDevices(selectedLocation._id)
        }
        setDeleteTerminalDialogOpen(false)
        setTerminalToDelete(null)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete terminal')
      }
    } catch (error) {
      console.error('Error deleting terminal:', error)
      toast.error('Failed to delete terminal')
    }
  }

  const handleLinkTerminal = async () => {
    if (!deviceToLink || !selectedLocation) return

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${selectedLocation._id}/devices/${deviceToLink._id}/terminal`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ terminalId: selectedTerminalId || null })
        }
      )

      if (res.ok) {
        const data = await res.json()
        toast.success(selectedTerminalId ? 'Terminal linked successfully' : 'Terminal unlinked successfully')

        // Update global device if this is the current device
        if (deviceToLink.browserId === currentBrowserId && data.device) {
          setDevice(data.device)
        }

        await loadDevices(selectedLocation._id)
        setLinkTerminalDialogOpen(false)
        setDeviceToLink(null)
        setSelectedTerminalId('')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to link terminal')
      }
    } catch (error) {
      console.error('Error linking terminal:', error)
      toast.error('Failed to link terminal')
    }
  }

  const handleEditDevice = async () => {
    if (!deviceToEdit || !selectedLocation || !deviceName.trim()) return

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${selectedLocation._id}/devices/${deviceToEdit._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: deviceName })
        }
      )

      if (res.ok) {
        toast.success('Device renamed successfully')
        await loadDevices(selectedLocation._id)
        setEditDeviceDialogOpen(false)
        setDeviceToEdit(null)
        setDeviceName('')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to rename device')
      }
    } catch (error) {
      console.error('Error renaming device:', error)
      toast.error('Failed to rename device')
    }
  }

  const handleDeleteDevice = async () => {
    if (!deviceToDelete || !selectedLocation) return

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${selectedLocation._id}/devices/${deviceToDelete._id}`,
        {
          method: 'DELETE'
        }
      )

      if (res.ok) {
        toast.success('Device removed successfully')
        await loadDevices(selectedLocation._id)
        setDeleteDeviceDialogOpen(false)
        setDeviceToDelete(null)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to remove device')
      }
    } catch (error) {
      console.error('Error removing device:', error)
      toast.error('Failed to remove device')
    }
  }

  const handleMoveDevice = async () => {
    if (!deviceToMove || !selectedLocation || !targetLocationId) return

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${selectedLocation._id}/devices/${deviceToMove._id}/move`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetLocationId })
        }
      )

      if (res.ok) {
        toast.success('Device moved successfully')
        await loadData()
        await loadDevices(selectedLocation._id)
        setMoveDeviceDialogOpen(false)
        setDeviceToMove(null)
        setTargetLocationId('')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to move device')
      }
    } catch (error) {
      console.error('Error moving device:', error)
      toast.error('Failed to move device')
    }
  }

  const handleChangePOSInterface = async () => {
    if (!deviceToChangePOS || !selectedLocation) return

    try {
      // First, remove device from all POS interfaces
      for (const iface of posInterfaces) {
        const hasDevice = iface.devices?.some(d =>
          (d.locationId === selectedLocation._id || d.locationId?._id === selectedLocation._id) &&
          d.browserId === deviceToChangePOS.browserId
        )

        if (hasDevice) {
          const updatedDevices = iface.devices.filter(d =>
            !(
              (d.locationId === selectedLocation._id || d.locationId?._id === selectedLocation._id) &&
              d.browserId === deviceToChangePOS.browserId
            )
          )

          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${iface._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: updatedDevices })
          })
        }
      }

      // Then add to selected interface if one is selected
      if (selectedPOSInterfaceId && selectedPOSInterfaceId !== 'none') {
        const targetInterface = posInterfaces.find(i => i._id === selectedPOSInterfaceId)
        if (targetInterface) {
          const updatedDevices = [
            ...(targetInterface.devices || []),
            {
              locationId: selectedLocation._id,
              browserId: deviceToChangePOS.browserId
            }
          ]

          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${targetInterface._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: updatedDevices })
          })
        }
      }

      toast.success('POS interface updated successfully')
      await loadPOSInterfaces()
      setChangePOSInterfaceDialogOpen(false)
      setDeviceToChangePOS(null)
      setSelectedPOSInterfaceId('')
    } catch (error) {
      console.error('Error changing POS interface:', error)
      toast.error('Failed to update POS interface')
    }
  }

  const handleUpdateLocationAddress = async (updatedLocation) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${updatedLocation._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLocation)
      })

      if (res.ok) {
        toast.success('Location address updated')
        setEditLocationSheetOpen(false)
        setLocationToEdit(null)
        await loadData()
        // Also update selectedLocation if it's the same location
        if (selectedLocation?._id === updatedLocation._id) {
          setSelectedLocation(updatedLocation)
        }
      } else {
        throw new Error('Failed to update location')
      }
    } catch (error) {
      console.error('Error updating location:', error)
      toast.error('Failed to update location')
    }
  }

  const getTerminalsForLocation = (locationId) => {
    return terminals.filter(t => t.location === locationId || t.location?._id === locationId)
  }

  // Check if location has valid address for Stripe Terminal
  const hasValidAddress = (location) => {
    return !!(location?.address1 && location?.city && location?.state && location?.postcode)
  }

  const getAvailableTerminalsForDevice = (locationId, currentDeviceId) => {
    const locationTerminals = getTerminalsForLocation(locationId)
    const linkedTerminalIds = devices
      .filter(d => d._id !== currentDeviceId && d.terminal)
      .map(d => d.terminal._id || d.terminal)

    return locationTerminals.filter(t => !linkedTerminalIds.includes(t._id))
  }

  const formatLastSeen = (date) => {
    if (!date) return 'Never'
    const lastSeen = new Date(date)
    const now = new Date()
    const diff = now - lastSeen
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getDeviceTypeInfo = (device) => {
    const ua = device.metadata?.userAgent || device.userAgent || ''
    let os = 'Unknown'
    let browser = 'Unknown'
    let icon = Monitor

    // Detect OS
    if (ua.includes('Mac OS X') || ua.includes('Macintosh')) {
      os = 'macOS'
      icon = Apple
    } else if (ua.includes('Windows')) {
      os = 'Windows'
      icon = Monitor
    } else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) {
      os = ua.includes('iPad') ? 'iPadOS' : 'iOS'
      icon = Smartphone
    } else if (ua.includes('Android')) {
      os = 'Android'
      icon = Smartphone
    } else if (ua.includes('Linux')) {
      os = 'Linux'
      icon = Monitor
    }

    // Detect Browser
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      browser = 'Chrome'
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari'
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox'
    } else if (ua.includes('Edg')) {
      browser = 'Edge'
    }

    return { os, browser, icon, display: `${os} / ${browser}` }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-1">Terminal & Device Management</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
        <div className="rounded-md border p-4">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const displayLocations = locations.length > 0 ? locations : globalLocations

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      {/* Header */}
      <div className="my-6 mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold mb-1">Terminal & Device Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage devices and their linked Stripe terminals for each location
          </p>
        </div>
        <Button
          className="cursor-pointer"
          onClick={() => setAddLocationSheetOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Locations Table */}
      <div className="rounded-md border">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b bg-muted/50 hover:bg-muted/50">
              <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Location
              </th>
              <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Devices
              </th>
              <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                <div className="flex items-center gap-1">
                  Terminals
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Stripe Terminal devices for processing card payments. Each terminal can be linked to a device (POS).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </th>
              <th scope="col" className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {displayLocations?.map((location) => {
              const locationTerminals = getTerminalsForLocation(location._id)
              const devices = location.devices || []

              return (
                <tr
                  key={location._id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => openLocationSheet(location)}
                >
                  <td className="px-4 py-3 font-medium align-middle">
                    {location.name}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {devices.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No devices</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {devices.map((device) => (
                          <Badge
                            key={device._id}
                            variant={device.browserId === currentBrowserId ? "default" : "secondary"}
                          >
                            {device.name || 'Unnamed Device'}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {locationTerminals.length === 0 ? (
                      hasValidAddress(location) ? (
                        <Badge
                          className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLocation(location)
                            // Auto-link to first device if there's only one
                            const locationDevices = location.devices || []
                            if (locationDevices.length === 1) {
                              setDeviceToLink(locationDevices[0])
                            }
                            setAddTerminalDialogOpen(true)
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Terminal
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="cursor-pointer h-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            setLocationToEdit(location)
                            setEditLocationSheetOpen(true)
                          }}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Set Address
                        </Button>
                      )
                    ) : (
                      <Badge variant="outline">{locationTerminals.length} {locationTerminals.length === 1 ? 'terminal' : 'terminals'}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <ChevronRight className="h-5 w-5 text-muted-foreground inline-block" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {displayLocations?.length === 0 && (
        <div className="text-center py-8 mt-8">
          <Terminal className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Locations Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You need to create locations before you can manage terminals
          </p>
          <Button
            className="cursor-pointer"
            onClick={() => router.push('/manage/locations/create')}
          >
            Create Location
          </Button>
        </div>
      )}

      {/* Device Management Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedLocation?.name}</SheetTitle>
            <SheetDescription>
              Manage devices and terminals for this location
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 p-4 pt-0  ">
            {/* Devices Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Devices (POS)</h3>
              </div>

              {devicesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : devices.length === 0 ? (
                <div className="border border-dashed rounded-md p-6 text-center">
                  <Monitor className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No devices yet. Devices appear when someone logs in from this location.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {devices.map((device) => {
                    const assignedPOSInterface = getPOSInterfaceForDevice(selectedLocation._id, device.browserId)
                    const deviceTypeInfo = getDeviceTypeInfo(device)
                    const DeviceIcon = deviceTypeInfo.icon

                    return (
                      <div key={device._id} className="border rounded-md p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            {device.browserId === currentBrowserId && (
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                  checked={true}
                                  className="pointer-events-none"
                                  aria-label="This POS indicator"
                                />
                                <span className="text-sm text-muted-foreground">
                                  This POS
                                </span>
                              </div>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="cursor-pointer h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {hasValidAddress(selectedLocation) ? (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setDeviceToLink(device)
                                    setAddTerminalDialogOpen(true)
                                  }}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add New Terminal
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setLocationToEdit(selectedLocation)
                                    setEditLocationSheetOpen(true)
                                  }}
                                >
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  Set Address First
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setDeviceToLink(device)
                                  setSelectedTerminalId(device.terminal?._id || device.terminal || 'none')
                                  setLinkTerminalDialogOpen(true)
                                }}
                              >
                                <LinkIcon className="mr-2 h-4 w-4" />
                                {device.terminal ? 'Change Terminal' : 'Link Terminal'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setDeviceToChangePOS(device)
                                  setSelectedPOSInterfaceId(assignedPOSInterface?._id || 'none')
                                  setChangePOSInterfaceDialogOpen(true)
                                }}
                              >
                                <Monitor className="mr-2 h-4 w-4" />
                                Change POS Interface
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setDeviceToEdit(device)
                                  setDeviceName(device.name || '')
                                  setEditDeviceDialogOpen(true)
                                }}
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Rename Device
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setDeviceToMove(device)
                                  setTargetLocationId('')
                                  setMoveDeviceDialogOpen(true)
                                }}
                              >
                                <ChevronRight className="mr-2 h-4 w-4" />
                                Move to Location
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setDeviceToDelete(device)
                                  setDeleteDeviceDialogOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Device
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Device Information */}
                        <div className="space-y-3">
                          {/* Device Type */}
                          <div className="flex items-center gap-2">
                            <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Device Type</span>
                            <span className="font-medium text-sm">{deviceTypeInfo.display}</span>
                          </div>

                          {/* Device Name */}
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Device Name</span>
                            <span className="font-medium text-sm">{device.name || 'Unnamed Device'}</span>
                          </div>

                          {/* Stripe Terminal */}
                          <div className="flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Stripe Terminal</span>
                            {device.terminal ? (
                              <span className="font-medium text-sm">
                                {device.terminal.label}
                                {device.terminal.type === 'simulated' && ' (simulated)'}
                              </span>
                            ) : hasValidAddress(selectedLocation) ? (
                              <Button
                                size="sm"
                                className="h-7 cursor-pointer"
                                onClick={() => {
                                  setDeviceToLink(device)
                                  setAddTerminalDialogOpen(true)
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Terminal
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 cursor-pointer"
                                onClick={() => {
                                  setLocationToEdit(selectedLocation)
                                  setEditLocationSheetOpen(true)
                                }}
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                Set Address First
                              </Button>
                            )}
                          </div>

                          {/* POS Interface */}
                          <div className="flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">POS Interface</span>
                            <span className="font-medium text-sm">
                              {assignedPOSInterface ? assignedPOSInterface.name : 'No interface assigned'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Terminal Dialog */}
      <Dialog open={addTerminalDialogOpen} onOpenChange={setAddTerminalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Terminal</DialogTitle>
            <DialogDescription>
              Add a Stripe-compatible terminal to {selectedLocation?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="label">Terminal Label</Label>
              <Input
                id="label"
                placeholder="e.g., Cafe Counter"
                value={newTerminal.label}
                onChange={(e) => setNewTerminal(prev => ({ ...prev, label: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="type">Terminal Type</Label>
              <Select
                value={newTerminal.type}
                onValueChange={(value) => setNewTerminal(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical Terminal</SelectItem>
                  <SelectItem value="simulated">Simulated (Testing)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newTerminal.type === 'physical' && (
              <div className="flex flex-col gap-1">
                <Label htmlFor="registrationCode">Registration Code</Label>
                <Input
                  id="registrationCode"
                  placeholder="e.g., shop-bell-thursday"
                  value={newTerminal.registrationCode}
                  onChange={(e) => setNewTerminal(prev => ({ ...prev, registrationCode: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setAddTerminalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleAddTerminal}
              disabled={!newTerminal.label}
            >
              Add Terminal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Terminal Dialog */}
      <AlertDialog open={deleteTerminalDialogOpen} onOpenChange={setDeleteTerminalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Terminal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{terminalToDelete?.label}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTerminalToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTerminal}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link Terminal Dialog */}
      <Dialog open={linkTerminalDialogOpen} onOpenChange={setLinkTerminalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Terminal to Device</DialogTitle>
            <DialogDescription>
              Select a terminal to link to "{deviceToLink?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="terminal">Terminal</Label>
              <Select value={selectedTerminalId} onValueChange={setSelectedTerminalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a terminal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Unlink)</SelectItem>
                  {getAvailableTerminalsForDevice(selectedLocation?._id, deviceToLink?._id).map(terminal => (
                    <SelectItem key={terminal._id} value={terminal._id}>
                      {terminal.label} ({terminal.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setLinkTerminalDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={handleLinkTerminal}>
              {selectedTerminalId ? 'Link Terminal' : 'Unlink'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={editDeviceDialogOpen} onOpenChange={setEditDeviceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Device</DialogTitle>
            <DialogDescription>
              Give this device a friendly name
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                placeholder="e.g., iPad - Cafe"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setEditDeviceDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={handleEditDevice} disabled={!deviceName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Device Dialog */}
      <AlertDialog open={deleteDeviceDialogOpen} onOpenChange={setDeleteDeviceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deviceToDelete?.name}" from this location. The device will be re-added if someone logs in from it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeviceToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDevice}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Device Dialog */}
      <Dialog open={moveDeviceDialogOpen} onOpenChange={setMoveDeviceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Device to Different Location</DialogTitle>
            <DialogDescription>
              Select a location to move "{deviceToMove?.name}" to
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="targetLocation">Target Location</Label>
              <Select value={targetLocationId} onValueChange={setTargetLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {displayLocations
                    ?.filter(loc => loc._id !== selectedLocation?._id)
                    .map(location => (
                      <SelectItem key={location._id} value={location._id}>
                        {location.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setMoveDeviceDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={handleMoveDevice} disabled={!targetLocationId}>
              Move Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change POS Interface Dialog */}
      <Dialog open={changePOSInterfaceDialogOpen} onOpenChange={setChangePOSInterfaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change POS Interface</DialogTitle>
            <DialogDescription>
              Select a POS interface for "{deviceToChangePOS?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="posInterface">POS Interface</Label>
              <Select value={selectedPOSInterfaceId} onValueChange={setSelectedPOSInterfaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a POS interface" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Unassign)</SelectItem>
                  {posInterfaces.map(iface => (
                    <SelectItem key={iface._id} value={iface._id}>
                      {iface.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setChangePOSInterfaceDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={handleChangePOSInterface}>
              {selectedPOSInterfaceId && selectedPOSInterfaceId !== 'none' ? 'Assign Interface' : 'Unassign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Location Sheet */}
      <AddLocationSheet
        open={addLocationSheetOpen}
        onOpenChange={setAddLocationSheetOpen}
        onLocationAdded={loadData}
      />

      {/* Edit Location Address Sheet */}
      <Sheet open={editLocationSheetOpen} onOpenChange={(open) => {
        setEditLocationSheetOpen(open)
        if (!open) setLocationToEdit(null)
      }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Location Address</SheetTitle>
            <SheetDescription>
              A valid address is required to create Stripe terminals
            </SheetDescription>
          </SheetHeader>
          {locationToEdit && (
            <LocationForm
              initialData={{
                ...locationToEdit,
                name: locationToEdit.name || '',
                phone: locationToEdit.phone || '',
                address1: locationToEdit.address1 || '',
                city: locationToEdit.city || '',
                state: locationToEdit.state || '',
                postcode: locationToEdit.postcode || '',
                storeHours: locationToEdit.storeHours?.length === 7
                  ? locationToEdit.storeHours
                  : [
                    { d: 0, open: '', close: '' },
                    { d: 1, open: '', close: '' },
                    { d: 2, open: '', close: '' },
                    { d: 3, open: '', close: '' },
                    { d: 4, open: '', close: '' },
                    { d: 5, open: '', close: '' },
                    { d: 6, open: '', close: '' }
                  ],
                closedDays: locationToEdit.closedDays || []
              }}
              onSubmit={handleUpdateLocationAddress}
              submitLabel="Update Location"
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
