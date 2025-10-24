'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import GroupsTable from './GroupsTable'
import GroupSheet from './GroupSheet'
import { toast } from 'sonner'

export default function ProductGroupsPage() {
  const [groups, setGroups] = useState([])
  const [categoriesWithProducts, setCategoriesWithProducts] = useState([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [catRes, groupsRes] = await Promise.all([
        // Load all categories with their products across menus
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?includeProducts=true`),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/product-groups`)
      ])
      const catData = await catRes.json()
      const groupsData = await groupsRes.json()
      setCategoriesWithProducts(catData.categories || [])
      setGroups(groupsData.groups || [])
    } catch (e) {
      console.error(e)
      toast.error('Failed to load groups')
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
        onSaved={(saved) => {
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
    </div>
  )
}
