'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import PrepaidTable from './PrepaidTable'
import PrepaidSheet from './PrepaidSheet'
import IconSelect from '@/components/icon-select'
import { toast } from 'sonner'

export default function PrepaidPacksPage() {
  const [packs, setPacks] = useState([])
  const [categoriesWithProducts, setCategoriesWithProducts] = useState([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activePack, setActivePack] = useState(null)
  const [iconDialogOpen, setIconDialogOpen] = useState(false)
  const [iconDialogQuery, setIconDialogQuery] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [productsRes, packsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products`),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/prepaid-packs`)
      ])
      const productsData = await productsRes.json()
      const packsData = await packsRes.json()

      setCategoriesWithProducts([{
        _id: 'all',
        name: 'All Products',
        products: productsData.products || []
      }])
      setPacks(packsData.packs || [])
    } catch (e) {
      console.error(e)
      toast.error('Failed to load prepaid packs')
    }
  }

  const updateThumbnail = async (thumbnailUrl) => {
    if (!activePack?._id) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/prepaid-packs/${activePack._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnail: thumbnailUrl })
      })

      if (!res.ok) throw new Error('Failed to update thumbnail')

      const data = await res.json()

      setActivePack(data.pack)
      setPacks((prev) => {
        const idx = prev.findIndex(p => p._id === data.pack._id)
        if (idx === -1) return prev
        const copy = [...prev]
        copy[idx] = data.pack
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
          <h1 className='text-xl font-semibold mb-1'>Setup Prepaid Packs</h1>
          <p className='text-sm text-muted-foreground'>Create packs of prepaid passes for products</p>
        </div>
        <Button size='sm' className='cursor-pointer' onClick={() => { setActivePack(null); setSheetOpen(true) }}>
          <Plus className='size-4 mr-1' />
          New Pack
        </Button>
      </div>

      <PrepaidTable packs={packs} onRowClick={(p) => { setActivePack(p); setSheetOpen(true) }} />

      <PrepaidSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        pack={activePack}
        categoriesWithProducts={categoriesWithProducts}
        setIconDialogOpen={setIconDialogOpen}
        setIconDialogQuery={setIconDialogQuery}
        onSaved={(saved) => {
          setActivePack(saved)
          setPacks((prev) => {
            const idx = prev.findIndex(p => p._id === saved._id)
            if (idx === -1) return [saved, ...prev]
            const copy = [...prev]
            copy[idx] = saved
            return copy
          })
        }}
        onDeleted={(deleted) => setPacks((prev) => prev.filter(p => p._id !== deleted._id))}
      />

      <IconSelect
        open={iconDialogOpen}
        setOpen={setIconDialogOpen}
        query={iconDialogQuery}
        onIconSelected={(thumbnailUrl) => updateThumbnail(thumbnailUrl)}
      />
    </div>
  )
}
