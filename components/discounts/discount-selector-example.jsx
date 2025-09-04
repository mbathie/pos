'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Percent, DollarSign, Tag } from 'lucide-react';
import DiscountsSheet from './discounts-sheet';

// Example component showing how to use DiscountsSheet in other parts of the app
export default function DiscountSelectorExample() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);

  const handleSelectDiscount = (discount) => {
    setSelectedDiscount(discount);
  };

  const formatValue = (value, type) => {
    if (type === 'percent') {
      return `${value}%`;
    } else {
      return `$${value}`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button 
          onClick={() => setIsPanelOpen(true)}
          variant="outline"
          className="cursor-pointer"
        >
          <Tag className="h-4 w-4 mr-2" />
          Select Discount
        </Button>

        {selectedDiscount && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="py-1 px-3">
              <span className="font-medium mr-2">{selectedDiscount.name}</span>
              {selectedDiscount.type === 'percent' ? (
                <Percent className="h-3 w-3 mr-1" />
              ) : (
                <DollarSign className="h-3 w-3 mr-1" />
              )}
              {formatValue(selectedDiscount.value, selectedDiscount.type)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDiscount(null)}
              className="cursor-pointer h-7 text-xs"
            >
              Remove
            </Button>
          </div>
        )}
      </div>

      <DiscountsSheet
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onSelect={handleSelectDiscount}
        selectedDiscounts={selectedDiscount ? [selectedDiscount] : []}
        multiSelect={false}
        title="Select Discount"
        subtitle="Choose a discount code to apply to this transaction"
      />
    </div>
  );
}

// Example with multi-select
export function DiscountMultiSelectorExample() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedDiscounts, setSelectedDiscounts] = useState([]);

  const handleSelectDiscounts = (discounts) => {
    setSelectedDiscounts(discounts);
  };

  const formatValue = (value, type) => {
    if (type === 'percent') {
      return `${value}%`;
    } else {
      return `$${value}`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <Button 
          onClick={() => setIsPanelOpen(true)}
          variant="outline"
          className="cursor-pointer"
        >
          <Tag className="h-4 w-4 mr-2" />
          Manage Discounts ({selectedDiscounts.length})
        </Button>

        {selectedDiscounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedDiscounts.map(discount => (
              <Badge key={discount._id} variant="secondary" className="py-1 px-3">
                <span className="font-medium mr-2">{discount.name}</span>
                {discount.type === 'percent' ? (
                  <Percent className="h-3 w-3 mr-1" />
                ) : (
                  <DollarSign className="h-3 w-3 mr-1" />
                )}
                {formatValue(discount.value, discount.type)}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <DiscountsSheet
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onSelect={handleSelectDiscounts}
        selectedDiscounts={selectedDiscounts}
        multiSelect={true}
        title="Manage Discounts"
        subtitle="Select multiple discount codes to apply"
      />
    </div>
  );
}