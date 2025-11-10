'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { CompanyForm } from './company-form';

export function AddCompanySheet({ onCompanyAdded, trigger, open, setOpen }) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external open state if provided, otherwise use internal state
  const isOpen = open !== undefined ? open : internalOpen;
  const handleOpenChange = setOpen || setInternalOpen;

  const handleSuccess = (company) => {
    handleOpenChange(false);
    if (onCompanyAdded) {
      onCompanyAdded(company);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && (
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
      )}
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Company</SheetTitle>
          <SheetDescription>
            Create a new company/organization for group purchases.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <CompanyForm
            onSuccess={handleSuccess}
            onCancel={() => handleOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
