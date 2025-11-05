'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Star, ChevronRight, LayoutGrid } from 'lucide-react';
import { useGlobals } from '@/lib/globals';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';

export default function POSInterfacesPage() {
  const router = useRouter();
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newInterfaceName, setNewInterfaceName] = useState('');
  const { resetBreadcrumb } = useGlobals();

  useEffect(() => {
    resetBreadcrumb({ name: 'POS Interfaces', href: '/products/pos' });
    fetchInterfaces();
  }, []);

  const fetchInterfaces = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces`);
      const data = await res.json();
      setInterfaces(data.interfaces || []);
    } catch (error) {
      console.error('Error fetching POS interfaces:', error);
      toast.error('Failed to load POS interfaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInterface = async () => {
    if (!newInterfaceName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newInterfaceName }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('POS Interface created successfully');
        setCreateDialogOpen(false);
        setNewInterfaceName('');
        // Navigate to the new interface's edit page
        router.push(`/products/pos/${data.interface._id}`);
      } else {
        toast.error('Failed to create POS interface');
      }
    } catch (error) {
      console.error('Error creating POS interface:', error);
      toast.error('Failed to create POS interface');
    }
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 w-full flex flex-col py-4">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold mb-1">POS Interfaces</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage custom point of sale interfaces
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          New Interface
        </Button>
      </div>

      {interfaces.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium mb-2">No POS Interfaces</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get started by creating your first POS interface
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Create Interface
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b bg-muted/50 hover:bg-muted/50">
                <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Name
                </th>
                <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Devices
                </th>
                <th scope="col" className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-12"></th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {interfaces.map((iface) => (
                <tr
                  key={iface._id}
                  className="border-b cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/products/pos/${iface._id}`)}
                >
                  <td className="px-4 py-3 font-medium align-middle">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2">
                        {iface.isDefault && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                        {iface.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {iface.deviceCount > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {iface.deviceNames?.slice(0, 3).map((deviceName, idx) => (
                          <Badge key={idx}>
                            {deviceName}
                          </Badge>
                        ))}
                        {iface.deviceCount > 3 && (
                          <Badge variant="outline">+{iface.deviceCount - 3}</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No devices assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Interface Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create POS Interface</DialogTitle>
            <DialogDescription>
              Create a new custom point of sale interface
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newInterfaceName}
                onChange={(e) => setNewInterfaceName(e.target.value)}
                placeholder="e.g., Cafe POS, Bar POS"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateInterface} className="cursor-pointer">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
