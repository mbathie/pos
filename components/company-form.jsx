'use client';

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";

// Validation schema for company
const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Valid contact email is required"),
  contactPhone: z.string().optional(),
  abn: z.string().optional(),
  address1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  notes: z.string().optional()
});

export function CompanyForm({ onSuccess, onCancel, initialData = null, hideActions = false, formId = 'company-form' }) {
  const [submitting, setSubmitting] = useState(false);
  const [company, setCompany] = useState({
    name: initialData?.name || "",
    abn: initialData?.abn || "",
    contactName: initialData?.contactName || "",
    contactEmail: initialData?.contactEmail || "",
    contactPhone: initialData?.contactPhone || "",
    notes: initialData?.notes || ""
  });
  const [address, setAddress] = useState({
    address1: initialData?.address?.address1 || "",
    address2: initialData?.address?.address2 || "",
    city: initialData?.address?.city || "",
    state: initialData?.address?.state || "",
    postcode: initialData?.address?.postcode || "",
    country: initialData?.address?.country || "Australia"
  });

  // Australian states
  const states = useMemo(() => [
    { value: 'NSW', label: 'NSW' },
    { value: 'VIC', label: 'VIC' },
    { value: 'QLD', label: 'QLD' },
    { value: 'WA', label: 'WA' },
    { value: 'SA', label: 'SA' },
    { value: 'TAS', label: 'TAS' },
    { value: 'ACT', label: 'ACT' },
    { value: 'NT', label: 'NT' }
  ], []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate company data
      const result = companySchema.safeParse({
        ...company,
        ...address
      });

      if (!result.success) {
        const errors = result.error.errors.map(err => err.message).join(', ');
        toast.error(errors);
        setSubmitting(false);
        return;
      }

      // Create or update company
      const method = initialData?._id ? 'PUT' : 'POST';
      const url = initialData?._id
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/companies/${initialData._id}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/companies`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...company,
          address
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(initialData?._id ? "Company updated successfully" : "Company added successfully");

        // Notify parent component
        if (onSuccess) {
          onSuccess(data.company);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save company");
      }
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error("An error occurred while saving the company");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {/* Company Information */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Company Name *</Label>
          <Input
            id="name"
            placeholder="Enter company name"
            value={company.name}
            onChange={(e) => setCompany({ ...company, name: e.target.value })}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="abn">ABN</Label>
          <Input
            id="abn"
            placeholder="Enter ABN (optional)"
            value={company.abn}
            onChange={(e) => setCompany({ ...company, abn: e.target.value })}
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <div className="text-sm font-medium">Contact Information</div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contactName">Contact Name *</Label>
          <Input
            id="contactName"
            placeholder="Enter contact name"
            value={company.contactName}
            onChange={(e) => setCompany({ ...company, contactName: e.target.value })}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contactEmail">Contact Email *</Label>
          <Input
            id="contactEmail"
            type="email"
            placeholder="Enter contact email"
            value={company.contactEmail}
            onChange={(e) => setCompany({ ...company, contactEmail: e.target.value })}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input
            id="contactPhone"
            placeholder="Enter contact phone (optional)"
            value={company.contactPhone}
            onChange={(e) => setCompany({ ...company, contactPhone: e.target.value })}
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <div className="text-sm font-medium">Address</div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="address1">Street Address</Label>
          <Input
            id="address1"
            placeholder="Enter street address"
            value={address.address1}
            onChange={(e) => setAddress({ ...address, address1: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="address2">Address Line 2</Label>
          <Input
            id="address2"
            placeholder="Unit, suite, etc. (optional)"
            value={address.address2}
            onChange={(e) => setAddress({ ...address, address2: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="Enter city"
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="state">State</Label>
            <Select value={address.state} onValueChange={(value) => setAddress({ ...address, state: value })}>
              <SelectTrigger id="state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {states.map(state => (
                  <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="postcode">Postcode</Label>
          <Input
            id="postcode"
            placeholder="Enter postcode"
            value={address.postcode}
            onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional notes (optional)"
          value={company.notes}
          onChange={(e) => setCompany({ ...company, notes: e.target.value })}
          rows={3}
        />
      </div>

      {/* Actions */}
      {!hideActions && (
        <div className="flex gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting} className="cursor-pointer flex-1">
            {submitting ? "Saving..." : initialData?._id ? "Update Company" : "Add Company"}
          </Button>
        </div>
      )}
    </form>
  );
}
