'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ProductThumbnail } from '@/components/product-thumbnail';
import { Package } from 'lucide-react';

export default function POSPrepaidSheet({ open, onOpenChange, posInterfaceId, categoryId, onSuccess, insertAtOrder }) {
  const [packs, setPacks] = useState([]);
  const [selectedPacks, setSelectedPacks] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPacks();
      setSelectedPacks(new Set());
    }
  }, [open]);

  const fetchPacks = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/prepaid-packs`);
      const data = await res.json();
      setPacks(data.packs || []);
    } catch (error) {
      console.error('Error fetching prepaid packs:', error);
    }
  };

  const handleAdd = async () => {
    if (selectedPacks.size === 0) {
      toast.error('Please select at least one prepaid pack');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}`);
      const data = await res.json();
      const posInterface = data.interface;

      const categoryIndex = posInterface.categories.findIndex(c => c._id === categoryId);
      if (categoryIndex === -1) {
        throw new Error('Category not found');
      }

      const currentItems = posInterface.categories[categoryIndex].items || [];
      const packIds = Array.from(selectedPacks);
      const count = packIds.length;

      let updatedItems;
      if (insertAtOrder != null) {
        updatedItems = currentItems.map(item =>
          item.order >= insertAtOrder ? { ...item, order: item.order + count } : item
        );
        const newItems = packIds.map((packId, index) => ({
          itemType: 'prepaid',
          itemId: packId,
          order: insertAtOrder + index
        }));
        updatedItems = [...updatedItems, ...newItems];
      } else {
        const nextOrder = currentItems.length;
        const newItems = packIds.map((packId, index) => ({
          itemType: 'prepaid',
          itemId: packId,
          order: nextOrder + index
        }));
        updatedItems = [...currentItems, ...newItems];
      }

      posInterface.categories[categoryIndex].items = updatedItems;

      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: posInterface.categories })
      });

      toast.success('Prepaid packs added successfully');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error adding prepaid packs:', error);
      toast.error('Failed to add prepaid packs');
    } finally {
      setLoading(false);
    }
  };

  const togglePack = (packId) => {
    setSelectedPacks(prev => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader className="p-4">
          <SheetTitle>Add Prepaid Packs</SheetTitle>
          <SheetDescription>
            Select prepaid packs to add to this POS interface
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4 pt-0">
          <div className="flex flex-col gap-2">
            <Label>Prepaid Packs</Label>
            {packs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prepaid packs available</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                {packs.map((pack) => (
                  <div
                    key={pack._id}
                    className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => togglePack(pack._id)}
                  >
                    <Checkbox
                      checked={selectedPacks.has(pack._id)}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => togglePack(pack._id)}
                    />
                    <ProductThumbnail
                      src={pack.thumbnail}
                      alt={pack.name}
                      size="sm"
                      fallbackIcon={Package}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{pack.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${pack.amount?.toFixed(2)} · {pack.passes} {pack.passes === 1 ? 'pass' : 'passes'} · {pack.products?.length || 0} products
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedPacks.size} pack{selectedPacks.size !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>

        <SheetFooter className="p-4 pt-0">
          <div className="flex gap-2 flex-1">
            <Button
              className="cursor-pointer"
              onClick={handleAdd}
              disabled={loading || selectedPacks.size === 0}
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
