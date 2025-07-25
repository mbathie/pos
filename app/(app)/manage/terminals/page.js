'use client'

import { useState, useEffect, Fragment } from 'react'
import { Plus, Terminal, Wifi, WifiOff, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useGlobals } from '@/lib/globals'
import {
  fetchTerminalsData,
  getTerminalsForLocation,
  getStatusColor,
  getStatusIconType,
  createInitialTerminalState,
  formatEmployeeDisplay,
  formatTerminalType,
  useTerminalManagement
} from './effects'

export default function TerminalsPage() {
  const { locations } = useGlobals()
  const [terminals, setTerminals] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [newTerminal, setNewTerminal] = useState(createInitialTerminalState())
  const [error, setError] = useState(null)

  const { handleAddTerminal, handleDeleteTerminal } = useTerminalManagement()

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    const result = await fetchTerminalsData()
    
    setTerminals(result.terminals)
    setEmployees(result.employees)
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
              {/* Commented out as per user changes */}
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
                    <SelectTrigger>
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

                <div className="flex flex-col gap-1">
                  <Label htmlFor="employee">Assigned Employee</Label>
                  <Select 
                    value={newTerminal.employeeId} 
                    onValueChange={(value) => setNewTerminal(prev => ({ ...prev, employeeId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((employee) => (
                        <SelectItem key={employee._id} value={employee._id}>
                          {formatEmployeeDisplay(employee)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="label">Terminal Label</Label>
                  <Input
                    id="label"
                    placeholder="e.g. Main Counter Terminal"
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
                      <SelectItem value="simulated">Simulated (Testing)</SelectItem>
                      <SelectItem value="physical">Physical Terminal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newTerminal.type === 'physical' && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="registrationCode">Registration Code</Label>
                    <Input
                      id="registrationCode"
                      placeholder="Enter terminal registration code"
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
                  disabled={!selectedLocationId || !newTerminal.label || !newTerminal.employeeId}
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
            <TableRow>
              <TableHead>Location / Terminal</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations?.map((location) => {
              const locationTerminals = getTerminalsForLocation(terminals, location._id)
              
              return (
                <Fragment key={location._id}>
                  {/* Location Row */}
                  <TableRow className="bg-muted/30-">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {location.name}
                        <Badge variant="secondary" className="ml-2">
                          {locationTerminals.length} terminal{locationTerminals.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="flex justify-end">
                      <Plus 
                        className="size-4 cursor-pointer" 
                        onClick={() => {
                          setSelectedLocationId(location._id)
                          setAddDialogOpen(true)
                        }}
                      />
                    </TableCell>
                  </TableRow>

                  {/* Terminal Rows */}
                  {locationTerminals.map((terminal) => (
                    <TableRow key={terminal._id} className="border-l-4 border-l-muted ml-4">
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-2">
                          <div className={`size-2 rounded-full ${terminal.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                          {terminal.label}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatTerminalType(terminal.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{terminal.employee?.name}</div>
                          <div className="text-sm text-muted-foreground">{terminal.employee?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${getStatusColor(terminal.status)}`}>
                          {getStatusIcon(terminal.status)}
                          <span className="capitalize">{terminal.status || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteTerminal(terminal._id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>

        {locations?.length === 0 && (
          <div className="text-center py-12">
            <Terminal className="size-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Locations Found</h3>
            <p className="text-muted-foreground mb-4">
              You need to create locations before you can add terminals
            </p>
            <Button variant="outline">
              Create Location
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 