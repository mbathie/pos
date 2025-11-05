'use client'

import { useState, useEffect, Fragment } from 'react'
import { Plus, Terminal, Wifi, WifiOff, Trash2, MoreHorizontal, Link, Unlink, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useGlobals } from '@/lib/globals'
import {
  fetchTerminalsData,
  getTerminalsForLocation,
  getStatusColor,
  getStatusIconType,
  createInitialTerminalState,
  formatTerminalType,
  useTerminalManagement
} from './effects'
import { useTerminalLink } from './useTerminalLink'
import { useRouter } from 'next/navigation'

export default function TerminalsPage() {
  const { locations: globalLocations, setLocations } = useGlobals()
  const router = useRouter()
  const [locations, setLocalLocations] = useState([])
  const [terminals, setTerminals] = useState([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [newTerminal, setNewTerminal] = useState(createInitialTerminalState())
  const [error, setError] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [terminalToDelete, setTerminalToDelete] = useState(null)

  const { handleAddTerminal, handleDeleteTerminal } = useTerminalManagement()
  const { 
    browserId, 
    linkTerminal, 
    unlinkTerminal, 
    isTerminalLinked, 
    getTerminalStatus 
  } = useTerminalLink()

  // Helper function to check if location has required address fields
  const hasCompleteAddress = (location) => {
    return location && 
           location.address1 && 
           location.city && 
           location.state && 
           location.postcode
  }

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])
  
  // Use local locations once loaded, fallback to global
  const displayLocations = locations.length > 0 ? locations : globalLocations

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch locations first
      const locationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations`)
      if (locationsRes.ok) {
        const locationsData = await locationsRes.json()
        setLocalLocations(locationsData)
        setLocations(locationsData) // Also update global state
      }
      
      // Then fetch terminals
      const result = await fetchTerminalsData()
      setTerminals(result.terminals)
      setError(result.error)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const onAddTerminal = async () => {
    const success = await handleAddTerminal(
      selectedLocationId,
      newTerminal,
      // onSuccess
      async (createdTerminal) => {
        // Automatically link the terminal to this POS
        if (createdTerminal && createdTerminal._id) {
          await linkTerminal(createdTerminal._id)
          // No need to check success - the UI will reflect the state after loadData()
        }
        
        // Refresh the data and close dialog
        loadData()
        setAddDialogOpen(false)
        setNewTerminal(createInitialTerminalState())
        setSelectedLocationId('')
        setError(null)
      },
      // onError
      (error) => {
        setError(error)
        console.error('Add terminal error:', error)
      }
    )
  }

  const onDeleteTerminal = async () => {
    if (!terminalToDelete) return
    
    const success = await handleDeleteTerminal(
      terminalToDelete._id,
      // onSuccess
      () => {
        loadData()
        setError(null)
        setDeleteDialogOpen(false)
        setTerminalToDelete(null)
      },
      // onError
      (error) => {
        setError(error)
        console.error('Delete terminal error:', error)
        setDeleteDialogOpen(false)
        setTerminalToDelete(null)
      }
    )
  }

  const openDeleteDialog = (terminal) => {
    setTerminalToDelete(terminal)
    setDeleteDialogOpen(true)
  }

  const getStatusIcon = (status) => {
    const iconType = getStatusIconType(status)
    return iconType === 'wifi' ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-1">Terminal Management</h1>
          <p className="text-sm text-muted-foreground">Loading terminals...</p>
        </div>
        <div className="rounded-md border p-4">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-8 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold mb-1">Terminal Management</h1>
            <p className="text-sm text-muted-foreground">Manage Stripe-compatible terminals for each location</p>
          </div>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="cursor-pointer"
                disabled={!displayLocations?.some(hasCompleteAddress)}
                title={!displayLocations?.some(hasCompleteAddress) ? "Setup location address first" : "Add new terminal"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Terminal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Terminal</DialogTitle>
                <DialogDescription>
                  Add a new Stripe-compatible terminal to a location
                </DialogDescription>
              </DialogHeader>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {typeof error === 'string' ? error : 'An error occurred'}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="location">Location</Label>
                  <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                    <SelectTrigger className='w-52'>
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {displayLocations?.filter(hasCompleteAddress).map((location) => (
                        <SelectItem key={location._id} value={location._id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>



                <div className="flex flex-col gap-1 w-52">
                  <Label htmlFor="label">Terminal Label</Label>
                  <Input
                    id="label"
                    placeholder="i.e. Cafe"
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
                    <SelectTrigger className='w-52'>
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
                      className='w-52'
                      id="registrationCode"
                      placeholder="i.e. shop-bell-thursday"
                      value={newTerminal.registrationCode}
                      onChange={(e) => setNewTerminal(prev => ({ ...prev, registrationCode: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" className="cursor-pointer" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="cursor-pointer"
                  onClick={onAddTerminal} 
                  disabled={!selectedLocationId || !newTerminal.label}
                >
                  Add Terminal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-4">
          {typeof error === 'string' ? error : 'An error occurred while loading data'}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b bg-muted/50 hover:bg-muted/50">
              <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Location / Terminal
              </th>
              <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Status
              </th>
              <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Linked
              </th>
              <th scope="col" className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {displayLocations?.map((location) => {
              const locationTerminals = getTerminalsForLocation(terminals, location._id)
              
              return (
                <Fragment key={location._id}>
                  {/* Location Row */}
                  <tr className="border-b bg-muted/30 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium align-middle">
                      {location.name}
                    </td>
                    <td className="px-4 py-3 align-middle"></td>
                    <td className="px-4 py-3 align-middle"></td>
                    <td className="px-4 py-3 text-right align-middle">
                      {hasCompleteAddress(location) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="cursor-pointer h-8 w-8"
                          onClick={() => {
                            setSelectedLocationId(location._id)
                            setAddDialogOpen(true)
                          }}
                          aria-label="Add terminal"
                          title="Add terminal"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => router.push(`/manage/locations/${location._id}`)}
                          title="Address required for terminal setup"
                        >
                          Setup Address
                        </Button>
                      )}
                    </td>
                  </tr>

                  {/* Terminal Rows */}
                  {locationTerminals.map((terminal) => (
                    <tr key={terminal._id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 align-middle pl-8">
                        {terminal.label}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className={`flex items-center gap-2 ${getStatusColor(terminal.status)}`}>
                          {getStatusIcon(terminal.status)}
                          <span className="capitalize">{terminal.status || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {terminal.browser && (
                          terminal.browser === browserId ? (
                            <Badge variant="default">
                              <Link className="h-3 w-3 mr-1" />
                              Linked
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Other POS
                            </span>
                          )
                        )}
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="cursor-pointer h-8 w-8"
                              aria-label="Terminal actions"
                              title="Terminal actions"
                            >
                              {getTerminalStatus(terminal._id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {terminal.browser ? (
                              <DropdownMenuItem 
                                className="cursor-pointer"
                                onClick={async () => {
                                  const success = await unlinkTerminal(terminal._id)
                                  if (success) {
                                    loadData()
                                  }
                                }}
                                disabled={getTerminalStatus(terminal._id) === 'unlinking'}
                              >
                                <Unlink className="mr-2 h-4 w-4" />
                                Unlink POS
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                className="cursor-pointer"
                                onClick={async () => {
                                  const success = await linkTerminal(terminal._id)
                                  if (success) {
                                    loadData()
                                  }
                                }}
                                disabled={getTerminalStatus(terminal._id) === 'linking'}
                              >
                                <Link className="mr-2 h-4 w-4" />
                                Link to this POS
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => openDeleteDialog(terminal)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete terminal
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </Fragment>
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
            You need to create locations before you can add terminals
          </p>
          <Button 
            className="cursor-pointer"
            onClick={() => router.push('/manage/locations/create')}
          >
            Create Location
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the terminal "{terminalToDelete?.label}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTerminalToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteTerminal}>
              Delete terminal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 