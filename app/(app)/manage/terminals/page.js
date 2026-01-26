'use client'

import { useState, useEffect } from 'react'
import { Plus, Terminal, Trash2, MoreHorizontal, Link as LinkIcon, Loader2, Edit2, Monitor, ArrowUpDown, ArrowUp, ArrowDown, Wifi, WifiOff } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useGlobals } from '@/lib/globals'
import { toast } from 'sonner'

export default function TerminalsPage() {
  const { locations: globalLocations, setLocations } = useGlobals()
  const [locations, setLocalLocations] = useState([])
  const [terminals, setTerminals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Sorting state
  const [sortColumn, setSortColumn] = useState('label')
  const [sortDirection, setSortDirection] = useState('asc')

  // Terminal management
  const [addTerminalDialogOpen, setAddTerminalDialogOpen] = useState(false)
  const [newTerminal, setNewTerminal] = useState({ label: '', type: 'simulated', registrationCode: '', locationId: '' })
  const [deleteTerminalDialogOpen, setDeleteTerminalDialogOpen] = useState(false)
  const [terminalToDelete, setTerminalToDelete] = useState(null)
  const [editTerminalDialogOpen, setEditTerminalDialogOpen] = useState(false)
  const [terminalToEdit, setTerminalToEdit] = useState(null)
  const [editTerminalLabel, setEditTerminalLabel] = useState('')

  // Device linking
  const [linkDeviceDialogOpen, setLinkDeviceDialogOpen] = useState(false)
  const [terminalToLink, setTerminalToLink] = useState(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [allDevices, setAllDevices] = useState([])

  useEffect(() => {
    loadData()
  }, [])

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

        // Extract all devices from all locations
        const devices = []
        locationsData.forEach(loc => {
          (loc.devices || []).forEach(device => {
            devices.push({
              ...device,
              locationId: loc._id,
              locationName: loc.name
            })
          })
        })
        setAllDevices(devices)
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

  // Get the device linked to a terminal
  const getLinkedDevice = (terminalId) => {
    return allDevices.find(d => {
      const deviceTerminalId = d.terminal?._id || d.terminal
      return deviceTerminalId === terminalId
    })
  }

  // Get location for a terminal
  const getLocationForTerminal = (terminal) => {
    const locationId = terminal.location?._id || terminal.location
    return locations.find(loc => loc._id === locationId)
  }

  // Get devices available for linking (not already linked to another terminal)
  const getAvailableDevicesForTerminal = (terminalId, locationId) => {
    return allDevices.filter(d => {
      // Must be in the same location
      if (d.locationId !== locationId) return false
      // Either not linked to any terminal, or linked to this terminal
      const deviceTerminalId = d.terminal?._id || d.terminal
      return !deviceTerminalId || deviceTerminalId === terminalId
    })
  }

  // Handle sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort terminals
  const sortedTerminals = [...terminals].sort((a, b) => {
    let aVal, bVal

    switch (sortColumn) {
      case 'label':
        aVal = a.label?.toLowerCase() || ''
        bVal = b.label?.toLowerCase() || ''
        break
      case 'type':
        aVal = a.type || ''
        bVal = b.type || ''
        break
      case 'location':
        aVal = getLocationForTerminal(a)?.name?.toLowerCase() || ''
        bVal = getLocationForTerminal(b)?.name?.toLowerCase() || ''
        break
      case 'device':
        aVal = getLinkedDevice(a._id)?.name?.toLowerCase() || ''
        bVal = getLinkedDevice(b._id)?.name?.toLowerCase() || ''
        break
      case 'status':
        aVal = a.status || ''
        bVal = b.status || ''
        break
      default:
        return 0
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const SortHeader = ({ column, children }) => {
    const isActive = sortColumn === column
    return (
      <button
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => handleSort(column)}
      >
        {children}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
        )}
      </button>
    )
  }

  const handleAddTerminal = async () => {
    if (!newTerminal.label || !newTerminal.locationId) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/terminals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTerminal)
      })

      if (res.ok) {
        toast.success('Terminal added successfully')
        await loadData()
        setAddTerminalDialogOpen(false)
        setNewTerminal({ label: '', type: 'simulated', registrationCode: '', locationId: '' })
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to add terminal')
      }
    } catch (error) {
      console.error('Error adding terminal:', error)
      toast.error('Failed to add terminal')
    }
  }

  const handleEditTerminal = async () => {
    if (!terminalToEdit || !editTerminalLabel.trim()) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/terminals/${terminalToEdit._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editTerminalLabel })
      })

      if (res.ok) {
        toast.success('Terminal updated successfully')
        await loadData()
        setEditTerminalDialogOpen(false)
        setTerminalToEdit(null)
        setEditTerminalLabel('')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update terminal')
      }
    } catch (error) {
      console.error('Error updating terminal:', error)
      toast.error('Failed to update terminal')
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

  const handleLinkDevice = async () => {
    if (!terminalToLink) return

    const location = getLocationForTerminal(terminalToLink)
    if (!location) return

    // Find the device to link/unlink
    const currentlyLinkedDevice = getLinkedDevice(terminalToLink._id)

    try {
      // If there was a previously linked device, unlink it
      if (currentlyLinkedDevice && currentlyLinkedDevice._id !== selectedDeviceId) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${location._id}/devices/${currentlyLinkedDevice._id}/terminal`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ terminalId: null })
          }
        )
      }

      // If a new device is selected, link it
      if (selectedDeviceId && selectedDeviceId !== 'none') {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${location._id}/devices/${selectedDeviceId}/terminal`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ terminalId: terminalToLink._id })
          }
        )

        if (res.ok) {
          toast.success('Device linked successfully')
        } else {
          const data = await res.json()
          toast.error(data.error || 'Failed to link device')
        }
      } else {
        toast.success('Device unlinked successfully')
      }

      await loadData()
      setLinkDeviceDialogOpen(false)
      setTerminalToLink(null)
      setSelectedDeviceId('')
    } catch (error) {
      console.error('Error linking device:', error)
      toast.error('Failed to link device')
    }
  }

  // Check if location has valid address for Stripe Terminal
  const hasValidAddress = (location) => {
    return !!(location?.address1 && location?.city && location?.state && location?.postcode)
  }

  // Get locations with valid addresses
  const locationsWithAddress = locations.filter(hasValidAddress)

  if (loading) {
    return (
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-1">Terminal Management</h1>
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

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      {/* Header */}
      <div className="my-6 mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold mb-1">Terminal Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage Stripe payment terminals and link them to devices
          </p>
        </div>
        <Button
          className="cursor-pointer"
          onClick={() => setAddTerminalDialogOpen(true)}
          disabled={locationsWithAddress.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Terminal
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {locationsWithAddress.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 px-4 py-3 rounded-md mb-4">
          <p className="text-sm">
            <strong>Note:</strong> You need at least one location with a valid address to add terminals.
            Go to <a href="/manage/locations" className="underline">Locations</a> to set up addresses.
          </p>
        </div>
      )}

      {/* Terminals Table */}
      <div className="rounded-md border">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b bg-muted/50 hover:bg-muted/50">
              <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                <SortHeader column="label">Terminal Name</SortHeader>
              </th>
              <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                <SortHeader column="type">Type</SortHeader>
              </th>
              <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                <SortHeader column="location">Location</SortHeader>
              </th>
              <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                <SortHeader column="device">Linked Device</SortHeader>
              </th>
              <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                <SortHeader column="status">Status</SortHeader>
              </th>
              <th scope="col" className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {sortedTerminals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Terminal className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Terminals</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add a terminal to start accepting card payments
                  </p>
                  {locationsWithAddress.length > 0 && (
                    <Button
                      className="cursor-pointer"
                      onClick={() => setAddTerminalDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Terminal
                    </Button>
                  )}
                </td>
              </tr>
            ) : (
              sortedTerminals.map((terminal) => {
                const location = getLocationForTerminal(terminal)
                const linkedDevice = getLinkedDevice(terminal._id)

                return (
                  <tr key={terminal._id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium align-middle">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-muted-foreground" />
                        {terminal.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge variant={terminal.type === 'simulated' ? 'secondary' : 'default'}>
                        {terminal.type === 'simulated' ? 'Simulated' : 'Physical'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {location?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {linkedDevice ? (
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <span>{linkedDevice.name || 'Unnamed Device'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not linked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge variant={terminal.status === 'online' ? 'default' : 'secondary'}>
                        {terminal.status === 'online' ? (
                          <><Wifi className="h-3 w-3 mr-1" /> Online</>
                        ) : (
                          <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                        )}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setTerminalToLink(terminal)
                              const currentDevice = getLinkedDevice(terminal._id)
                              setSelectedDeviceId(currentDevice?._id || 'none')
                              setLinkDeviceDialogOpen(true)
                            }}
                          >
                            <LinkIcon className="mr-2 h-4 w-4" />
                            {linkedDevice ? 'Change Device' : 'Link Device'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setTerminalToEdit(terminal)
                              setEditTerminalLabel(terminal.label)
                              setEditTerminalDialogOpen(true)
                            }}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Rename Terminal
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive"
                            onClick={() => {
                              setTerminalToDelete(terminal)
                              setDeleteTerminalDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Terminal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Terminal Dialog */}
      <Dialog open={addTerminalDialogOpen} onOpenChange={setAddTerminalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Terminal</DialogTitle>
            <DialogDescription>
              Add a Stripe-compatible payment terminal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="location">Location *</Label>
              <Select
                value={newTerminal.locationId}
                onValueChange={(value) => setNewTerminal(prev => ({ ...prev, locationId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {locationsWithAddress.map(location => (
                    <SelectItem key={location._id} value={location._id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="label">Terminal Name *</Label>
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
              disabled={!newTerminal.label || !newTerminal.locationId}
            >
              Add Terminal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Terminal Dialog */}
      <Dialog open={editTerminalDialogOpen} onOpenChange={setEditTerminalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Terminal</DialogTitle>
            <DialogDescription>
              Update the terminal name
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="editLabel">Terminal Name</Label>
              <Input
                id="editLabel"
                placeholder="e.g., Cafe Counter"
                value={editTerminalLabel}
                onChange={(e) => setEditTerminalLabel(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setEditTerminalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleEditTerminal}
              disabled={!editTerminalLabel.trim()}
            >
              Save
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
            <AlertDialogCancel className="cursor-pointer" onClick={() => setTerminalToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="cursor-pointer" onClick={handleDeleteTerminal}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link Device Dialog */}
      <Dialog open={linkDeviceDialogOpen} onOpenChange={setLinkDeviceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Device to Terminal</DialogTitle>
            <DialogDescription>
              Select a device to link to "{terminalToLink?.label}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="device">Device</Label>
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Unlink)</SelectItem>
                  {terminalToLink && getAvailableDevicesForTerminal(
                    terminalToLink._id,
                    terminalToLink.location?._id || terminalToLink.location
                  ).map(device => (
                    <SelectItem key={device._id} value={device._id}>
                      {device.name || 'Unnamed Device'} ({device.locationName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {terminalToLink && getAvailableDevicesForTerminal(
                terminalToLink._id,
                terminalToLink.location?._id || terminalToLink.location
              ).length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No devices available at this location. Devices are registered when someone logs in.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setLinkDeviceDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="cursor-pointer" onClick={handleLinkDevice}>
              {selectedDeviceId && selectedDeviceId !== 'none' ? 'Link Device' : 'Unlink'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
