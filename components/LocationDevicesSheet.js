'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, MoreHorizontal, Link as LinkIcon, Edit2, Monitor, CreditCard, Loader2, MapPin } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from 'sonner'

export function LocationDevicesSheet({
  open,
  onOpenChange,
  location,
  terminals,
  currentBrowserId,
  onDevicesUpdated,
  availableLocations = []
}) {
  const [devices, setDevices] = useState([])
  const [devicesLoading, setDevicesLoading] = useState(false)

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

  // Terminal linking
  const [linkTerminalDialogOpen, setLinkTerminalDialogOpen] = useState(false)
  const [deviceToLink, setDeviceToLink] = useState(null)
  const [selectedTerminalId, setSelectedTerminalId] = useState('')

  useEffect(() => {
    if (open && location) {
      loadDevices()
    }
  }, [open, location])

  const loadDevices = async () => {
    if (!location) return

    setDevicesLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${location._id}/devices`)
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

  const handleAddTerminal = async () => {
    if (!location || !newTerminal.label) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/terminals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTerminal,
          location: location._id
        })
      })

      if (res.ok) {
        const data = await res.json()
        const createdTerminal = data.terminal || data

        // If deviceToLink is set, automatically link the new terminal to that device
        if (deviceToLink && createdTerminal._id) {
          const linkRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${location._id}/devices/${deviceToLink._id}/terminal`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ terminalId: createdTerminal._id })
            }
          )

          if (linkRes.ok) {
            toast.success('Terminal added and linked successfully')
          } else {
            toast.success('Terminal added (linking failed)')
          }
        } else {
          toast.success('Terminal added successfully')
        }

        await loadDevices()
        if (onDevicesUpdated) onDevicesUpdated()
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
        await loadDevices()
        if (onDevicesUpdated) onDevicesUpdated()
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
    if (!deviceToLink || !location) return

    try {
      // Convert "none" to null for unlinking
      const terminalId = selectedTerminalId === 'none' ? null : selectedTerminalId

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${location._id}/devices/${deviceToLink._id}/terminal`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ terminalId })
        }
      )

      if (res.ok) {
        toast.success(terminalId ? 'Terminal linked successfully' : 'Terminal unlinked successfully')
        await loadDevices()
        setLinkTerminalDialogOpen(false)
        setDeviceToLink(null)
        setSelectedTerminalId('none')
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
    if (!deviceToEdit || !location || !deviceName.trim()) return

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${location._id}/devices/${deviceToEdit._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: deviceName })
        }
      )

      if (res.ok) {
        toast.success('Device renamed successfully')
        await loadDevices()
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
    if (!deviceToDelete || !location) return

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${location._id}/devices/${deviceToDelete._id}`,
        {
          method: 'DELETE'
        }
      )

      if (res.ok) {
        toast.success('Device removed successfully')
        await loadDevices()
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
    if (!deviceToMove || !location || !targetLocationId) return

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${location._id}/devices/${deviceToMove._id}/move`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetLocationId })
        }
      )

      if (res.ok) {
        toast.success('Device moved successfully')
        await loadDevices()
        if (onDevicesUpdated) onDevicesUpdated()
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

  const getAvailableTerminalsForDevice = (currentDeviceId) => {
    if (!location || !terminals) return []

    const locationTerminals = terminals.filter(t =>
      t.location === location._id || t.location?._id === location._id
    )

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

  const parseDeviceInfo = (device) => {
    const userAgent = device.metadata?.userAgent || ''

    // Detect OS
    let os = 'Unknown'
    if (userAgent.includes('Mac OS X')) os = 'Mac'
    else if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('iPad')) os = 'iPad'
    else if (userAgent.includes('iPhone')) os = 'iPhone'
    else if (userAgent.includes('Android')) os = 'Android'
    else if (userAgent.includes('Linux')) os = 'Linux'

    // Detect Browser
    let browser = 'Unknown'
    if (userAgent.includes('Edg/')) browser = 'Edge'
    else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) browser = 'Chrome'
    else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) browser = 'Safari'
    else if (userAgent.includes('Firefox/')) browser = 'Firefox'

    return `${os} / ${browser}`
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{location?.name}</SheetTitle>
            <SheetDescription>
              Manage devices and terminals for this location
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 p-4 pt-0">
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
                  {devices.map((device) => (
                    <div key={device._id} className="border rounded-md p-4">
                      <div className="flex items-start justify-between">
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
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{device.name || 'Unnamed Device'}</span>
                            <span className="text-sm text-muted-foreground">({parseDeviceInfo(device)})</span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Last seen: {formatLastSeen(device.lastSeen)}
                          </div>
                          {device.terminal ? (
                            <div className="mt-2">
                              <Badge variant="default">
                                <CreditCard className="h-3 w-3 mr-1" />
                                {device.terminal.label}
                              </Badge>
                            </div>
                          ) : (
                            <div className="mt-2">
                              <Badge variant="outline">No terminal linked</Badge>
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
                                setDeviceToLink(device)
                                setAddTerminalDialogOpen(true)
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Terminal
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
                              <MapPin className="mr-2 h-4 w-4" />
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
                    </div>
                  ))}
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
              Add a Stripe-compatible terminal to {location?.name}
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
                  {getAvailableTerminalsForDevice(deviceToLink?._id).map(terminal => (
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
            <DialogTitle>Move Device to Location</DialogTitle>
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
                  {availableLocations
                    .filter(loc => loc._id !== location?._id)
                    .map(loc => (
                      <SelectItem key={loc._id} value={loc._id}>
                        {loc.name}
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
    </>
  )
}
