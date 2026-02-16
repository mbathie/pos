import React, { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import ProductCategorySelector from '@/components/discounts/product-category-selector'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save, CheckCircle, Trash2, Plus, Info } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ProductThumbnail } from '@/components/product-thumbnail'

function initPrices(pack) {
  if (pack?.prices?.length) return pack.prices.map(p => ({ name: p.name || '', value: p.value != null ? String(p.value) : '', minor: !!p.minor }))
  // Legacy fallback: convert amount to a single price row
  if (pack?.amount != null) return [{ name: '', value: String(pack.amount), minor: false }]
  return [{ name: '', value: '', minor: false }]
}

export default function PrepaidSheet({ open, onOpenChange, pack, categoriesWithProducts, onSaved, onDeleted, setIconDialogOpen, setIconDialogQuery }) {
  const [name, setName] = useState(pack?.name || '')
  const [description, setDescription] = useState(pack?.description || '')
  const [passes, setPasses] = useState(pack?.passes != null ? String(pack.passes) : '')
  const [prices, setPrices] = useState(() => initPrices(pack))
  const [waiverRequired, setWaiverRequired] = useState(pack?.waiverRequired || false)
  const [selected, setSelected] = useState(new Set(pack?.products?.map(p => p._id || p) || []))
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const debounceRef = useRef(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Update local state if different pack opened
  React.useEffect(() => {
    setName(pack?.name || '')
    setDescription(pack?.description || '')
    setPasses(pack?.passes != null ? String(pack.passes) : '')
    setPrices(initPrices(pack))
    setWaiverRequired(pack?.waiverRequired || false)
    setSelected(new Set(pack?.products?.map(p => p._id || p) || []))
    setDirty(false)
  }, [pack?._id])

  function buildPayload() {
    return {
      name: name.trim(),
      description: description.trim(),
      passes: parseInt(passes, 10) || 0,
      prices: prices.map(p => ({
        name: p.name,
        value: parseFloat(p.value) || 0,
        minor: p.minor
      })),
      waiverRequired,
      products: Array.from(selected),
    }
  }

  // Auto-save when editing existing pack
  useEffect(() => {
    if (!pack?._id) return

    const nextPayload = buildPayload()

    const origPrices = initPrices(pack)
    const pricesChanged = JSON.stringify(prices.map(p => ({ name: p.name, value: p.value, minor: p.minor }))) !==
      JSON.stringify(origPrices.map(p => ({ name: p.name, value: p.value, minor: p.minor })))

    const original = {
      name: pack?.name || '',
      description: pack?.description || '',
      passes: pack?.passes != null ? String(pack.passes) : '',
      waiverRequired: pack?.waiverRequired || false,
      products: (pack?.products || []).map(p => p._id || p),
    }

    const changed = (
      nextPayload.name !== original.name ||
      nextPayload.description !== original.description ||
      passes !== original.passes ||
      pricesChanged ||
      nextPayload.waiverRequired !== original.waiverRequired ||
      nextPayload.products.length !== original.products.length ||
      nextPayload.products.some((id, i) => id !== original.products[i])
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/prepaid-packs/${pack._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextPayload)
        })
        if (!res.ok) throw new Error('Failed to save')
        const data = await res.json()
        onSaved?.(data.pack)
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
  }, [name, description, passes, prices, waiverRequired, selected, pack?._id])

  async function handleSave() {
    if (!name.trim()) return toast.error('Enter a pack name')
    if (!parseInt(passes, 10)) return toast.error('Enter the number of passes')
    const validPrices = prices.filter(p => p.value)
    if (validPrices.length === 0) return toast.error('Add at least one price with an amount')

    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/prepaid-packs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload())
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Failed to save pack')
      }
      const data = await res.json()
      toast.success('Pack created')
      onSaved?.(data.pack)
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!pack?._id) return onOpenChange(false)
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/prepaid-packs/${pack._id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete pack')
      toast.success('Pack deleted')
      onDeleted?.(pack)
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  function updatePrice(idx, field, value) {
    setPrices(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
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
                src={pack?.thumbnail}
                alt={name || 'Pack'}
                size="xl"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{pack?._id ? 'Edit Pack' : 'New Pack'}</h2>
            </div>

            {/* Auto-save indicator */}
            {pack?._id && (
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
            <Label>Pack Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder='e.g., 10 Class Pass' />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder='Optional description for this pack' rows={3} />
          </div>

          {/* Passes */}
          <div className="flex flex-col gap-2">
            <Label>Passes</Label>
            <NumberInput
              value={passes}
              onChange={v => setPasses(v)}
              placeholder="e.g., 10"
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">Number of passes/credits included in this pack</p>
          </div>

          {/* Prices */}
          <div className="flex flex-col gap-2">
            {prices.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-row gap-2 items-center">
                  <Label className="w-32 text-xs">Price Name</Label>
                  <Label className="w-24 text-xs">Amount ($)</Label>
                  <Label className="flex items-center gap-1 text-xs">
                    Minor
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Price is for a minor, generally under 18 years old. Will require consent from a guardian or parent</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <div className="w-8"></div>
                </div>

                {prices.map((price, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={price.name}
                      onChange={e => updatePrice(idx, 'name', e.target.value)}
                      placeholder="e.g., Adult"
                      className="w-32 text-sm"
                    />
                    <NumberInput
                      value={price.value}
                      onChange={v => updatePrice(idx, 'value', v)}
                      placeholder="0.00"
                      className="w-24 text-sm"
                    />
                    <div className="flex items-center justify-center w-[50px]">
                      <Checkbox
                        checked={price.minor}
                        onCheckedChange={v => updatePrice(idx, 'minor', v)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 cursor-pointer"
                      onClick={() => setPrices(prev => prev.filter((_, i) => i !== idx))}
                      disabled={prices.length <= 1}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="default"
              size="sm"
              className="w-fit cursor-pointer"
              onClick={() => setPrices(prev => [...prev, { name: '', value: '', minor: false }])}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Price
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Products</Label>
            <ProductCategorySelector
              categoriesWithProducts={categoriesWithProducts}
              selectedProducts={selected}
              selectedCategories={new Set()}
              onSelectionChange={({ products }) => setSelected(products)}
              placeholder='Select products for this pack'
              showCategories={false}
              excludeTypes={['divider', 'category', 'membership']}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="waiver-required"
              checked={waiverRequired}
              onCheckedChange={(checked) => setWaiverRequired(checked)}
            />
            <Label htmlFor="waiver-required" className="cursor-pointer">Waiver Required</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Check if customers will be required to complete a waiver or not</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className='flex justify-between pt-4'>
            {pack?._id ? (
              <Button variant='destructive' className='cursor-pointer' onClick={() => setDeleteDialogOpen(true)} disabled={saving || autoSaving}>
                <Trash2 className='h-4 w-4 mr-1' />
                Delete Pack
              </Button>
            ) : <div />}
            {!pack?._id && (
              <Button onClick={handleSave} disabled={saving} className='cursor-pointer'>Create</Button>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Pack</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{pack?.name}&quot;? This action cannot be undone.
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
