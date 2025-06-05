'use client'

import { useState, useEffect, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import Editor from './editor'
import { useImmer } from 'use-immer'

export default function Page() {
  const [locations, setLocations] = useState([])
  const [categories, setCategories] = useState([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [selected, setSelected] = useImmer(null)
  const [products, setProducts] = useImmer([])

  // Refactored fetch function
  const fetchProducts = useCallback(async () => {
    const res = await fetch(`/api/products`)
    const raw = await res.json()

    setCategories(raw)

    const uniqueLocations = [
      ...new Set(
        raw.flatMap((category) =>
          category.locationCounts.map((loc) => loc.locationName)
        )
      ),
    ]
    setLocations(uniqueLocations)
  }, [setCategories, setLocations])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleCellClick = (category, location) => {
    const locationData = category.locationCounts.find(
      (loc) => loc.locationId === location.locationId
    )

    setSelected({
      category,
      location,
      locationCounts: category.locationCounts,
    })

    setEditorOpen(true)
  }

  return (
    <Card className="mx-4">
      <CardHeader>
        <CardTitle className="flex text-lg">Products enabled by location</CardTitle>
        <CardDescription>Total number of products enabled by location and category. Click each number to edit product availability.</CardDescription>
      </CardHeader>
      <CardContent>
        <Editor
          open={editorOpen}
          setOpen={setEditorOpen}
          selected={selected}
          setSelected={setSelected}
          products={products}
          setProducts={setProducts}
          refetch={fetchProducts}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              {locations.map((loc, index) => (
                <TableHead key={index}>{loc}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.categoryId}>
                <TableCell>{category.categoryName}</TableCell>
                {locations.map((location) => {
                  const locationData = category.locationCounts.find(
                    (loc) => loc.locationName === location
                  )
                  return (
                    <TableCell
                      key={location}
                      className="cursor-pointer hover:underline"
                      onClick={() => handleCellClick(category, locationData)}
                    >
                      <Button size="sm" variant="outline" className="cursor-pointer">
                      {locationData ? `${locationData.enabledCount} / ${locationData.totalCount}` : '0 / 0'}
                      </Button>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}