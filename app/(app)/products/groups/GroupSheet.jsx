import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Button } from '@/components/ui/button'
import ProductCategorySelector from '@/components/discounts/product-category-selector'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Loader2, Save, CheckCircle, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTitle } from '@/components/ui/alert-dialog'

export default function GroupSheet({ open, onOpenChange, group, categoriesWithProducts, onSaved, onDeleted }) {
  const [name, setName] = useState(group?.name || '')
  const [amount, setAmount] = useState(group?.amount != null ? String(group.amount) : '')
  const [selected, setSelected] = useState(new Set(group?.products?.map(p => p._id || p) || []))
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const debounceRef = useRef(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Update local state if different group opened
  React.useEffect(() => {
    setName(group?.name || '')
    setAmount(group?.amount != null ? String(group.amount) : '')
    setSelected(new Set(group?.products?.map(p => p._id || p) || []))
    setDirty(false)
  }, [group?._id])

  // Auto-save when editing existing group
  useEffect(() => {
    if (!group?._id) return

    const nextPayload = {
      name: name.trim(),
      amount: parseFloat(amount),
      products: Array.from(selected)
    }
    const original = {
      name: group?.name || '',
      amount: group?.amount ?? NaN,
      products: (group?.products || []).map(p => p._id || p)
    }

    const changed = (
      nextPayload.name !== original.name ||
      (!Number.isNaN(nextPayload.amount) && nextPayload.amount !== original.amount) ||
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
  }, [name, amount, selected, group?._id])

  async function handleSave() {
    if (!name.trim()) return toast.error('Enter a group name')
    const value = parseFloat(amount)
    if (Number.isNaN(value)) return toast.error('Enter a valid amount')
    if (selected.size === 0) return toast.error('Select at least one product')

    setSaving(true)
    try {
      const url = group?._id ? `/api/product-groups/${group._id}` : '/api/product-groups'
      const method = group?._id ? 'PUT' : 'POST'
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${url}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), amount: value, products: Array.from(selected) })
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
          <div className='flex items-center justify-between'>
            <SheetTitle>{group?._id ? 'Edit Group' : 'New Group'}</SheetTitle>
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
          </div>
        </SheetHeader>
        <div className='space-y-4 mt-4'>
          <div>
            <label className='text-sm font-medium'>Group Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder='e.g., Morning Coffee Combo' />
          </div>
          <div>
            <label className='text-sm font-medium'>Group Amount ($)</label>
            <NumberInput value={amount} onChange={setAmount} prefix='$' placeholder='e.g., 10.00' />
          </div>
          <div>
            <label className='text-sm font-medium'>Products</label>
            <ProductCategorySelector
              categoriesWithProducts={categoriesWithProducts}
              selectedProducts={selected}
              selectedCategories={new Set()}
              onSelectionChange={({ products }) => setSelected(products)}
              placeholder='Select products for this group'
              excludeTypes={['divider']}
            />
          </div>
          <div className='flex justify-between'>
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
