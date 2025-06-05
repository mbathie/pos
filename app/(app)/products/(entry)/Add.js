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
import { useEffectHook } from './useVariation';

export default function Add({ open, onOpenChange, data, setProducts }) {
  const { addPrice } = useEffectHook(setProducts);

  const [ name, setName ] = useState("")
 
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new price group</DialogTitle>
          <DialogDescription>
            Add a new price group, i.e. Adult, Child, Youth
          </DialogDescription>
        </DialogHeader>

        <div className="flex space-x-2 my-4">
          <Input
            placeholder="Adult"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
            }}
          />
          <Button 
            onClick={() => {
              addPrice(data.productIdx, name);
              onOpenChange(false);
              setName("")
            }}
          >
            Save
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}