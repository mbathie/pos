'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { z } from "zod";

import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"


export default function Customer({ open, onOpenChange, setConnectCustomer, connectCustomer, connectCustomerFn, requiresWaiver }) {
  const [ waiverCustomers, setWaiverCustomers ] = useState([])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const emailSchema = z.string().email();
  const nameSchema = z.string().min(1, "Name is required");


  const handleCreateCustomer = async () => {
    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + `/api/customers`, {
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

    onOpenChange(false)
    connectCustomerFn(customer)

    setError('');
    setName('');
    setEmail('');
    setPhone('');
  };
  

  useEffect(() => {
    async function getData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers?recentWaiver=1`);
        const data = await res.json()
        // console.log(data)
        setWaiverCustomers(data);
      } catch (error) {
        console.error("Failed to fetch waiver customers:", error);
      }
    }
    getData();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]-">
        <DialogHeader>
          <DialogTitle>
            Search customers
          </DialogTitle>
          <DialogDescription>
          </DialogDescription>
        </DialogHeader>

        {requiresWaiver &&
        <div className='flex text-sm flex-col gap-2'>
          {waiverCustomers.map((c) => {
            return (
              <div key={c._id} className='flex w-full items-center'>
                <div>{c.name}, {c.email}, {c.phone}</div>
                <div className='flex-1' />
                <div>
                  <Button 
                    variant="outline" size="sm"
                    onClick={() => {
                      onOpenChange(false)
                      connectCustomerFn(c)
                    }}
                  >
                    Select
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
        }

        <div className="flex gap-2">
          <SearchCustomers onOpenChange={onOpenChange} connectCustomerFn={connectCustomerFn} requiresWaiver={requiresWaiver}/>
        </div>

        {!requiresWaiver &&

          <div className='flex flex-col gap-2'>
            <Label>Or, Create a New Customer</Label>

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
                disabled={!nameSchema.safeParse(name).success || (email.trim() !== "" && !emailSchema.safeParse(email).success)}
              >
                Create Customer
              </Button>
            </div>
          </div>

        
        }

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


export function SearchCustomers({ onOpenChange, connectCustomerFn, requiresWaiver }) {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers?search=${encodeURIComponent(search)}&requiresWaiver=${requiresWaiver}`);
      const data = await res.json();
      console.log(data)
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
          className="w-full justify-between"
        >
          {value || "Search..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[460px] p-0">
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
                // console.log(customer);
                return (
                  <CommandItem
                    key={customer._id}
                    value={`${customer.name} ${customer.email} ${customer.memberId}`}
                    onSelect={() => {
                      setValue(`${customer.name} ${customer.email}`);
                      setOpen(false);
                      onOpenChange(false)
                      connectCustomerFn(customer)
                      // if (onOpenChange) onOpenChange(false);
                    }}
                  >
                    {customer.name} ({customer.email})
                    {/* <Check
                      className={cn(
                        "ml-auto",
                        value === `${customer.name} ${customer.email}` ? "opacity-100" : "opacity-0"
                      )}
                    /> */}
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