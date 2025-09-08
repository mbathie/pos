'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import DiscountForm from './discount-form';

export default function DiscountEditSheet({ 
  isOpen, 
  onClose, 
  discount = null,
  onSuccess = null,
  onDelete = null
}) {
  const handleSuccess = (savedDiscount) => {
    if (onSuccess) {
      onSuccess(savedDiscount);
    }
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[75vw] sm:max-w-[75vw] overflow-y-auto flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>
            {discount ? 'Edit Discount' : 'Create New Discount'}
          </SheetTitle>
          <SheetDescription>
            {discount 
              ? `Update the details for ${discount.name}`
              : 'Create a new discount code for your products'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        <DiscountForm
          mode={discount ? 'edit' : 'create'}
          discountId={discount?._id}
          onSuccess={handleSuccess}
          onCancel={onClose}
          onDelete={handleDelete}
          isInSheet={true}
          showHeader={false}
          formId="discount-form-sheet"
        />
        </div>

        {/* Sheet footer with actions */}
        <div className="border-t px-6 py-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button type="submit" form="discount-form-sheet" className="cursor-pointer">
            {discount ? 'Update Discount' : 'Create Discount'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
