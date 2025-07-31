'use client'

import { useState, useEffect, Fragment } from 'react'
import { Plus, Terminal, Wifi, WifiOff, Trash2, MoreHorizontal, Link, Unlink, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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

export default function TerminalsPage() {
  const { locations } = useGlobals()
  const [terminals, setTerminals] = useState([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [newTerminal, setNewTerminal] = useState(createInitialTerminalState())
  const [error, setError] = useState(null)

  const { handleAddTerminal, handleDeleteTerminal } = useTerminalManagement()
  const { 
    browserId, 
    linkTerminal, 
    unlinkTerminal, 
    isTerminalLinked, 
    getTerminalStatus 
  } = useTerminalLink()

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    const result = await fetchTerminalsData()
    
    setTerminals(result.terminals)
    setError(result.error)
    setLoading(false)
  }

  const onAddTerminal = async () => {
    const success = await handleAddTerminal(
      selectedLocationId,
      newTerminal,
      // onSuccess
      () => {
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

  const onDeleteTerminal = async (terminalId) => {
    const success = await handleDeleteTerminal(
      terminalId,
      // onSuccess
      () => {
        loadData()
        setError(null)
      },
      // onError
      (error) => {
        setError(error)
        console.error('Delete terminal error:', error)
      }
    )
  }

  const getStatusIcon = (status) => {
    const iconType = getStatusIconType(status)
    return iconType === 'wifi' ? <Wifi className="size-4" /> : <WifiOff className="size-4" />
  }

  if (loading) {
    return (
      <Card className="mx-4">
        <CardHeader>
          <CardTitle className="text-lg">Terminal Management</CardTitle>
          <CardDescription>Loading terminals...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Terminal Management</CardTitle>
            <CardDescription>Manage Stripe-compatible terminals for each location</CardDescription>
          </div>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
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
                      {locations?.map((location) => (
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
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={onAddTerminal} 
                  disabled={!selectedLocationId || !newTerminal.label}
                >
                  Add Terminal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {typeof error === 'string' ? error : 'An error occurred while loading data'}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className='bg-muted'>
              <TableHead className='rounded-tl-lg'></TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Linked</TableHead>
              <TableHead className='rounded-tr-lg'></TableHead>
              {/* <TableHead colSpan={2}></TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations?.map((location) => {
              const locationTerminals = getTerminalsForLocation(terminals, location._id)
              
              return (
                <Fragment key={location._id}>
                  {/* Location Row */}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-medium-">
                      <div className="flex items-center gap-2">
                        {location.name}
                        {/* <Badge variant="secondary" className="ml-2">
                          {locationTerminals.length} terminal{locationTerminals.length !== 1 ? 's' : ''}
                        </Badge> */}
                      </div>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="flex justify-end">
                      <Plus 
                        className="size-4 cursor-pointer hover:text-primary" 
                        onClick={() => {
                          setSelectedLocationId(location._id)
                          setAddDialogOpen(true)
                        }}
                      />
                    </TableCell>
                  </TableRow>

                  {/* Terminal Rows */}
                  {locationTerminals.map((terminal) => (
                    <TableRow key={terminal._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* <div className={`size-2 rounded-full ${terminal.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} /> */}
                          {terminal.label}

                        </div>
                      </TableCell>
                      {/* <TableCell> */}
                        {/* <Badge variant="outline"> */}
                          {/* {formatTerminalType(terminal.type)} */}
                        {/* </Badge> */}
                      {/* </TableCell> */}
                      <TableCell>
                        <div className={`flex items-center gap-1 ${getStatusColor(terminal.status)}`}>
                          {getStatusIcon(terminal.status)}
                          <span className="capitalize">{terminal.status || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {terminal.browser && (
                          terminal.browser === browserId ? (
                            <Badge className="flex items-center gap-1">
                              <Link className="size-3" />
                              Linked
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Other POS
                            </span>
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-4 p-0">
                              {getTerminalStatus(terminal._id) ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="size-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {terminal.browser ? (
                              <DropdownMenuItem 
                                onClick={async () => {
                                  const success = await unlinkTerminal(terminal._id)
                                  if (success) {
                                    loadData() // Refresh terminals data
                                  }
                                }}
                                disabled={getTerminalStatus(terminal._id) === 'unlinking'}
                              >
                                <Unlink className="size-4" />
                                Unlink POS
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={async () => {
                                  const success = await linkTerminal(terminal._id)
                                  if (success) {
                                    loadData() // Refresh terminals data
                                  }
                                }}
                                disabled={getTerminalStatus(terminal._id) === 'linking'}
                              >
                                <Link className="size-4" />
                                Link POS
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => onDeleteTerminal(terminal._id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-4 text-destructive" />
                              Delete Terminal
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>

        {locations?.length === 0 && (
          <div className="text-center py-8">
            {/* <Terminal className="size-16 mx-auto mb-4 opacity-50" /> */}
            <h3 className="mb-2">No Locations Found</h3>
            <p className="text-muted-foreground mb-4">
              You need to create locations before you can add terminals
            </p>
            <Button>
              Create Location
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 