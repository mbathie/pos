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
        />
        </div>
      </SheetContent>
    </Sheet>
  );
}
