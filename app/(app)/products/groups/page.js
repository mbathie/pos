'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { toast } from 'sonner'
import ProductCategorySelector from '@/components/discounts/product-category-selector'

export default function ProductGroupsPage() {
  const [groups, setGroups] = useState([])
  const [categoriesWithProducts, setCategoriesWithProducts] = useState([])
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedProducts, setSelectedProducts] = useState(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    try {
      const [catRes, groupsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?menu=shop&includeProducts=true`),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/product-groups`)
      ])
      const catData = await catRes.json()
      const groupsData = await groupsRes.json()
      setCategoriesWithProducts(catData.categories || [])
      setGroups(groupsData.groups || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load data')
    }
  }

  async function handleCreate() {
    if (!name.trim()) return toast.error('Enter a group name')
    const price = parseFloat(amount)
    if (Number.isNaN(price)) return toast.error('Enter a valid amount')
    if (selectedProducts.size === 0) return toast.error('Select at least one product')

    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/product-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          amount: price,
          products: Array.from(selectedProducts)
        })
      })
      if (res.ok) {
        toast.success('Group created')
        setName('')
        setAmount('')
        setSelectedProducts(new Set())
        await fetchAll()
      } else {
        const e = await res.json()
        toast.error(e.error || 'Failed to create group')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex flex-col gap-6 w-full p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Create Product Group</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div>
              <label className='text-sm font-medium'>Group Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder='e.g., Coffee + Cake Combo' />
            </div>
            <div>
              <label className='text-sm font-medium'>Group Amount</label>
              <NumberInput value={amount} onChange={setAmount} prefix='$' placeholder='e.g., 12.00' />
            </div>
            <div className='md:col-span-3'>
              <label className='text-sm font-medium'>Products</label>
              <ProductCategorySelector
                categoriesWithProducts={categoriesWithProducts}
                selectedProducts={selectedProducts}
                selectedCategories={new Set()}
                onSelectionChange={({ products }) => setSelectedProducts(products)}
                placeholder='Select products for this group'
              />
            </div>
          </div>
          <div className='flex justify-end'>
            <Button onClick={handleCreate} disabled={loading} className='cursor-pointer'>Create Group</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {groups.map(g => (
              <div key={g._id} className='border rounded-lg p-3'>
                <div className='font-medium'>{g.name}</div>
                <div className='text-sm text-muted-foreground'>${'{'}(g.amount || 0).toFixed(2){'}'}</div>
                <div className='mt-2 text-xs text-muted-foreground'>
                  {g.products?.length || 0} product(s)
                </div>
              </div>
            ))}
            {groups.length === 0 && (
              <div className='text-sm text-muted-foreground'>No groups yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

