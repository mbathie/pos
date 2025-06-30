'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"


export default function Customer({ open, onOpenChange, setCustomer, setCartCustomer, waiverCustomer }) {
  const [ customers, setCustomers ] = useState([])

  useEffect(() => {
    async function getData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/waivers`);
        const data = await res.json()
        console.log(data)
        setCustomers(data);
      } catch (error) {
        console.error("Failed to fetch waiver customers:", error);
      }
    }
    getData();
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]-">
        <DialogHeader>
          <DialogTitle>
            Search completed waivers
          </DialogTitle>
          <DialogDescription>
          </DialogDescription>
        </DialogHeader>

        <div className='flex text-sm'>
          {customers.map((c) => {
            return (
              <div key={c._id} className='flex w-full items-center'>
                <div>{c.name}, {c.email}, {c.phone}</div>
                <div className='flex-1' />
                <div>
                  <Button 
                    variant="outline" size="sm"
                    onClick={() => {
                      setCartCustomer({...waiverCustomer, customer: c})
                      // setWaiverCustomer({...waiverCustomer, customer: c})
                      onOpenChange(false)
                    }}
                  >
                    Select
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* <Label className="text-md">Search completed waivers</Label> */}
        <div className="flex gap-2">
          <SearchCustomers setCustomer={setCustomer} onOpenChange={onOpenChange} />
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