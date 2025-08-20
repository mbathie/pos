import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Tag, ChevronRight, Check, GripVertical, ChevronsUpDown } from 'lucide-react';
import colors from 'tailwindcss/colors';

// Sortable row component
function SortableRow({ product, pIdx, onProductClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow 
      ref={setNodeRef}
      style={style}
      className="cursor-pointer hover:bg-muted/30 transition-colors border-b"
      onClick={() => onProductClick(product, pIdx)}
    >
      <TableCell 
        className="w-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      
      <TableCell onClick={(e) => e.stopPropagation()}>
        {!product?.thumbnail ? (
          <div className="bg-muted rounded-lg w-10 h-10 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        ) : (
          <img className='rounded-lg w-10 h-10 object-cover' src={product.thumbnail} alt="Thumbnail" />
        )}
      </TableCell>
      
      <TableCell>
        {product.name}
      </TableCell>
      
      <TableCell>
        {product.folder && (
          <div className="flex items-center gap-2">
            <div
              style={{ 
                backgroundColor: colors?.[product.folder.color?.split('-')[0]]?.[product.folder.color?.split('-')[1]] 
              }}
              className="size-10 rounded-md border flex items-center justify-center flex-shrink-0"
            >
              <span className="text-xs font-semibold text-white/90">
                {product.folder.name
                  .split(' ')
                  .map(word => word[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
            </div>
          </div>
        )}
      </TableCell>
      
      <TableCell>
        {product.bump !== false && (
          <Check className="h-4 w-4 text-primary" />
        )}
      </TableCell>
      
      <TableCell>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </TableCell>
    </TableRow>
  );
}

export default function ProductsTable({ 
  products, 
  onProductClick,
  onProductsReorder
}) {
  const [sort, setSort] = useState({
    field: 'name',
    direction: 'asc'
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p._id === active.id);
      const newIndex = products.findIndex((p) => p._id === over.id);
      
      if (onProductsReorder) {
        onProductsReorder(arrayMove(products, oldIndex, newIndex));
      }
    }
  };

  const handleSort = (field) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Sort products based on current sort state
  const sortedProducts = [...(products || [])].sort((a, b) => {
    let aVal = a[sort.field];
    let bVal = b[sort.field];
    
    // Handle null/undefined values
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';
    
    // Convert to lowercase for string comparison
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    
    if (sort.direction === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });

  const SortableHeader = ({ field, children, className = "" }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/60 ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ChevronsUpDown className="size-4" />
      </div>
    </TableHead>
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="rounded-lg overflow-hidden border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
              <TableHead className="w-10 text-foreground"></TableHead>
              <TableHead className="w-16 text-foreground"></TableHead>
              <SortableHeader field="name" className="text-foreground">
                Name
              </SortableHeader>
              <TableHead className="w-16 text-foreground">Folder</TableHead>
              <SortableHeader field="bump" className="w-32 text-foreground">
                Bump
              </SortableHeader>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!sortedProducts || sortedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No products found. Click "New Product" to add one.
                </TableCell>
              </TableRow>
            ) : (
              <SortableContext
                items={sortedProducts.map(p => p._id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedProducts.map((p, pIdx) => (
                  <SortableRow
                    key={p._id || pIdx}
                    product={p}
                    pIdx={pIdx}
                    onProductClick={onProductClick}
                  />
                ))}
              </SortableContext>
            )}
          </TableBody>
        </Table>
      </div>
    </DndContext>
  );
}