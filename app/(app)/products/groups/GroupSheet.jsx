import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import ProductCategorySelector from '@/components/discounts/product-category-selector'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Loader2, Save, CheckCircle, Trash2, Plus, ChevronUp, ChevronDown, Info } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ProductThumbnail } from '@/components/product-thumbnail'

export default function GroupSheet({ open, onOpenChange, group, categoriesWithProducts, onSaved, onDeleted, setIconDialogOpen, setIconDialogQuery }) {
  const [name, setName] = useState(group?.name || '')
  const [selected, setSelected] = useState(new Set(group?.products?.map(p => p._id || p) || []))
  const [variations, setVariations] = useState(
    group?.variations?.length > 0
      ? group.variations.map(v => ({
          name: v.name || '',
          amount: v.amount != null ? String(v.amount) : '',
          products: new Set(v.products?.map(p => p._id || p) || [])
        }))
      : [{ name: '', amount: group?.amount != null ? String(group.amount) : '', products: new Set() }]
  )
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const debounceRef = useRef(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Update local state if different group opened
  React.useEffect(() => {
    setName(group?.name || '')
    setSelected(new Set(group?.products?.map(p => p._id || p) || []))
    setVariations(
      group?.variations?.length > 0
        ? group.variations.map(v => ({
            name: v.name || '',
            amount: v.amount != null ? String(v.amount) : '',
            products: new Set(v.products?.map(p => p._id || p) || [])
          }))
        : [{ name: '', amount: group?.amount != null ? String(group.amount) : '', products: new Set() }]
    )
    setDirty(false)
  }, [group?._id])

  // Helper to serialize variations for comparison and API
  const serializeVariations = (vars) => vars.map(v => ({
    name: v.name.trim(),
    amount: parseFloat(v.amount),
    products: Array.from(v.products)
  }))

  // Auto-save when editing existing group
  useEffect(() => {
    if (!group?._id) return

    const nextPayload = {
      name: name.trim(),
      products: Array.from(selected),
      variations: serializeVariations(variations)
    }

    const originalVariations = (group?.variations || []).map(v => ({
      name: v.name || '',
      amount: v.amount ?? NaN,
      products: (v.products || []).map(p => p._id || p)
    }))
    const original = {
      name: group?.name || '',
      products: (group?.products || []).map(p => p._id || p),
      variations: originalVariations
    }

    // Check if variations changed
    const variationsChanged = nextPayload.variations.length !== original.variations.length ||
      nextPayload.variations.some((v, i) => {
        const ov = original.variations[i]
        if (!ov) return true
        return v.name !== ov.name ||
          (!Number.isNaN(v.amount) && v.amount !== ov.amount) ||
          v.products.length !== ov.products.length ||
          v.products.some((id, j) => id !== ov.products[j])
      })

    const changed = (
      nextPayload.name !== original.name ||
      nextPayload.products.length !== original.products.length ||
      nextPayload.products.some((id, i) => id !== original.products[i]) ||
      variationsChanged
    )

    setDirty(changed)

    if (!changed) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      return
    }

    // Debounce PUT
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setAutoSaving(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/product-groups/${group._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextPayload)
        })
        if (!res.ok) throw new Error('Failed to save')
        const data = await res.json()
        onSaved?.(data.group)
        setDirty(false)
      } catch (e) {
        console.error(e)
      } finally {
        setAutoSaving(false)
      }
    }, 1200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [name, selected, variations, group?._id])

  async function handleSave() {
    if (!name.trim()) return toast.error('Enter a group name')
    if (variations.length === 0) return toast.error('Add at least one variation')

    // Validate all variations have name and amount
    for (let i = 0; i < variations.length; i++) {
      const v = variations[i]
      if (!v.name.trim()) return toast.error(`Enter a name for variation ${i + 1}`)
      const amount = parseFloat(v.amount)
      if (Number.isNaN(amount)) return toast.error(`Enter a valid price for variation "${v.name || i + 1}"`)
    }

    setSaving(true)
    try {
      const url = group?._id ? `/api/product-groups/${group._id}` : '/api/product-groups'
      const method = group?._id ? 'PUT' : 'POST'
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${url}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          products: Array.from(selected),
          variations: serializeVariations(variations)
        })
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Failed to save group')
      }
      const data = await res.json()
      toast.success('Group saved')
      onSaved?.(data.group)
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Variation management functions
  const updateVariation = (index, field, value) => {
    setVariations(prev => {
      const newVariations = [...prev]
      newVariations[index] = { ...newVariations[index], [field]: value }
      return newVariations
    })
  }

  const addVariation = () => {
    setVariations(prev => [...prev, { name: '', amount: '', products: new Set() }])
  }

  const deleteVariation = (index) => {
    if (variations.length <= 1) return toast.error('At least one variation is required')
    setVariations(prev => prev.filter((_, i) => i !== index))
  }

  const moveVariationUp = (index) => {
    if (index === 0) return
    setVariations(prev => {
      const newVariations = [...prev];
      [newVariations[index - 1], newVariations[index]] = [newVariations[index], newVariations[index - 1]]
      return newVariations
    })
  }

  const moveVariationDown = (index) => {
    if (index === variations.length - 1) return
    setVariations(prev => {
      const newVariations = [...prev];
      [newVariations[index], newVariations[index + 1]] = [newVariations[index + 1], newVariations[index]]
      return newVariations
    })
  }

  async function handleDelete() {
    if (!group?._id) return onOpenChange(false)
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/product-groups/${group._id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete group')
      toast.success('Group deleted')
      onDeleted?.(group)
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[75vw] sm:max-w-[75vw] overflow-y-auto p-4">

        <SheetHeader className='m-0 p-0 mt-4'>
          <SheetTitle className="flex items-center gap-4">
            <div
              className="cursor-pointer"
              onClick={() => {
                setIconDialogOpen(true);
                setIconDialogQuery(name);
              }}
            >
              <ProductThumbnail
                src={group?.thumbnail}
                alt={name || 'Group'}
                size="xl"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{group?._id ? 'Edit Group' : 'New Group'}</h2>
            </div>

            {/* Auto-save indicator */}
            {group?._id && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='flex items-center'>
                      {autoSaving ? (
                        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                      ) : dirty ? (
                        <Save className='h-5 w-5 text-orange-500 animate-pulse' />
                      ) : (
                        <CheckCircle className='h-5 w-5 text-primary' />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {autoSaving ? 'Saving...' : dirty ? 'Unsaved changes (auto-saves)' : 'All changes saved'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className='space-y-6 mt-4'>
          <div className="flex flex-col gap-2">
            <Label>Group Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder='e.g., Kids Party' />
          </div>

          <div className="flex flex-col gap-2">
            <div className='flex items-center gap-2'>
              <Label>Base Products</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Products included in all variations</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <ProductCategorySelector
              categoriesWithProducts={categoriesWithProducts}
              selectedProducts={selected}
              selectedCategories={new Set()}
              onSelectionChange={({ products }) => setSelected(products)}
              placeholder='Select base products for this group'
              showCategories={false}
              excludeTypes={['divider', 'category', 'membership']}
            />
          </div>

          <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-2'>
              <Label>Variations</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Each variation has its own price and can include additional products</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className='space-y-4'>
            {variations.map((variation, index) => (
              <div key={index} className='border rounded-lg p-4 space-y-3'>
                <div className='flex items-center gap-2'>
                  <div className='flex-1 flex gap-2'>
                    <div className='flex-1 flex flex-col gap-2'>
                      <Label>Variation Name</Label>
                      <Input
                        value={variation.name}
                        onChange={e => updateVariation(index, 'name', e.target.value)}
                        placeholder='e.g., with Pizza'
                      />
                    </div>
                    <div className='w-32 flex flex-col gap-2'>
                      <Label>Price ($)</Label>
                      <NumberInput
                        value={variation.amount}
                        onChange={val => updateVariation(index, 'amount', val)}
                        placeholder='25.00'
                      />
                    </div>
                  </div>
                  <div className='flex gap-1 pt-7'>
                    <Button
                      className="cursor-pointer"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveVariationUp(index)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      className="cursor-pointer"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveVariationDown(index)}
                      disabled={index === variations.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      className="cursor-pointer"
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteVariation(index)}
                      disabled={variations.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className='flex flex-col gap-2'>
                  <Label>Additional Products (optional)</Label>
                  <ProductCategorySelector
                    categoriesWithProducts={categoriesWithProducts}
                    selectedProducts={variation.products}
                    selectedCategories={new Set()}
                    onSelectionChange={({ products }) => updateVariation(index, 'products', products)}
                    placeholder='Select additional products for this variation'
                    showCategories={false}
                    excludeTypes={['divider', 'category', 'membership']}
                  />
                </div>
              </div>
            ))}

            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={addVariation}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Variation
            </Button>
            </div>
          </div>

          <div className='flex justify-between pt-4'>
            {group?._id ? (
              <Button variant='destructive' className='cursor-pointer' onClick={() => setDeleteDialogOpen(true)} disabled={saving || autoSaving}>
                <Trash2 className='h-4 w-4 mr-1' />
                Delete Group
              </Button>
            ) : <div />}
            {!group?._id && (
              <Button onClick={handleSave} disabled={saving} className='cursor-pointer'>Create</Button>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Group</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{group?.name}"? This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
