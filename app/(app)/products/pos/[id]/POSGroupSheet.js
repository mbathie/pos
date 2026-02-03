'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ProductThumbnail } from '@/components/product-thumbnail';
import { Users } from 'lucide-react';

export default function POSGroupSheet({ open, onOpenChange, posInterfaceId, categoryId, onSuccess, insertAtOrder }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchGroups();
      setSelectedGroups(new Set());
    }
  }, [open]);

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/product-groups`);
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const handleAdd = async () => {
    if (selectedGroups.size === 0) {
      toast.error('Please select at least one group');
      return;
    }

    setLoading(true);
    try {
      // Get the POS interface to update it
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}`);
      const data = await res.json();
      const posInterface = data.interface;

      // Find the category and add items
      const categoryIndex = posInterface.categories.findIndex(c => c._id === categoryId);
      if (categoryIndex === -1) {
        throw new Error('Category not found');
      }

      const currentItems = posInterface.categories[categoryIndex].items || [];
      const groupIds = Array.from(selectedGroups);
      const count = groupIds.length;

      let updatedItems;
      if (insertAtOrder != null) {
        updatedItems = currentItems.map(item =>
          item.order >= insertAtOrder ? { ...item, order: item.order + count } : item
        );
        const newItems = groupIds.map((groupId, index) => ({
          itemType: 'group',
          itemId: groupId,
          order: insertAtOrder + index
        }));
        updatedItems = [...updatedItems, ...newItems];
      } else {
        const nextOrder = currentItems.length;
        const newItems = groupIds.map((groupId, index) => ({
          itemType: 'group',
          itemId: groupId,
          order: nextOrder + index
        }));
        updatedItems = [...currentItems, ...newItems];
      }

      // Update the category items
      posInterface.categories[categoryIndex].items = updatedItems;

      // Save the updated POS interface
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: posInterface.categories })
      });

      toast.success('Groups added successfully');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error adding groups:', error);
      toast.error('Failed to add groups');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader className="p-4">
          <SheetTitle>Add Groups</SheetTitle>
          <SheetDescription>
            Select product groups to add to this POS interface
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4 pt-0">
          <div className="flex flex-col gap-2">
            <Label>Groups</Label>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groups available</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                {groups.map((group) => (
                  <div
                    key={group._id}
                    className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleGroup(group._id)}
                  >
                    <Checkbox
                      checked={selectedGroups.has(group._id)}
                      onCheckedChange={() => toggleGroup(group._id)}
                    />
                    <ProductThumbnail
                      src={group.thumbnail}
                      alt={group.name}
                      size="sm"
                      fallbackIcon={Users}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${group.amount?.toFixed(2)} · {group.products?.length || 0} products
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedGroups.size} group{selectedGroups.size !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>

        <SheetFooter className="p-4 pt-0">
          <div className="flex gap-2 flex-1">
            <Button
              className="cursor-pointer"
              onClick={handleAdd}
              disabled={loading || selectedGroups.size === 0}
            >
              {loading ? 'Adding...' : 'Add'}
            </Button>
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
