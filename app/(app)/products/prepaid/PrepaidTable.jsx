import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronRight } from 'lucide-react'
import { ProductThumbnail } from '@/components/product-thumbnail'

export default function PrepaidTable({ packs = [], onRowClick }) {
  return (
    <div className="rounded-lg overflow-hidden border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
            <TableHead className="text-foreground">Name</TableHead>
            <TableHead className="w-40 text-foreground">Products</TableHead>
            <TableHead className="w-32 text-foreground">Passes</TableHead>
            <TableHead className="w-32 text-foreground">Price</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(!packs || packs.length === 0) ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No prepaid packs yet. Click &quot;New Pack&quot; to add one.
              </TableCell>
            </TableRow>
          ) : (
            packs.map((p) => {
              const productCount = p.products?.length || 0
              return (
                <TableRow key={p._id} className="cursor-pointer hover:bg-muted/30" onClick={() => onRowClick?.(p)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ProductThumbnail
                        src={p.thumbnail}
                        alt={p.name}
                        size="sm"
                      />
                      {p.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {productCount > 0 ? (
                      `${productCount} ${productCount === 1 ? 'product' : 'products'}`
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>{p.passes}</TableCell>
                  <TableCell>${(p.amount || 0).toFixed(2)}</TableCell>
                  <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
