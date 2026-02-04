import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronRight } from 'lucide-react'
import { ProductThumbnail } from '@/components/product-thumbnail'
import { Badge } from '@/components/ui/badge'

export default function ShopTable({ products = [], onRowClick }) {
  return (
    <div className="rounded-lg overflow-hidden border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
            <TableHead className="text-foreground">Name</TableHead>
            <TableHead className="text-foreground">Tags</TableHead>
            <TableHead className="w-40 text-foreground">Variations</TableHead>
            <TableHead className="w-32 text-foreground">Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(!products || products.length === 0) ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No products yet. Click "New Product" to add one.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => {
              const variationCount = product.variations?.length || 0;
              return (
                <TableRow
                  key={product._id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => onRowClick?.(product)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ProductThumbnail
                        src={product.thumbnail || product.image}
                        alt={product.name}
                        size="sm"
                      />
                      {product.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {/* Deduplicate tags by _id */}
                      {[...new Map(product.tags?.map(t => [t._id, t]) || []).values()].map((tag) => (
                        <Badge key={tag._id} variant="outline" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {variationCount > 0 ? (
                      `${variationCount} ${variationCount === 1 ? 'variation' : 'variations'}`
                    ) : (
                      <span className="text-muted-foreground">No variations</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.publish ? "default" : "secondary"}>
                      {product.publish ? "Published" : "Unpublished"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
