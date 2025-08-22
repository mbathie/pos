import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tag, ChevronRight, Check } from 'lucide-react';
import { SvgIcon } from '@/components/ui/svg-icon';

export default function ProductsTable({ 
  products, 
  onProductClick,
  showType = false  // For classes page to show class/course type
}) {
  return (
    <div className="rounded-lg overflow-hidden border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
            <TableHead className="w-16 text-foreground"></TableHead>
            <TableHead className="text-foreground">Name</TableHead>
            {showType && (
              <TableHead className="w-32 text-foreground">Type</TableHead>
            )}
            <TableHead className="w-32 text-foreground">Waiver</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!products || products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showType ? 5 : 4} className="text-center text-muted-foreground">
                No products found. Click "New Product" to add one.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product, pIdx) => (
              <TableRow 
                key={product._id || pIdx}
                className="cursor-pointer hover:bg-muted/30 transition-colors border-b"
                onClick={() => onProductClick(product, pIdx)}
              >
                <TableCell>
                  {!product?.thumbnail ? (
                    <div className="bg-muted rounded-lg w-10 h-10 flex items-center justify-center">
                      <Tag className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="bg-muted rounded-lg w-10 h-10 flex items-center justify-center">
                      <SvgIcon
                        src={product.thumbnail}
                        alt={product.name}
                        className="w-6 h-6"
                      />
                    </div>
                  )}
                </TableCell>
                
                <TableCell>
                  {product.name}
                </TableCell>
                
                {showType && (
                  <TableCell>
                    <span className="capitalize">{product.type}</span>
                  </TableCell>
                )}
                
                <TableCell>
                  {product.waiverRequired && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </TableCell>
                
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}