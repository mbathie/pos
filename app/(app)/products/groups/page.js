'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import GroupsTable from './GroupsTable'
import GroupSheet from './GroupSheet'
import IconSelect from '@/components/icon-select'
import { toast } from 'sonner'

export default function ProductGroupsPage() {
  const [groups, setGroups] = useState([])
  const [categoriesWithProducts, setCategoriesWithProducts] = useState([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState(null)
  const [iconDialogOpen, setIconDialogOpen] = useState(false)
  const [iconDialogQuery, setIconDialogQuery] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [productsRes, groupsRes] = await Promise.all([
        // Load all products directly (categories are obsolete)
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products`),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/product-groups`)
      ])
      const productsData = await productsRes.json()
      const groupsData = await groupsRes.json()

      // Group products into a single category for the selector
      setCategoriesWithProducts([{
        _id: 'all',
        name: 'All Products',
        products: productsData.products || []
      }])
      setGroups(groupsData.groups || [])
    } catch (e) {
      console.error(e)
      toast.error('Failed to load groups')
    }
  }

  // Update thumbnail for active group
  const updateThumbnail = async (thumbnailUrl) => {
    if (!activeGroup?._id) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/product-groups/${activeGroup._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnail: thumbnailUrl })
      })

      if (!res.ok) throw new Error('Failed to update thumbnail')

      const data = await res.json()

      // Update both activeGroup and groups list
      setActiveGroup(data.group)
      setGroups((prev) => {
        const idx = prev.findIndex(g => g._id === data.group._id)
        if (idx === -1) return prev
        const copy = [...prev]
        copy[idx] = data.group
        return copy
      })
    } catch (e) {
      console.error(e)
      toast.error('Failed to update thumbnail')
    }
  }

  return (
    <div className='px-4 pt-2 w-full h-full flex flex-col py-4'>
      <div className='flex items-center justify-between mb-4'>
        <div>
          <h1 className='text-xl font-semibold mb-1'>Setup Product Groups</h1>
          <p className='text-sm text-muted-foreground'>Create groups of products with a fixed amount</p>
        </div>
        <Button size='sm' className='cursor-pointer' onClick={() => { setActiveGroup(null); setSheetOpen(true) }}>
          <Plus className='size-4 mr-1' />
          New Group
        </Button>
      </div>

      <GroupsTable groups={groups} onRowClick={(g) => { setActiveGroup(g); setSheetOpen(true) }} />

      <GroupSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        group={activeGroup}
        categoriesWithProducts={categoriesWithProducts}
        setIconDialogOpen={setIconDialogOpen}
        setIconDialogQuery={setIconDialogQuery}
        onSaved={(saved) => {
          setActiveGroup(saved)
          setGroups((prev) => {
            const idx = prev.findIndex(g => g._id === saved._id)
            if (idx === -1) return [saved, ...prev]
            const copy = [...prev]
            copy[idx] = saved
            return copy
          })
        }}
        onDeleted={(deleted) => setGroups((prev) => prev.filter(g => g._id !== deleted._id))}
      />

      {/* Icon Select Dialog */}
      <IconSelect
        open={iconDialogOpen}
        setOpen={setIconDialogOpen}
        query={iconDialogQuery}
        onIconSelected={(thumbnailUrl) => updateThumbnail(thumbnailUrl)}
      />
    </div>
  )
}
