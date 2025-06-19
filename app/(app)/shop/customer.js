'use client'
import { useState } from 'react';
import { z } from "zod";
// import { useGlobals } from '@/lib/globals'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"


export default function Customer({ open, onOpenChange, setCustomer }) {
  // const { /* ... */ } = useGlobals();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const emailSchema = z.string().email();

  const handleCreateCustomer = async () => {
    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone }),
    });

    const customer = await res.json();
    if (!res.ok) {
      if (customer?.exists) {
        setError('A customer with this email already exists.');
      } else {
        setError(customer?.error || 'Failed to create customer.');
      }
      return;
    }

    setCustomer(customer)
    onOpenChange(false);
    setError('');
    setName('');
    setEmail('');
    setPhone('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
          </DialogTitle>
          <DialogDescription>
          </DialogDescription>
        </DialogHeader>

        <Label className="text-md">Search Customers</Label>
        <div className="flex gap-2">
          <SearchCustomers setCustomer={setCustomer} onOpenChange={onOpenChange} />
        </div>

        <div className='flex flex-col gap-2'>
          <Label className="text-md">Or, Create a New Customer</Label>

          <div className='flex gap-1'>
            <Label className="w-14">Name</Label>
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className='flex gap-1'>
            <Label className="w-14">Email</Label>
            <Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className='flex gap-1'>
            <Label className="w-14">Phone</Label>
            <Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className='flex ml-auto'>
            <Button
              onClick={handleCreateCustomer}
              disabled={!emailSchema.safeParse(email).success}
            >
              Create Customer
            </Button>
          </div>
        </div>

        <DialogFooter>
          {/* <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose> */}
          {/* <Button type="submit">Save changes</Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


export function SearchCustomers({ setCustomer, onOpenChange }) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")
  const [customers, setCustomers] = React.useState([]);
  const [input, setInput] = React.useState("");

  const searchCustomers = async (search) => {
    if (search.trim().length < 3) {
      setCustomers([]);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCustomers(data);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
      setCustomers([]);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[380px] justify-between"
        >
          {value || "Search..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0">
        <Command>
          <CommandInput
            placeholder="Search customer..."
            className="h-9"
            onValueChange={(val) => {
              setInput(val);
              if (val.trim().length >= 3) {
                searchCustomers(val);
              } else {
                setCustomers([]);
              }
            }}
          />
          <CommandList>
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup>
              {Array.isArray(customers) && customers.map((customer) => {
                console.log(customer);
                return (
                  <CommandItem
                    key={customer._id}
                    value={`${customer.name} ${customer.email}`}
                    onSelect={() => {
                      setValue(`${customer.name} ${customer.email}`);
                      setOpen(false);
                      setCustomer(customer);
                      if (onOpenChange) onOpenChange(false);
                    }}
                  >
                    {customer.name} ({customer.email})
                    <Check
                      className={cn(
                        "ml-auto",
                        value === `${customer.name} ${customer.email}` ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}