'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Discounts from './discounts';
import { useRouter } from 'next/navigation';

// Inline version of discounts that can be embedded directly in forms or other components
export default function DiscountsInline({ 
  onSelect,
  selectedDiscounts = [],
  maxHeight = '400px',
  showAddButton = false
}) {
  const router = useRouter();

  const handleDiscountAction = (discount, action) => {
    if (action === 'select' && onSelect) {
      onSelect(discount);
    }
  };

  return (
    <div className="space-y-4">
      {showAddButton && (
        <div className="flex justify-end">
          <Button 
            size="sm"
            variant="outline"
            onClick={() => router.push('/manage/adjustments/create')} 
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2"/> New Adjustment
          </Button>
        </div>
      )}
      
      <div 
        className="overflow-y-auto border rounded-lg"
        style={{ maxHeight }}
      >
        <Discounts
          isPanel={true}
          onSelect={handleDiscountAction}
          selectedDiscounts={selectedDiscounts}
          showHeader={false}
          showActions={false}
          compact={true}
        />
      </div>
    </div>
  );
}
