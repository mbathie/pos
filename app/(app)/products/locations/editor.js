'use client'

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { MapPin } from "lucide-react"
import { Separator } from "@radix-ui/react-separator"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export default function Editor({ open, setOpen, selected, refetch }) {
  const [editedProducts, setEditedProducts] = useState([])

  useEffect(() => {
    if (selected) {
      const productsForSelectedLocation =
        selected.category.locationCounts.find(
          (loc) => loc.locationId === selected.location.locationId
        )?.products || []
      
      console.log(productsForSelectedLocation)

      setEditedProducts(productsForSelectedLocation)
    }
  }, [selected])

  const handleCheckboxChange = (checked, index) => {
    setEditedProducts(prev =>
      prev.map((product, i) =>
        i === index ? { ...product, enabled: checked } : product
      )
    )
  }

  const handleSave = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/${selected.location.locationId}/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: editedProducts }),
    })

    setOpen(false)
    refetch?.()
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen) setOpen(false)
    }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit availability</SheetTitle>
          <div className="flex flex-row space-x-2 items-center mt-1 text-sm text-muted-foreground">
            <MapPin size={20} className="mr-1" />
            <div>{selected?.location?.locationName}</div>
            <Separator orientation="vertical" className="bg-muted-foreground h-4 w-px" />
            <div>{selected?.category?.categoryName}</div>
          </div>
        </SheetHeader>

        <div className="px-4 flex flex-col space-y-4- overflow-y-auto max-h-[60vh] mt-4">
          {editedProducts.map((p, index) => (
            <div key={p.productId} className="flex items-center space-x-2">
              <Checkbox
                id={p.productId.toString()}
                checked={p.enabled}
                onCheckedChange={(checked) => handleCheckboxChange(checked, index)}
              />
              <img src={p.data.thumbnail} className="invert size-8 mr-2" />
              <Label htmlFor={p.productId.toString()}>{p.productName}</Label>
            </div>
          ))}
        </div>

        <SheetFooter className="mt-6">
          <Button type="button" onClick={handleSave}>Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}