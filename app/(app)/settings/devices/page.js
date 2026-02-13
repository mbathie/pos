'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Monitor, LayoutGrid, CreditCard, MoreHorizontal, Trash2, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AddLocationSheet } from '@/components/add-location-sheet';
import { useGlobals } from '@/lib/globals';

export default function DevicesPage() {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [posInterfaces, setPosInterfaces] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [updating, setUpdating] = useState(null);

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deviceToRename, setDeviceToRename] = useState(null);
  const [newDeviceName, setNewDeviceName] = useState('');

  // Get current device from global state to check if we're updating ourselves
  const currentDevice = useGlobals(state => state.device);
  const setDevice = useGlobals(state => state.setDevice);
  const clearTerminalConnection = useGlobals(state => state.clearTerminalConnection);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
        setPosInterfaces(data.posInterfaces || []);
        setTerminals(data.terminals || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePosInterface = async (locationId, browserId, posInterfaceId) => {
    setUpdating(`${browserId}-pos`);
    try {
      // Remove from all POS interfaces first
      await fetch('/api/devices/update-pos-interface', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ browserId, posInterfaceId, locationId })
      });
      toast.success('POS interface updated');
      fetchDevices();
    } catch (error) {
      toast.error('Failed to update POS interface');
    } finally {
      setUpdating(null);
    }
  };

  const handleChangeTerminal = async (locationId, browserId, terminalId) => {
    setUpdating(`${browserId}-terminal`);
    try {
      await fetch('/api/devices/update-terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ browserId, terminalId, locationId })
      });

      // If this is the current device, update global state
      if (currentDevice?.browserId === browserId) {
        if (terminalId) {
          // Find the terminal details
          const terminal = terminals.find(t => t.id === terminalId);
          setDevice({
            ...currentDevice,
            terminal: terminal ? { _id: terminalId, label: terminal.label } : null
          });
        } else {
          // Terminal was removed
          setDevice({
            ...currentDevice,
            terminal: null
          });
          clearTerminalConnection();
        }
      }

      toast.success('Terminal updated');
      fetchDevices();
    } catch (error) {
      toast.error('Failed to update terminal');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteDevice = async (locationId, browserId) => {
    if (!confirm('Are you sure you want to remove this device?')) return;

    setUpdating(`${browserId}-delete`);
    try {
      await fetch(`/api/locations/${locationId}/devices/${browserId}`, {
        method: 'DELETE'
      });
      toast.success('Device removed');
      fetchDevices();
    } catch (error) {
      toast.error('Failed to remove device');
    } finally {
      setUpdating(null);
    }
  };

  const handleRenameDevice = async () => {
    if (!deviceToRename || !newDeviceName.trim()) return;

    setUpdating(`${deviceToRename.browserId}-rename`);
    try {
      const res = await fetch(`/api/locations/${deviceToRename.locationId}/devices/${deviceToRename.browserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeviceName.trim() })
      });

      if (res.ok) {
        // If this is the current device, update global state
        if (currentDevice?.browserId === deviceToRename.browserId) {
          setDevice({
            ...currentDevice,
            name: newDeviceName.trim()
          });
        }

        toast.success('Device renamed');
        setRenameDialogOpen(false);
        setDeviceToRename(null);
        setNewDeviceName('');
        fetchDevices();
      } else {
        toast.error('Failed to rename device');
      }
    } catch (error) {
      toast.error('Failed to rename device');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="size-8" />
      </div>
    );
  }

  const totalDevices = locations.reduce((sum, loc) => sum + (loc.devices?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Device Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage devices, POS interfaces, and payment terminals across your locations
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="secondary" className="text-sm">
          {locations.length} location{locations.length !== 1 ? 's' : ''}
        </Badge>
        <Badge variant="secondary" className="text-sm">
          {totalDevices} device{totalDevices !== 1 ? 's' : ''}
        </Badge>
        <Badge variant="secondary" className="text-sm">
          {posInterfaces.length} POS interface{posInterfaces.length !== 1 ? 's' : ''}
        </Badge>
        <Badge variant="secondary" className="text-sm">
          {terminals.length} terminal{terminals.length !== 1 ? 's' : ''}
        </Badge>
        <div className="ml-auto">
          <AddLocationSheet onSuccess={() => fetchDevices()}>
            <Button variant="outline" size="sm" className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </AddLocationSheet>
        </div>
      </div>

      {locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No locations found</p>
            <p className="text-sm text-muted-foreground mb-4">Create a location first to manage devices</p>
            <AddLocationSheet onSuccess={() => fetchDevices()}>
              <Button className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </AddLocationSheet>
          </CardContent>
        </Card>
      ) : (
        locations.map((location) => (
          <Card key={location._id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">{location.name}</CardTitle>
                <Badge variant="outline" className="ml-auto">
                  {location.devices?.length || 0} device{(location.devices?.length || 0) !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!location.devices || location.devices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No devices registered at this location</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Device</TableHead>
                      <TableHead>POS Interface</TableHead>
                      <TableHead>Payment Terminal</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {location.devices.map((device) => (
                      <TableRow key={device.browserId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{device.name || 'Unnamed Device'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={device.posInterface?._id || 'none'}
                            onValueChange={(value) => handleChangePosInterface(
                              location._id,
                              device.browserId,
                              value === 'none' ? null : value
                            )}
                            disabled={updating === `${device.browserId}-pos`}
                          >
                            <SelectTrigger className="w-[200px]">
                              {updating === `${device.browserId}-pos` ? (
                                <Spinner className="h-4 w-4" />
                              ) : (
                                <SelectValue placeholder="Select POS interface" />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">No interface</span>
                              </SelectItem>
                              {posInterfaces.map((pi) => (
                                <SelectItem key={pi._id} value={pi._id}>
                                  <div className="flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4" />
                                    {pi.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={device.terminal?.id || 'none'}
                            onValueChange={(value) => handleChangeTerminal(
                              location._id,
                              device.browserId,
                              value === 'none' ? null : value
                            )}
                            disabled={updating === `${device.browserId}-terminal`}
                          >
                            <SelectTrigger className="w-[200px]">
                              {updating === `${device.browserId}-terminal` ? (
                                <Spinner className="h-4 w-4" />
                              ) : (
                                <SelectValue placeholder="Select terminal" />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">No terminal</span>
                              </SelectItem>
                              {terminals.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    {t.label || t.id}
                                    {t.status === 'online' && (
                                      <Badge variant="default" className="ml-1 text-xs">Online</Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setDeviceToRename({
                                    browserId: device.browserId,
                                    locationId: location._id,
                                    name: device.name
                                  });
                                  setNewDeviceName(device.name || '');
                                  setRenameDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename Device
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive cursor-pointer"
                                onClick={() => handleDeleteDevice(location._id, device.browserId)}
                                disabled={updating === `${device.browserId}-delete`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Device
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Rename Device Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Device</DialogTitle>
            <DialogDescription>
              Enter a new name for this device.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="deviceName">Device Name</Label>
            <Input
              id="deviceName"
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              placeholder="Enter device name"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                setRenameDialogOpen(false);
                setDeviceToRename(null);
                setNewDeviceName('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleRenameDevice}
              disabled={!newDeviceName.trim() || updating === `${deviceToRename?.browserId}-rename`}
            >
              {updating === `${deviceToRename?.browserId}-rename` ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
