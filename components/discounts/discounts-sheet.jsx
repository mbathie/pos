'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import Discounts from './discounts';
import DiscountEditSheet from './discount-edit-sheet';

export default function DiscountsSheet({ 
  isOpen, 
  onClose, 
  onSelect,
  selectedDiscounts = [],
  multiSelect = false,
  title = "Manage Discounts",
  subtitle = "Select and manage discount codes"
}) {
  const [localSelectedDiscounts, setLocalSelectedDiscounts] = useState(selectedDiscounts);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);

  // Reset local state when selectedDiscounts prop changes
  useEffect(() => {
    setLocalSelectedDiscounts(selectedDiscounts);
  }, [selectedDiscounts]);

  const handleSelect = (discount, action) => {
    if (action === 'select') {
      if (multiSelect) {
        const isAlreadySelected = localSelectedDiscounts.some(d => d._id === discount._id);
        if (isAlreadySelected) {
          setLocalSelectedDiscounts(prev => prev.filter(d => d._id !== discount._id));
        } else {
          setLocalSelectedDiscounts(prev => [...prev, discount]);
        }
      } else {
        setLocalSelectedDiscounts([discount]);
        if (onSelect) {
          onSelect(discount);
          onClose();
        }
      }
    }
  };

  const handleApply = () => {
    if (onSelect) {
      onSelect(localSelectedDiscounts);
    }
    onClose();
  };

  const handleCancel = () => {
    setLocalSelectedDiscounts(selectedDiscounts);
    onClose();
  };

  const handleNewAdjustment = () => {
    setEditingDiscount(null); // null means creating new
    setEditSheetOpen(true);
  };

  const handleEditDiscount = (discount) => {
    setEditingDiscount(discount);
    setEditSheetOpen(true);
  };

  const handleEditSuccess = (savedDiscount) => {
    // Refresh the discount list by triggering a re-render
    // The Discounts component will handle fetching fresh data
    setEditSheetOpen(false);
    setEditingDiscount(null);
  };

  return (
    <>
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <SheetContent className="w-[75vw] sm:max-w-[75vw] overflow-y-auto">

      {/* <SheetContent side="right" className="w-[600px] sm:max-w-[600px] flex flex-col p-0"> */}
        <SheetHeader className="px-6 -py-4 border-b">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Discounts
            isPanel={true}
            onSelect={handleSelect}
            selectedDiscounts={localSelectedDiscounts}
            multiSelect={multiSelect}
            showHeader={false}
            showActions={true}
            onRowClick={handleEditDiscount}
          />
        </div>

        {/* Footer */}
        <SheetFooter className="border-t px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {multiSelect && localSelectedDiscounts.length > 0 && (
                <span>{localSelectedDiscounts.length} discount{localSelectedDiscounts.length !== 1 ? 's' : ''} selected</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="cursor-pointer">
                Cancel
              </Button>
              <Button 
                onClick={handleNewAdjustment}
                className="cursor-pointer"
              >
                New Adjustment
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    {/* Edit Discount Sheet */}
    <DiscountEditSheet
      isOpen={editSheetOpen}
      onClose={() => {
        setEditSheetOpen(false);
        setEditingDiscount(null);
      }}
      discount={editingDiscount}
      onSuccess={handleEditSuccess}
    />
  </>
  );
}