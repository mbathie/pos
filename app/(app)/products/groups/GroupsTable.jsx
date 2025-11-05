import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronRight } from 'lucide-react'
import { ProductThumbnail } from '@/components/product-thumbnail'

export default function GroupsTable({ groups = [], onRowClick }) {
  return (
    <div className="rounded-lg overflow-hidden border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
            <TableHead className="text-foreground">Name</TableHead>
            <TableHead className="w-40 text-foreground">Amount</TableHead>
            <TableHead className="w-32 text-foreground">Products</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(!groups || groups.length === 0) ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No groups yet. Click "New Group" to add one.
              </TableCell>
            </TableRow>
          ) : (
            groups.map((g) => (
              <TableRow key={g._id} className="cursor-pointer hover:bg-muted/30" onClick={() => onRowClick?.(g)}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <ProductThumbnail
                      src={g.thumbnail}
                      alt={g.name}
                      size="sm"
                    />
                    {g.name}
                  </div>
                </TableCell>
                <TableCell>${(g.amount || 0).toFixed(2)}</TableCell>
                <TableCell>{g.products?.length || 0}</TableCell>
                <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

