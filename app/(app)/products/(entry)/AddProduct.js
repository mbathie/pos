'use client'

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button'
import { useProduct } from './useProduct';

export default function Add({ open, onOpenChange, data, setProducts, type }) {
  const [ name, setName ] = useState("")
  const { addProduct } = useProduct(setProducts);
 
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new product</DialogTitle>
          <DialogDescription>
            Examples might be Hourly Pass, Annual Membership, Advanced Bouldering Class
          </DialogDescription>
        </DialogHeader>

        <div className="flex space-x-2 my-4">
          <Input
            placeholder="i.e. Hourly Pass / Yearly Membership"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
            }}
          />
          <Button 
            onClick={() => {
              addProduct(name, type);
              onOpenChange(false);
              setName("");
            }}
          >
            Save
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}