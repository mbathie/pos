'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDownIcon, Plus, X, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { z } from "zod";
import { generateObjectId } from '@/lib/utils';
import { State } from 'country-state-city';

function DateOfBirthPicker({ value, onChange, label = "Date of birth" }) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(value ? new Date(value) : undefined);
  const userLocale = typeof window !== 'undefined' && navigator.language ? navigator.language : 'en-AU';

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    setOpen(false);
    if (onChange) {
      onChange(selectedDate);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <Label htmlFor="dob" className="px-1">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="dob"
            className="w-full justify-between font-normal"
          >
            {date ? date.toLocaleDateString(userLocale) : "Select date"}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            onSelect={handleDateSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function AddCustomerDialog({ onCustomerAdded }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    gender: ""
  });
  const [address, setAddress] = useState({
    address1: "",
    city: "",
    state: "",
    postcode: ""
  });
  const [dependents, setDependents] = useState([]);
  const [dependentDatePickerOpen, setDependentDatePickerOpen] = useState({});

  // Get Australian states using country-state-city package
  const states = useMemo(() => {
    const stateList = State.getStatesOfCountry('AU');
    return stateList.map(state => ({
      value: state.isoCode,
      label: state.isoCode // Use abbreviation (NSW, VIC, etc.)
    }));
  }, []);

  const customerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().min(1, "Phone is required"),
    dob: z.string().min(1, "Date of birth is required"),
    gender: z.string().min(1, "Gender is required"),
    address1: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    postcode: z.string().min(4, "Postcode must be at least 4 characters"),
  });

  const addDependent = () => {
    setDependents([...dependents, {
      _id: generateObjectId(),
      name: "",
      dob: "",
      gender: ""
    }]);
  };

  const updateDependent = (index, field, value) => {
    const updated = [...dependents];
    updated[index][field] = value;
    setDependents(updated);
  };

  const removeDependent = (index) => {
    setDependents(dependents.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate customer data
      const result = customerSchema.safeParse({
        ...customer,
        ...address
      });

      if (!result.success) {
        const errors = result.error.errors.map(err => err.message).join(', ');
        toast.error(errors);
        setSubmitting(false);
        return;
      }

      // Validate dependents
      const dependentsValid = dependents.every(dep =>
        dep.name && dep.name.trim() !== '' &&
        dep.dob && dep.dob !== '' &&
        dep.gender && dep.gender !== ''
      );

      if (dependents.length > 0 && !dependentsValid) {
        toast.error("All dependents must have complete information");
        setSubmitting(false);
        return;
      }

      // Create customer
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            ...customer,
            ...address
          },
          dependents
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Customer added successfully");

        // Reset form
        setCustomer({
          name: "",
          email: "",
          phone: "",
          dob: "",
          gender: ""
        });
        setAddress({
          address1: "",
          city: "",
          state: "",
          postcode: ""
        });
        setDependents([]);
        setOpen(false);

        // Notify parent component
        if (onCustomerAdded) {
          onCustomerAdded(data.customer);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to add customer");
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error("An error occurred while adding the customer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter customer information below. All fields are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Full name"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Phone number"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={customer.gender}
                  onValueChange={(value) => setCustomer({ ...customer, gender: value })}
                >
                  <SelectTrigger id="gender" className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DateOfBirthPicker
              value={customer.dob}
              onChange={(date) => setCustomer({ ...customer, dob: date?.toISOString().slice(0, 10) || '' })}
            />
          </div>

          {/* Address */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="address1">Address Line 1</Label>
              <Input
                id="address1"
                placeholder="Street address"
                value={address.address1}
                onChange={(e) => setAddress({ ...address, address1: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="City"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select
                  value={address.state}
                  onValueChange={(value) => setAddress({ ...address, state: value })}
                >
                  <SelectTrigger id="state" className="w-full">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  placeholder="Postcode"
                  value={address.postcode}
                  onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Dependents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Dependents (Optional)</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDependent}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Dependent
              </Button>
            </div>

            {dependents.map((dependent, index) => (
              <div key={dependent._id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Dependent {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDependent(index)}
                    className="cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Dependent name"
                    value={dependent.name}
                    onChange={(e) => updateDependent(index, 'name', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Date of Birth</Label>
                    <Popover
                      open={dependentDatePickerOpen[index] || false}
                      onOpenChange={(open) =>
                        setDependentDatePickerOpen(prev => ({ ...prev, [index]: open }))
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                        >
                          {dependent.dob ? new Date(dependent.dob).toLocaleDateString() : "Select date"}
                          <ChevronDownIcon />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dependent.dob ? new Date(dependent.dob) : undefined}
                          captionLayout="dropdown"
                          onSelect={(selectedDate) => {
                            updateDependent(index, 'dob', selectedDate ? selectedDate.toISOString().slice(0, 10) : '');
                            setDependentDatePickerOpen(prev => ({ ...prev, [index]: false }));
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={dependent.gender}
                      onValueChange={(value) => updateDependent(index, 'gender', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="cursor-pointer"
            >
              {submitting ? "Adding..." : "Add Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
