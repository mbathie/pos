import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tag, Ellipsis, Loader2, CheckCircle, Save, ChevronRight, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import colors from 'tailwindcss/colors';

export default function ProductsTable({ 
  products, 
  onProductClick,
  setToDelete,
  setDeleteOpen,
  isDirty,
  saving
}) {
  return (
    <div className="rounded-lg overflow-hidden border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
            <TableHead className="w-16 text-foreground"></TableHead>
            <TableHead className="text-foreground">Name</TableHead>
            <TableHead className="w-24 text-foreground">Folder</TableHead>
            <TableHead className="w-32 text-foreground">Bump</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
        {!products || products.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
              No products found. Click "New Product" to add one.
            </TableCell>
          </TableRow>
        ) : products.map((p, pIdx) => (
          <TableRow 
            key={p._id || pIdx} 
            className="cursor-pointer hover:bg-muted/30 transition-colors border-b"
            onClick={() => onProductClick(p, pIdx)}
          >
            <TableCell onClick={(e) => e.stopPropagation()}>
              {!p?.thumbnail ? (
                <div className="bg-muted rounded-lg w-10 h-10 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
              ) : (
                <img className='rounded-lg w-10 h-10 object-cover' src={p.thumbnail} alt="Thumbnail" />
              )}
            </TableCell>
            
            <TableCell className="">
              {p.name}
            </TableCell>
            
            <TableCell>
              {p.folder?.color && (
                <div
                  style={{ backgroundColor: colors?.[p.folder.color.split('-')[0]]?.[p.folder.color.split('-')[1]] }}
                  className="w-6 h-6 rounded-md border"
                  title={p.folder?.name}
                />
              )}
            </TableCell>
            
            <TableCell>
              {p.bump !== false && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </TableCell>
            
            <TableCell onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size="sm">
                      <Ellipsis className='size-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setToDelete({ pIdx, product: p });
                        setDeleteOpen(true);
                      }}
                    >
                      Delete Product
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* <ChevronRight className="h-4 w-4 text-muted-foreground" /> */}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}