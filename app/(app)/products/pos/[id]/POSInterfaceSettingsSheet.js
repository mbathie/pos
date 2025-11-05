'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function POSInterfaceSettingsSheet({ open, onOpenChange, posInterface, onSuccess }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (open && posInterface) {
      setName(posInterface.name || '');

      // Load existing device assignments
      if (posInterface.devices) {
        const deviceKeys = posInterface.devices.map(d => {
          // Handle both populated (object) and unpopulated (string) locationId
          const locId = typeof d.locationId === 'object' ? d.locationId._id : d.locationId;
          return `${locId}-${d.browserId}`;
        });
        setSelectedDevices(new Set(deviceKeys));
      } else {
        setSelectedDevices(new Set());
      }

      fetchLocations();
    }
  }, [open, posInterface]);

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations`);
      const data = await res.json();
      // API returns array directly, not wrapped in object
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load locations');
    }
  };

  const handleDeviceToggle = (locationId, browserId) => {
    const key = `${locationId}-${browserId}`;
    setSelectedDevices(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setLoading(true);
    try {
      // Convert selected devices to array format
      const devices = Array.from(selectedDevices).map(key => {
        const [locationId, browserId] = key.split('-');
        return { locationId, browserId };
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterface._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, devices }),
        }
      );

      if (res.ok) {
        toast.success('Settings updated successfully');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterface._id}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        toast.success('POS interface deleted');
        setDeleteDialogOpen(false);
        onOpenChange(false);
        router.push('/products/pos');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting POS interface:', error);
      toast.error('Failed to delete POS interface');
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader className="p-4">
            <SheetTitle>POS Interface Settings</SheetTitle>
            <SheetDescription>
              Configure name and device assignments for this POS interface
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 p-4 pt-0">
            <div className="flex flex-col gap-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Cafe POS, Bar POS"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Assigned Devices</Label>
              <p className="text-xs text-muted-foreground">
                Select which devices should use this POS interface
              </p>

              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {locations.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No locations or devices found
                  </div>
                ) : (
                  locations.map((location) => (
                    <div key={location._id} className="p-3">
                      <div className="font-medium text-sm mb-2">{location.name}</div>
                      {location.devices && location.devices.length > 0 ? (
                        <div className="space-y-2">
                          {location.devices.map((device) => {
                            const deviceKey = `${location._id}-${device.browserId}`;
                            const isSelected = selectedDevices.has(deviceKey);

                            return (
                              <div key={device.browserId} className="flex items-center gap-2">
                                <Checkbox
                                  id={deviceKey}
                                  checked={isSelected}
                                  onCheckedChange={() => handleDeviceToggle(location._id, device.browserId)}
                                />
                                <Label
                                  htmlFor={deviceKey}
                                  className="text-sm font-normal cursor-pointer flex-1"
                                >
                                  {device.name || device.browserId}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No devices</div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {selectedDevices.size} device{selectedDevices.size !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>

          <SheetFooter className="p-4 pt-0">
            <div className="flex flex-col gap-2 w-full">
              <Button
                className="cursor-pointer w-full"
                onClick={handleSave}
                disabled={loading || !name.trim()}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                className="cursor-pointer w-full"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="cursor-pointer w-full"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete POS Interface
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete POS Interface</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{posInterface?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction className="cursor-pointer" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
