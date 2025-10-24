'use client';

import React, { useState, useEffect } from 'react';
import { useImmer } from 'use-immer';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, FolderPlus, PackagePlus, Minus, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from "sonner";
import colors from '@/lib/tailwind-colors';
import SortableCategory from './SortableCategory';
import IconSelect from '@/components/icon-select';
import { FolderManagementSheet } from '../shopold/FolderManagementSheet';
import StandaloneProductSheet from '../StandaloneProductSheet';
import { ProductThumbnail } from '@/components/product-thumbnail';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Draggable folder product component
function DraggableFolderProduct({ product, onProductClick, borderColor, tintColor }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `folder-product-${product._id}`,
    data: {
      type: 'folder-product',
      product: product
    },
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-24 h-32 flex flex-col text-center text-xs relative group flex-shrink-0"
    >
      {/* Drag handle - grip icon at top right */}
      <div
        className="absolute -top-1 -right-1 w-6 h-6 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white rounded-full flex items-center justify-center z-10"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3 h-3" />
      </div>
      
      {/* Clickable product content */}
      <div
        className="w-full h-full flex flex-col text-center cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onProductClick();
        }}
      >
        <div
          className="size-24 rounded-lg overflow-hidden relative"
          style={borderColor ? { border: `2px solid ${borderColor}` } : undefined}
        >
          <ProductThumbnail
            src={product.thumbnail || product.image}
            alt={product.name}
            size="2xl"
            className="size-24"
          />
          {tintColor && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: tintColor, opacity: 0.15 }}
            />
          )}
        </div>
        <div className="mt-1 font-medium">{product.name}</div>
        {/* Price not shown inside expanded folder panel */}
      </div>
    </div>
  );
}

// Simplified SortableItem component
function SortableItem({ item, isExpanded, onFolderClick, onProductClick, onDividerDelete, isDraggedOver, draggedItemType, isAdjacentToDragged, activeId, overId }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item._id,
    data: {
      type: item.type,
      item: item
    },
    // Disable layout change animations to avoid visual stretching when
    // crossing a full-width divider within the grid.
    animateLayoutChanges: () => false,
  });

  // Fixed dimensions to prevent stretching during drag
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: item.type === 'divider' ? '100%' : '96px',
    height: item.type === 'divider' ? '48px' : '128px',
    minWidth: item.type === 'divider' ? '100%' : '96px',
    minHeight: item.type === 'divider' ? '48px' : '128px',
    maxWidth: item.type === 'divider' ? '100%' : '96px',
    maxHeight: item.type === 'divider' ? '48px' : '128px',
    // Ensure grid items never stretch across the row when a full-width
    // divider participates in sorting animations.
    justifySelf: 'start',
    alignSelf: 'start',
    contain: 'layout paint',
    willChange: 'transform',
  };

  // Don't show drop indicator at all - let the user rely on visual placement
  // The adjacency check in handleDragEnd will handle adding to folder
  const showDropIndicator = false;

  // Divider rendering handled by separate non-sortable component below
  if (item.type === 'divider') return null;

  // Folder rendering
  if (item.type === 'folder') {
    const itemCount = item.products?.length || 0;
    const folderColor = colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]] || colors.blue[500];
    // Highlight folder only when it's expanded, a product is being dragged, AND hovering over it or its children
    const isHoveringOverFolder = overId === item._id;
    const isHoveringOverFolderChild = overId && overId.startsWith('folder-product-') && item.products?.some(p => `folder-product-${p._id}` === overId);

    const isExpandedAndReceivingDrag =
      isExpanded &&
      activeId &&
      draggedItemType === 'product' &&
      !activeId.startsWith('folder-product-') &&
      (isHoveringOverFolder || isHoveringOverFolderChild);

    // Folder tile (same rendering when expanded or collapsed; icon toggles)
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-24 h-32 flex flex-col text-center text-xs relative group"
      >
        {/* Drag handle - grip icon at top right */}
        <div
          className="absolute -top-1 -right-1 w-6 h-6 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white rounded-full flex items-center justify-center z-10"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3" />
        </div>

        {/* Clickable folder content */}
        <div
          className="w-full h-full flex flex-col text-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onFolderClick();
          }}
        >
          <div
            className={`size-24 rounded-lg flex items-center justify-center transition-all ${
              isExpandedAndReceivingDrag ? 'ring-2 ring-primary ring-offset-2 opacity-80' : ''
            }`}
            style={{ backgroundColor: folderColor }}
          >
            {isExpanded ? (
              <Minus strokeWidth={1} className="size-10 opacity-60" />
            ) : (
              <Plus strokeWidth={1} className="size-10 opacity-60" />
            )}
          </div>
          <div className="mt-1 font-medium">{item.name}</div>
          <div className="text-muted-foreground text-xs">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </div>
        </div>
      </div>
    );
  }

  // Product rendering
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-24 h-32 flex flex-col text-center text-xs relative group"
    >
      {/* Drag handle - grip icon at top right */}
      <div
        className="absolute -top-1 -right-1 w-6 h-6 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white rounded-full flex items-center justify-center z-10"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3 h-3" />
      </div>
      
      {/* Clickable product content */}
      <div
        className="w-full h-full flex flex-col text-center cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onProductClick();
        }}
      >
        <ProductThumbnail
          src={item.thumbnail || item.image}
          alt={item.name}
          size="2xl"
          className="size-24"
        />
        <div className="mt-1 font-medium">{item.name}</div>
        {item.variations && item.variations.length > 0 && (
          <div className="text-muted-foreground">
            ${parseFloat(item.variations[0].amount || 0).toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}

// Drag overlay component with fixed dimensions
function DragOverlayItem({ item }) {
  if (!item) return null;

  // Common container styles to prevent stretching
  const containerStyle = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 9999,
    transform: 'rotate(5deg)',
  };

  if (item.type === 'divider') {
    return (
      <div 
        className="w-48 h-12 bg-background border rounded-lg shadow-lg flex items-center justify-center flex-shrink-0"
        style={containerStyle}
      >
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {item.name}
        </span>
      </div>
    );
  }

  if (item.type === 'folder') {
    const itemCount = item.products?.length || 0;
    return (
      <div 
        className="w-24 h-32 flex flex-col text-center text-xs bg-background border rounded-lg shadow-lg p-2 flex-shrink-0"
        style={containerStyle}
      >
        <div
          className="size-20 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]] || colors.blue[500]
          }}
        >
          <Plus strokeWidth={1} className="size-8 opacity-60" />
        </div>
        <div className="mt-1 font-medium text-xs truncate">{item.name}</div>
        <div className="text-muted-foreground text-xs">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </div>
      </div>
    );
  }

  // Product
  return (
    <div 
      className="w-24 h-32 flex flex-col text-center text-xs bg-background border rounded-lg shadow-lg p-2 flex-shrink-0"
      style={containerStyle}
    >
      <ProductThumbnail
        src={item.thumbnail || item.image}
        alt={item.name}
        size="2xl"
        className="size-20 flex-shrink-0"
      />
      <div className="mt-1 font-medium text-xs truncate">{item.name}</div>
      {item.variations && item.variations.length > 0 && (
        <div className="text-muted-foreground text-xs">
          ${parseFloat(item.variations[0].amount || 0).toFixed(2)}
        </div>
      )}
    </div>
  );
}

// Non-sortable, full-width divider row. We keep it out of the SortableContext
// to avoid dnd-kit displacement artifacts across a 100% width row.
function DividerRow({ item, onDividerDelete, onMoveUp, onMoveDown }) {
  if (!item) return null;
  return (
    <div className="w-full col-span-full relative h-12">
      {/* Full-width line + label, rendered underneath the controls */}
      <div className="absolute inset-0 flex items-center">
        <div className="flex-1 h-px bg-border" />
        <div className="mx-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {item.name}
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>
      {/* Controls overlayed on the right so the line continues underneath */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={() => onMoveUp?.(item)}>
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={() => onMoveDown?.(item)}>
          <ArrowDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDividerDelete?.(item._id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function Page() {
  const [categories, setCategories] = useImmer([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useImmer([]); // All folders, products, and dividers in order
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);

  // Dialog states
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryThumbnail, setNewCategoryThumbnail] = useState('');
  const [categoryIconDialogOpen, setCategoryIconDialogOpen] = useState(false);

  const [folderSheetOpen, setFolderSheetOpen] = useState(false);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productIconDialogOpen, setProductIconDialogOpen] = useState(false);
  const [productIconQuery, setProductIconQuery] = useState('');
  const [dividerDialogOpen, setDividerDialogOpen] = useState(false);
  const [dividerName, setDividerName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?menu=shop`);
      const data = await res.json();
      if (data.categories && Array.isArray(data.categories)) {
        // Sort categories by order
        const sortedCategories = data.categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(sortedCategories);
        if (sortedCategories.length > 0) {
          handleSelectCategory(sortedCategories[0]);
        }
      }
    }
    fetchCategories();
  }, []);

  const handleSelectCategory = async (category) => {
    setSelectedCategory(category);

    // Fetch folders for this category
    const foldersRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders?category=${category._id}`);
    const foldersData = await foldersRes.json();

    // Fetch products for this category
    const categoryIdentifier = category.slug || category.name;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${categoryIdentifier}/products`);
    const data = await res.json();

    // Create unified items array
    const allItems = [];
    const foldersMap = {};

    // Process folders
    const allFolders = Array.isArray(foldersData) ? foldersData : [];
    allFolders.forEach(folder => {
      const folderItem = {
        ...folder,
        type: 'folder',
        products: []
      };
      foldersMap[folder._id] = folderItem;
      allItems.push(folderItem);
    });

    // Process products
    const productsData = Array.isArray(data.products) ? data.products : (data.products ? [data.products] : []);
    
    for (const product of productsData) {
      if (product.type === 'divider') {
        allItems.push({
          ...product,
          type: 'divider'
        });
      } else if (product.folder && product.folder._id && foldersMap[product.folder._id]) {
        // Add to folder's products array
        foldersMap[product.folder._id].products.push(product);
      } else {
        // Standalone product
        allItems.push({
          ...product,
          type: 'product'
        });
      }
    }

    // Sort all items by order
    allItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Sort products within folders
    Object.values(foldersMap).forEach(folder => {
      folder.products.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    setItems(allItems);
  };

  // Move divider up or down by one slot (non-sortable control)
  const moveDivider = async (divider, delta) => {
    const index = items.findIndex(i => i._id === divider._id);
    if (index === -1) return;
    const newIndex = Math.max(0, Math.min(items.length - 1, index + delta));
    if (newIndex === index) return;

    // Update UI optimistically
    setItems(draft => {
      const [moved] = draft.splice(index, 1);
      draft.splice(newIndex, 0, moved);
      draft.forEach((it, idx) => { it.order = idx; });
    });

    // Persist divider order
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${divider._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: { order: newIndex } })
      });
    } catch (err) {
      console.error('Error moving divider:', err);
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);

    // Find the dragged item
    const category = categories.find(c => c._id === active.id);
    const item = items.find(i => i._id === active.id);

    // Check if it's a folder product
    if (active.id.startsWith('folder-product-')) {
      const productId = active.id.replace('folder-product-', '');
      const folderProduct = items
        .filter(i => i.type === 'folder')
        .flatMap(folder => folder.products || [])
        .find(p => p._id === productId);

      setDraggedItem(folderProduct || null);
    } else {
      setDraggedItem(category || item || null);
    }
  };

  const handleDragOver = (event) => {
    const { over } = event;
    setOverId(over?.id || null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    setDraggedItem(null);

    if (!over || active.id === over.id) return;

    // Handle dragging a standalone product and dropping on a folder product (add to folder)
    if (!active.id.startsWith('folder-product-') && over.id.startsWith('folder-product-')) {
      const overProductId = over.id.replace('folder-product-', '');

      console.log('Dragging standalone product onto folder product:', {
        activeId: active.id,
        overId: over.id,
        overProductId
      });

      // Find the folder that contains the over product
      let targetFolder = null;
      for (const item of items) {
        if (item.type === 'folder') {
          const hasProduct = item.products?.some(p => p._id === overProductId);
          if (hasProduct) {
            targetFolder = item;
            break;
          }
        }
      }

      console.log('Target folder found:', targetFolder?.name);

      if (targetFolder) {
        try {
          // Add product to the folder
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${active.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product: {
                folder: targetFolder._id,
                order: targetFolder.products?.length || 0
              }
            })
          });

          if (res.ok) {
            console.log('Successfully added product to folder');
            if (selectedCategory) {
              await handleSelectCategory(selectedCategory);
            }
          }
        } catch (error) {
          console.error('Error adding product to folder:', error);
        }
        return;
      }
    }

    // Handle dragging folder products
    if (active.id.startsWith('folder-product-')) {
      const productId = active.id.replace('folder-product-', '');

      // Check if dropping on another folder product (reordering within folder)
      if (over.id.startsWith('folder-product-')) {
        const overProductId = over.id.replace('folder-product-', '');

        // Find both products and their parent folder
        let activeProduct = null;
        let overProduct = null;
        let parentFolder = null;

        for (const item of items) {
          if (item.type === 'folder') {
            const activeIdx = item.products?.findIndex(p => p._id === productId);
            const overIdx = item.products?.findIndex(p => p._id === overProductId);

            if (activeIdx !== -1) {
              activeProduct = item.products[activeIdx];
            }
            if (overIdx !== -1) {
              overProduct = item.products[overIdx];
              parentFolder = item;
            }
          }
        }

        // If both products are in the same folder, reorder them
        if (activeProduct && overProduct && parentFolder) {
          try {
            const activeIdx = parentFolder.products.findIndex(p => p._id === productId);
            const overIdx = parentFolder.products.findIndex(p => p._id === overProductId);

            if (activeIdx !== -1 && overIdx !== -1) {
              // Move the product within the folder
              const newProducts = [...parentFolder.products];
              const [movedProduct] = newProducts.splice(activeIdx, 1);
              newProducts.splice(overIdx, 0, movedProduct);

              // Update order values for all products in the folder
              const updates = newProducts.map((product, index) =>
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${product._id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ product: { order: index } })
                })
              );

              await Promise.all(updates);

              if (selectedCategory) {
                await handleSelectCategory(selectedCategory);
              }
            }
          } catch (error) {
            console.error('Error reordering products in folder:', error);
          }
          return;
        }
      }

      // Otherwise, drag product out of folder
      let newOrder = items.length; // Default to end
      const overIndex = items.findIndex(i => i._id === over.id);
      if (overIndex !== -1) {
        newOrder = overIndex;
      }

      try {
        // Remove product from folder (set folder to null) and set correct order
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: {
              folder: null,
              order: newOrder
            }
          })
        });

        if (res.ok) {
          if (selectedCategory) {
            await handleSelectCategory(selectedCategory);
          }
        }
      } catch (error) {
        console.error('Error moving product out of folder:', error);
      }
      return;
    }

    // Handle category reordering
    if (categories.find(c => c._id === active.id)) {
      const oldIndex = categories.findIndex(c => c._id === active.id);
      const newIndex = categories.findIndex(c => c._id === over.id);

      // Update UI optimistically
      setCategories(draft => {
        const [movedCategory] = draft.splice(oldIndex, 1);
        draft.splice(newIndex, 0, movedCategory);
      });

      // Save to database
      try {
        const reorderedCategories = [...categories];
        const [movedCategory] = reorderedCategories.splice(oldIndex, 1);
        reorderedCategories.splice(newIndex, 0, movedCategory);

        // Update order values for all categories
        const updates = reorderedCategories.map((category, index) =>
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${category._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: index })
          })
        );

        await Promise.all(updates);
      } catch (error) {
        console.error('Error updating category order:', error);
      }

      return;
    }

    // Handle item reordering
    const activeIndex = items.findIndex(i => i._id === active.id);
    const overIndex = items.findIndex(i => i._id === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    const activeItem = items[activeIndex];
    const overItem = items[overIndex];

    // Handle dropping a product onto an EXPANDED empty folder
    // If folder is expanded and empty, allow adding to it
    if (activeItem.type === 'product' && overItem.type === 'folder') {
      const isFolderExpanded = expandedFolders.has(overItem._id);
      const isFolderEmpty = !overItem.products || overItem.products.length === 0;

      console.log('Dropping on folder:', {
        folderName: overItem.name,
        isExpanded: isFolderExpanded,
        isEmpty: isFolderEmpty
      });

      if (isFolderExpanded && isFolderEmpty) {
        try {
          // Add product to the empty folder
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${activeItem._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product: {
                folder: overItem._id,
                order: 0
              }
            })
          });

          if (res.ok) {
            console.log('Successfully added product to empty folder');
            if (selectedCategory) {
              await handleSelectCategory(selectedCategory);
            }
          }
        } catch (error) {
          console.error('Error adding product to folder:', error);
        }
        return;
      }
      // If folder is collapsed or not empty, treat as reordering (fall through below)
    }

    // Regular reordering (not dropping on folder)
    // Update items order
    setItems(draft => {
      // Move the item within the draft array
      const [movedItem] = draft.splice(activeIndex, 1);
      draft.splice(overIndex, 0, movedItem);
      
      // Update order values
      draft.forEach((item, index) => {
        item.order = index;
      });
    });

    // Save order to database
    try {
      const newOrder = overIndex;

      if (activeItem.type === 'folder') {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders/${activeItem._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: newOrder })
        });
      } else {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${activeItem._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product: { order: newOrder } })
        });
      }

    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleAddCategory = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName,
          thumbnail: newCategoryThumbnail,
          menu: 'shop'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(draft => {
          draft.push(data.category);
        });
        setNewCategoryName('');
        setNewCategoryThumbnail('');
        setAddCategoryOpen(false);
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryThumbnail(category.thumbnail || '');
    setEditCategoryOpen(true);
  };

  const handleUpdateCategory = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${editingCategory._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName,
          thumbnail: newCategoryThumbnail,
          slug: newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(draft => {
          const index = draft.findIndex(c => c._id === editingCategory._id);
          if (index !== -1) {
            draft[index] = data.category;
          }
        });
        setNewCategoryName('');
        setNewCategoryThumbnail('');
        setEditCategoryOpen(false);
        setEditingCategory(null);
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${categoryId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setCategories(draft => draft.filter(c => c._id !== categoryId));
        if (selectedCategory?._id === categoryId) {
          setSelectedCategory(categories[0] || null);
        }
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleFolderClick = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleFolderUpdated = async () => {
    if (selectedCategory) {
      await handleSelectCategory(selectedCategory);
    }
  };

  const handleFolderDeleted = async () => {
    if (selectedCategory) {
      await handleSelectCategory(selectedCategory);
    }
  };

  const handleProductClick = (productId) => {
    setSelectedProductId(productId);
    setProductSheetOpen(true);
  };

  const handleNewProduct = () => {
    if (!selectedCategory) {
      toast.error('Please select a category first');
      return;
    }
    const tempId = `new-${Date.now()}`;
    setSelectedProductId(tempId);
    setProductSheetOpen(true);
  };

  const handleNewDivider = () => {
    if (!selectedCategory) {
      toast.error('Please select a category first');
      return;
    }
    setDividerName('');
    setDividerDialogOpen(true);
  };

  const handleCreateDivider = async () => {
    if (!dividerName.trim()) {
      toast.error('Please enter a divider name');
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: dividerName,
            type: 'divider',
            category: selectedCategory._id,
            order: items.length
          }
        })
      });

      if (res.ok) {
        setDividerDialogOpen(false);
        setDividerName('');
        await handleSelectCategory(selectedCategory);
      }
    } catch (error) {
      console.error('Error creating divider:', error);
    }
  };

  const handleProductSaved = async () => {
    if (selectedCategory) {
      await handleSelectCategory(selectedCategory);
    }
  };

  const handleDividerDelete = async (dividerId) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${dividerId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        if (selectedCategory) {
          await handleSelectCategory(selectedCategory);
        }
      }
    } catch (error) {
      console.error('Error deleting divider:', error);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Categories */}
      <div className="flex flex-col w-56 bg-accent rounded-tr-lg overflow-y-auto h-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={categories.map(c => c._id)}>
            {categories.map((category) => (
              <SortableCategory
                key={category._id}
                category={category}
                isSelected={selectedCategory?._id === category._id}
                onSelect={() => handleSelectCategory(category)}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
              />
            ))}
          </SortableContext>
        </DndContext>

        <Button
          variant="outline"
          onClick={() => setAddCategoryOpen(true)}
          className="cursor-pointer h-12 rounded-none border-t border-x-0 border-b-0 justify-start gap-2"
        >
          <Plus className="size-4" />
          Add Category
        </Button>
      </div>

      {/* Right Panel - Items */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-end mb-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setFolderSheetOpen(true)}
              className="cursor-pointer"
            >
              <FolderPlus className="size-4 mr-1" />
              New Folder
            </Button>
            <Button
              size="sm"
              onClick={handleNewProduct}
              className="cursor-pointer"
            >
              <PackagePlus className="size-4 mr-1" />
              New Product
            </Button>
            <Button
              size="sm"
              onClick={handleNewDivider}
              className="cursor-pointer"
            >
              <Plus className="size-4 mr-1" />
              New Divider
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={[
            // Exclude dividers from sortable list to avoid grid stretch artifacts
            ...items.filter(i => i.type !== 'divider').map(i => i._id),
            ...items.filter(i => i.type === 'folder' && expandedFolders.has(i._id))
              .flatMap(folder => folder.products?.map(p => `folder-product-${p._id}`) || [])
          ]} strategy={rectSortingStrategy}>
            {/*
              Prevent grid children from stretching when a full-width divider
              is involved during drag-and-drop by explicitly aligning items
              to the start on both axes. This avoids the first item below a
              divider visually expanding to the full row width while dragging.
            */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-4 auto-rows-min justify-start items-start justify-items-start">
              {items.map((item) => (
                <React.Fragment key={item._id}>
                  {item.type === 'divider' ? (
                    <DividerRow
                      item={item}
                      onDividerDelete={handleDividerDelete}
                      onMoveUp={(div) => moveDivider(div, -1)}
                      onMoveDown={(div) => moveDivider(div, +1)}
                    />
                  ) : (
                    <SortableItem
                      item={item}
                      isExpanded={expandedFolders.has(item._id)}
                      onFolderClick={() => handleFolderClick(item._id)}
                      onProductClick={() => handleProductClick(item._id)}
                      onDividerDelete={handleDividerDelete}
                      isDraggedOver={false}
                      draggedItemType={draggedItem?.type}
                      isAdjacentToDragged={false}
                      activeId={activeId}
                      overId={overId}
                    />
                  )}
                  {/* When folder is expanded, render its items as peer grid items to keep spacing consistent */}
                  {item.type === 'folder' && expandedFolders.has(item._id) && item.products && item.products.length > 0 && (
                    item.products.map((product) => (
                      <DraggableFolderProduct
                        key={`inline-${product._id}`}
                        product={product}
                        onProductClick={() => handleProductClick(product._id)}
                        borderColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]] || colors.blue[500]}
                        tintColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]] || colors.blue[500]}
                      />
                    ))
                  )}
                </React.Fragment>
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            <DragOverlayItem item={draggedItem} />
          </DragOverlay>
        </DndContext>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a new shop category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Icon</label>
              <div className="flex items-center gap-2">
                {newCategoryThumbnail && (
                  <img src={newCategoryThumbnail} alt="Selected icon" className="size-8" />
                )}
                <Button
                  onClick={() => setCategoryIconDialogOpen(true)}
                  className="cursor-pointer"
                >
                  {newCategoryThumbnail ? 'Change Icon' : 'Select Icon'}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCategoryOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleAddCategory} className="cursor-pointer" disabled={!newCategoryName}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Icon</label>
              <div className="flex items-center gap-2">
                {newCategoryThumbnail && (
                  <img src={newCategoryThumbnail} alt="Selected icon" className="size-8" />
                )}
                <Button
                  variant="outline"
                  onClick={() => setCategoryIconDialogOpen(true)}
                  className="cursor-pointer"
                >
                  {newCategoryThumbnail ? 'Change Icon' : 'Select Icon'}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategoryOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory} className="cursor-pointer" disabled={!newCategoryName}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Divider Dialog */}
      <Dialog open={dividerDialogOpen} onOpenChange={setDividerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Divider</DialogTitle>
            <DialogDescription>Add a visual divider to organize your products</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Divider Name</label>
              <Input
                value={dividerName}
                onChange={(e) => setDividerName(e.target.value)}
                placeholder="e.g., Hot Drinks, Cold Drinks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDividerDialogOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleCreateDivider} className="cursor-pointer" disabled={!dividerName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder Management Sheet */}
      <FolderManagementSheet
        open={folderSheetOpen}
        onOpenChange={setFolderSheetOpen}
        onFolderUpdated={handleFolderUpdated}
        onFolderDeleted={handleFolderDeleted}
        category={selectedCategory}
      />

      {/* Product Sheet */}
      <StandaloneProductSheet
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
        productId={selectedProductId}
        category={selectedCategory}
        onProductSaved={handleProductSaved}
        onIconClick={() => setProductIconDialogOpen(true)}
      />

      {/* Category Icon Select Dialog */}
      <IconSelect
        open={categoryIconDialogOpen}
        setOpen={setCategoryIconDialogOpen}
        onIconSelected={(icon) => {
          setNewCategoryThumbnail(icon);
          setCategoryIconDialogOpen(false);
        }}
        query=""
      />

      {/* Product Icon Select Dialog */}
      <IconSelect
        open={productIconDialogOpen}
        setOpen={setProductIconDialogOpen}
        onIconSelected={async (icon) => {
          if (selectedProductId) {
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${selectedProductId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product: { thumbnail: icon } })
              });

              if (res.ok) {
                if (selectedCategory) {
                  await handleSelectCategory(selectedCategory);
                }
              }
            } catch (error) {
              console.error('Error updating product icon:', error);
            }
          }
          setProductIconDialogOpen(false);
        }}
        query={productIconQuery}
      />
    </div>
  );
}
