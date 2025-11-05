'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useImmer } from 'use-immer';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus, FolderPlus, PackagePlus, Minus, Trash2, GripVertical, ArrowUp, ArrowDown, ArrowLeft, Pencil, Settings } from 'lucide-react';
import { toast } from "sonner";
import colors from '@/lib/tailwind-colors';
import { generateObjectId } from '@/lib/utils';
import SortableCategory from '../../shop/SortableCategory';
import IconSelect from '@/components/icon-select';
import { ProductThumbnail } from '@/components/product-thumbnail';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import POSFolderSheet from './POSFolderSheet';
import POSProductSheet from './POSProductSheet';
import POSInterfaceSettingsSheet from './POSInterfaceSettingsSheet';
import StandaloneProductSheet from '../../StandaloneProductSheet';
import MembershipsProductSheet from '../../(entry)/MembershipsProductSheet';
import ClassesProductSheet from '../../(entry)/ClassesProductSheet';
import { useProduct } from '../../(entry)/useProduct';
import { useAutoSave } from '../../useAutoSave';

// Draggable folder product component
function DraggableFolderProduct({ product, folderId, onProductClick, borderColor, tintColor }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `folder-${folderId}-product-${product._id}`,
    data: {
      type: 'folder-product',
      folderId: folderId,
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
      className="w-24 h-32 flex flex-col text-center text-xs group flex-shrink-0 relative"
    >
      <div className="relative size-24">
        {/* Drag handle - positioned absolutely */}
        <div
          className="absolute top-1 right-1 w-6 h-6 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white rounded-full flex items-center justify-center z-20"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3" />
        </div>

        {/* Edit icon - positioned absolutely */}
        <div
          className="absolute bottom-1 right-1 w-6 h-6 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white rounded-full flex items-center justify-center z-20"
          onClick={(e) => {
            e.stopPropagation();
            onProductClick();
          }}
        >
          <Pencil className="w-3 h-3" />
        </div>

        {/* Product thumbnail */}
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
      </div>

      <div className="mt-1">
        <div className="font-medium">{product.name}</div>
      </div>
    </div>
  );
}

// Simplified SortableItem component
function SortableItem({ item, isExpanded, onFolderClick, onFolderEdit, onProductClick, onDividerDelete, isDraggedOver, draggedItemType, isAdjacentToDragged, activeId, overId }) {
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
    animateLayoutChanges: () => false,
  });

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
    justifySelf: 'start',
    alignSelf: 'start',
    contain: 'layout paint',
    willChange: 'transform',
  };

  if (item.type === 'divider') return null;

  // Folder rendering
  if (item.type === 'folder') {
    const itemCount = item.items?.length || ((item.products?.length || 0) + (item.groups?.length || 0));
    const folderColor = colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]] || colors.blue[500];
    const isHoveringOverFolder = overId === item._id;
    const isHoveringOverFolderChild = overId && overId.startsWith(`folder-${item._id}-product-`);

    const isExpandedAndReceivingDrag =
      isExpanded &&
      activeId &&
      draggedItemType === 'product' &&
      !activeId.match(/^folder-.+-product-.+$/) &&
      (isHoveringOverFolder || isHoveringOverFolderChild);

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-24 h-32 flex flex-col text-center text-xs group"
      >
        <div
          className="relative cursor-pointer"
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

          <div
            className="absolute top-1 right-1 w-6 h-6 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white rounded-full flex items-center justify-center z-10"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3" />
          </div>

          <div
            className="absolute bottom-1 right-1 w-6 h-6 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white rounded-full flex items-center justify-center z-10"
            onClick={(e) => {
              e.stopPropagation();
              onFolderEdit?.(item._id);
            }}
          >
            <Pencil className="w-3 h-3" />
          </div>
        </div>

        <div
          className="mt-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onFolderClick();
          }}
        >
          <div className="font-medium">{item.name}</div>
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
      className="w-24 h-32 flex flex-col text-center text-xs group"
    >
      <div className="relative size-24">
        <div
          className="absolute top-1 right-1 w-6 h-6 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white rounded-full flex items-center justify-center z-10"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3" />
        </div>

        <div
          className="absolute bottom-1 right-1 w-6 h-6 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white rounded-full flex items-center justify-center z-10"
          onClick={(e) => {
            e.stopPropagation();
            onProductClick();
          }}
        >
          <Pencil className="w-3 h-3" />
        </div>

        <ProductThumbnail
          src={item.thumbnail || item.image}
          alt={item.name}
          size="2xl"
          className="size-24"
        />
      </div>
      <div className="mt-1 font-medium">{item.name}</div>
      {item.variations && item.variations.length > 0 && (
        <div className="text-muted-foreground">
          ${parseFloat(item.variations[0].amount || 0).toFixed(2)}
        </div>
      )}
    </div>
  );
}

// Drag overlay component
function DragOverlayItem({ item }) {
  if (!item) return null;

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
    const itemCount = item.items?.length || ((item.products?.length || 0) + (item.groups?.length || 0));
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

// Non-sortable divider row
function DividerRow({ item, onDividerDelete, onMoveUp, onMoveDown }) {
  if (!item) return null;
  return (
    <div className="w-full col-span-full relative h-12">
      <div className="absolute inset-0 flex items-center">
        <div className="flex-1 h-px bg-border" />
        <div className="mx-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {item.name}
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center gap-1 z-10 pointer-events-auto">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onMoveUp?.(item);
          }}
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onMoveDown?.(item);
          }}
        >
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

export default function POSInterfaceDetailPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [posInterface, setPosInterface] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useImmer([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useImmer([]);
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
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [dividerDialogOpen, setDividerDialogOpen] = useState(false);
  const [dividerName, setDividerName] = useState('');

  // New product creation states
  const [newProductSheetOpen, setNewProductSheetOpen] = useState(false);
  const [newProductType, setNewProductType] = useState(null); // 'shop', 'membership', 'class'
  const [newProductId, setNewProductId] = useState(null);
  const [productRefreshTrigger, setProductRefreshTrigger] = useState(0);

  // Membership and Class product states
  const [membershipProducts, setMembershipProducts] = useImmer([]);
  const [classProducts, setClassProducts] = useImmer([]);
  const [membershipSheetOpen, setMembershipSheetOpen] = useState(false);
  const [classSheetOpen, setClassSheetOpen] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconDialogProductIdx, setIconDialogProductIdx] = useState(null);
  const [iconDialogQuery, setIconDialogQuery] = useState('');
  const [shopProductIconDialogOpen, setShopProductIconDialogOpen] = useState(false);
  const [shopProductThumbnailHandler, setShopProductThumbnailHandler] = useState(null);

  // Product management hooks for shop, memberships and classes
  const [shopProducts, setShopProducts] = useState([]);
  const { updateProduct: updateShopProduct, updateProductKey: updateShopProductKey, addProduct: addShopProduct, createProduct: createShopProduct } = useProduct(setShopProducts);
  const { updateProduct: updateMembershipProduct, updateProductKey: updateMembershipProductKey, addProduct: addMembershipProduct, createProduct: createMembershipProduct } = useProduct(setMembershipProducts);
  const { updateProduct: updateClassProduct, updateProductKey: updateClassProductKey, addProduct: addClassProduct, createProduct: createClassProduct } = useProduct(setClassProducts);

  // Auto-save hooks
  const membershipAutoSave = useAutoSave(membershipProducts, setMembershipProducts, updateMembershipProduct, createMembershipProduct, 'memberships', 3000, (oldId, newId) => {
    if (selectedMembershipId === oldId) setSelectedMembershipId(newId);
  });

  const classAutoSave = useAutoSave(classProducts, setClassProducts, updateClassProduct, createClassProduct, 'classes', 3000, (oldId, newId) => {
    if (selectedClassId === oldId) setSelectedClassId(newId);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );


  useEffect(() => {
    fetchPOSInterface();
  }, [id]);

  const fetchPOSInterface = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${id}`);
      const data = await res.json();

      if (data.interface) {
        setPosInterface(data.interface);
        const sortedCategories = (data.interface.categories || []).sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(sortedCategories);

        if (sortedCategories.length > 0) {
          handleSelectCategory(sortedCategories[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching POS interface:', error);
      toast.error('Failed to load POS interface');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);

    // Process items (folders and products)
    const allItems = [];
    const foldersMap = {};
    const seenIds = new Set(); // Track seen IDs to prevent duplicates

    // Create folder items
    category.items?.forEach(item => {
      // Skip if we've already seen this ID
      const itemIdStr = String(item.itemId);
      if (seenIds.has(itemIdStr)) {
        console.warn(`Duplicate item detected and skipped: ${itemIdStr}`);
        return;
      }
      seenIds.add(itemIdStr);

      if (item.itemType === 'folder' && item.data) {
        const folderItem = {
          ...item.data,
          _id: item.itemId,
          type: 'folder',
          order: item.order,
          // Use unified items array if available, otherwise fall back to products/groups
          items: item.data.items || [],
          products: item.data.products || [],
          groups: item.data.groups || []
        };
        foldersMap[item.itemId] = folderItem;
        allItems.push(folderItem);
      } else if (item.itemType === 'product' && item.data) {
        allItems.push({
          ...item.data,
          _id: item.itemId,
          type: 'product',
          order: item.order
        });
      } else if (item.itemType === 'divider' && item.data) {
        allItems.push({
          ...item.data,
          _id: item.itemId,
          type: 'divider',
          order: item.order
        });
      }
    });

    // Sort by order
    allItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    setItems(allItems);
  };

  const savePOSInterface = async (updatedCategories) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: updatedCategories })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to save POS interface');
    }

    return res.json();
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    const newCategory = {
      _id: generateObjectId(),
      name: newCategoryName,
      thumbnail: newCategoryThumbnail,
      items: [],
      order: categories.length
    };

    const updatedCategories = [...categories, newCategory];

    try {
      // Optimistically update UI
      setCategories(draft => {
        draft.push(newCategory);
      });

      await savePOSInterface(updatedCategories);

      setNewCategoryName('');
      setNewCategoryThumbnail('');
      setAddCategoryOpen(false);
      toast.success('Category added');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
      // Revert on error
      await fetchPOSInterface();
    }
  };

  const handleUpdateCategory = () => {
    if (!newCategoryName.trim() || !editingCategory) {
      toast.error('Please enter a category name');
      return;
    }

    setCategories(draft => {
      const index = draft.findIndex(c => c._id === editingCategory._id);
      if (index !== -1) {
        draft[index].name = newCategoryName;
        draft[index].thumbnail = newCategoryThumbnail;
      }
    });

    const updatedCategories = categories.map(c => {
      if (c._id === editingCategory._id) {
        return {
          ...c,
          name: newCategoryName,
          thumbnail: newCategoryThumbnail
        };
      }
      return c;
    });

    savePOSInterface(updatedCategories);

    setNewCategoryName('');
    setNewCategoryThumbnail('');
    setEditCategoryOpen(false);
    setEditingCategory(null);
    toast.success('Category updated');
  };

  const handleDeleteCategory = (categoryId) => {
    setCategories(draft => draft.filter(c => c._id !== categoryId));

    const updatedCategories = categories.filter(c => c._id !== categoryId);
    savePOSInterface(updatedCategories);

    if (selectedCategory?._id === categoryId && categories.length > 1) {
      handleSelectCategory(categories[0]);
    }

    toast.success('Category deleted');
  };

  const handleNewFolder = () => {
    setSelectedFolderId(null);
    setFolderSheetOpen(true);
  };

  const handleNewDivider = () => {
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
            order: items.length
          }
        })
      });

      if (res.ok) {
        const data = await res.json();

        // Update categories with the new divider
        const updatedCategories = categories.map(cat => {
          if (cat._id === selectedCategory._id) {
            return {
              ...cat,
              items: [
                ...(cat.items || []),
                {
                  itemType: 'divider',
                  itemId: data.product._id,
                  order: items.length
                }
              ]
            };
          }
          return cat;
        });

        // Save to database
        await savePOSInterface(updatedCategories);

        // Update local state
        setCategories(draft => {
          const catIndex = draft.findIndex(c => c._id === selectedCategory._id);
          if (catIndex !== -1) {
            draft[catIndex].items.push({
              itemType: 'divider',
              itemId: data.product._id,
              order: items.length
            });
          }
        });

        // Refresh to get the updated data
        await fetchPOSInterface();

        setDividerDialogOpen(false);
        setDividerName('');
        toast.success('Divider created');
      }
    } catch (error) {
      console.error('Error creating divider:', error);
      toast.error('Failed to create divider');
    }
  };

  const handleDividerDelete = async (dividerId) => {
    // Create updated categories with the divider removed
    const updatedCategories = categories.map(cat => {
      if (cat._id === selectedCategory._id) {
        return {
          ...cat,
          items: cat.items.filter(item => item.itemId !== dividerId)
        };
      }
      return cat;
    });

    // Update local state optimistically
    setCategories(updatedCategories);

    // Save to backend
    try {
      await savePOSInterface(updatedCategories);
      await fetchPOSInterface();
    } catch (error) {
      console.error('Error deleting divider:', error);
      toast.error('Failed to delete divider');
      // Revert on error
      await fetchPOSInterface();
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

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);

    const category = categories.find(c => c._id === active.id);
    const item = items.find(i => i._id === active.id);

    // Check if it's a folder product with pattern: folder-{folderId}-product-{productId}
    const folderProductMatch = active.id.match(/^folder-(.+)-product-(.+)$/);
    if (folderProductMatch) {
      const folderId = folderProductMatch[1];
      const productId = folderProductMatch[2];

      // Find the specific folder
      const folder = items.find(i => i.type === 'folder' && String(i._id) === String(folderId));
      if (folder) {
        // Search in unified items array first
        let foundItem = null;
        if (folder.items && folder.items.length > 0) {
          foundItem = folder.items.find(i => String(i._id) === String(productId));
        }

        // Fallback to products/groups
        if (!foundItem) {
          foundItem = [...(folder.products || []), ...(folder.groups || [])].find(
            p => String(p._id) === String(productId)
          );
        }

        setDraggedItem(foundItem || null);
      }
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

    // Parse folder product IDs
    const activeFolderProductMatch = active.id.match(/^folder-(.+)-product-(.+)$/);
    const overFolderProductMatch = over.id.match(/^folder-(.+)-product-(.+)$/);

    // Case 1: Dragging a folder product OUT to the main area (loose product or another folder)
    if (activeFolderProductMatch && !overFolderProductMatch) {
      const sourceFolderId = activeFolderProductMatch[1];
      const activeItemId = activeFolderProductMatch[2];

      // Find the source folder using the folderId from the drag ID
      const sourceFolder = items.find(item => item.type === 'folder' && String(item._id) === String(sourceFolderId));

      if (!sourceFolder) return;

      // Find the product being moved
      let movedProduct;
      if (sourceFolder.items && sourceFolder.items.length > 0) {
        movedProduct = sourceFolder.items.find(i => String(i._id) === String(activeItemId));
      } else {
        movedProduct = [...(sourceFolder.products || []), ...(sourceFolder.groups || [])].find(
          p => String(p._id) === String(activeItemId)
        );
      }

      if (!movedProduct) return;

      // Check if dropping onto another folder (expanded)
      const targetFolder = items.find(item => item.type === 'folder' && item._id === over.id);

      if (targetFolder && expandedFolders.has(targetFolder._id)) {
        // Moving from one folder to another folder
        // Remove from source folder
        const sourceContains = (sourceFolder.items || [])
          .filter(item => String(item._id) !== String(activeItemId))
          .map((item, index) => ({
            itemType: item.itemType || (item.amount ? 'group' : 'product'),
            itemId: item._id,
            order: index
          }));

        // Add to target folder
        const targetContains = [
          ...(targetFolder.items || []).map(item => ({
            itemType: item.itemType || (item.amount ? 'group' : 'product'),
            itemId: item._id,
            order: 0
          })),
          {
            itemType: movedProduct.itemType || (movedProduct.amount ? 'group' : 'product'),
            itemId: movedProduct._id,
            order: (targetFolder.items || []).length
          }
        ];

        // Update both folders
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders/${sourceFolder._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contains: sourceContains })
          });

          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders/${targetFolder._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contains: targetContains })
          });

          await fetchPOSInterface();
          toast.success('Product moved to folder');
        } catch (error) {
          console.error('Error moving product between folders:', error);
          toast.error('Failed to move product');
          await fetchPOSInterface();
        }
      } else {
        // Moving from folder to main area
        // Remove from folder
        const updatedContains = (sourceFolder.items || [])
          .filter(item => String(item._id) !== String(activeItemId))
          .map((item, index) => ({
            itemType: item.itemType || (item.amount ? 'group' : 'product'),
            itemId: item._id,
            order: index
          }));

        // Add to category items
        const overIndex = items.findIndex(i => i._id === over.id);
        const insertIndex = overIndex !== -1 ? overIndex : items.length;

        const updatedCategoryItems = items
          .filter(i => i._id !== sourceFolder._id)
          .slice(0, insertIndex)
          .concat([{
            ...movedProduct,
            type: 'product',
            order: insertIndex
          }])
          .concat(items.filter(i => i._id !== sourceFolder._id).slice(insertIndex));

        updatedCategoryItems.forEach((item, idx) => { item.order = idx; });

        const updatedCategories = categories.map(cat => {
          if (cat._id === selectedCategory._id) {
            return {
              ...cat,
              items: [
                ...updatedCategoryItems.map((item, idx) => ({
                  itemType: item.type === 'folder' ? 'folder' : item.type === 'divider' ? 'divider' : 'product',
                  itemId: item._id,
                  order: idx
                })),
                // Keep the folder reference
                ...(cat.items || []).filter(item => item.itemId === sourceFolder._id)
              ]
            };
          }
          return cat;
        });

        try {
          // Update folder
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders/${sourceFolder._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contains: updatedContains })
          });

          // Update category
          await savePOSInterface(updatedCategories);
          await fetchPOSInterface();
          toast.success('Product moved out of folder');
        } catch (error) {
          console.error('Error moving product out of folder:', error);
          toast.error('Failed to move product');
          await fetchPOSInterface();
        }
      }
      return;
    }

    // Case 2: Dragging a loose product INTO a folder
    if (!activeFolderProductMatch) {
      const activeItem = items.find(i => i._id === active.id);

      // Check if dropping on a folder directly OR on a product inside a folder
      let targetFolder = null;
      const overItem = items.find(i => i._id === over.id);

      if (overItem && overItem.type === 'folder' && expandedFolders.has(overItem._id)) {
        // Dropping directly on the folder
        targetFolder = overItem;
      } else if (overFolderProductMatch) {
        // Dropping on a product inside a folder - get the folder
        const overFolderId = overFolderProductMatch[1];
        targetFolder = items.find(i => i.type === 'folder' && String(i._id) === String(overFolderId));
      }

      if (activeItem && activeItem.type === 'product' && targetFolder) {
        // Add product to folder
        const contains = [
          ...(targetFolder.items || []).map((item, index) => ({
            itemType: item.itemType || (item.amount ? 'group' : 'product'),
            itemId: item._id,
            order: index
          })),
          {
            itemType: 'product',
            itemId: activeItem._id,
            order: (targetFolder.items || []).length
          }
        ];

        // Remove product from category items
        const updatedCategories = categories.map(cat => {
          if (cat._id === selectedCategory._id) {
            return {
              ...cat,
              items: (cat.items || []).filter(item => item.itemId !== activeItem._id)
            };
          }
          return cat;
        });

        try {
          // Update folder
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders/${targetFolder._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contains })
          });

          // Update category
          await savePOSInterface(updatedCategories);
          await fetchPOSInterface();
          toast.success('Product added to folder');
        } catch (error) {
          console.error('Error adding product to folder:', error);
          toast.error('Failed to add product to folder');
          await fetchPOSInterface();
        }
        return;
      }
    }

    // Case 3: Reordering products/groups within a folder (unified approach)
    if (activeFolderProductMatch && overFolderProductMatch) {
      const activeFolderId = activeFolderProductMatch[1];
      const activeItemId = activeFolderProductMatch[2];
      const overFolderId = overFolderProductMatch[1];
      const overItemId = overFolderProductMatch[2];

      // Ensure both items are in the same folder
      if (activeFolderId !== overFolderId) return;

      // Find the folder
      const folder = items.find(item => item.type === 'folder' && String(item._id) === String(activeFolderId));

      if (!folder) return;

      // Get all folder items in order
      let allFolderItems;
      if (folder.items && folder.items.length > 0) {
        // Use unified items array
        allFolderItems = folder.items.map(item => ({
          type: item.itemType || (item.amount ? 'group' : 'product'),
          data: item
        }));
      } else {
        // Fallback: combine products and groups
        allFolderItems = [
          ...(folder.products || []).map(p => ({ type: 'product', data: p })),
          ...(folder.groups || []).map(g => ({ type: 'group', data: g }))
        ];
      }

      // Find indices
      const activeIndex = allFolderItems.findIndex(item => String(item.data._id) === String(activeItemId));
      const overIndex = allFolderItems.findIndex(item => String(item.data._id) === String(overItemId));

      if (activeIndex === -1 || overIndex === -1) return;

      // Reorder
      const reordered = [...allFolderItems];
      const [moved] = reordered.splice(activeIndex, 1);
      reordered.splice(overIndex, 0, moved);

      // Build contains array
      const contains = reordered.map((item, index) => ({
        itemType: item.type,
        itemId: item.data._id,
        order: index
      }));

      // Update local state with new unified array
      setItems(draft => {
        const folderIndex = draft.findIndex(i => i._id === folder._id);
        if (folderIndex !== -1) {
          draft[folderIndex].items = reordered.map(i => i.data);
          // Also update products/groups for backwards compatibility
          draft[folderIndex].products = reordered.filter(i => i.type === 'product').map(i => i.data);
          draft[folderIndex].groups = reordered.filter(i => i.type === 'group').map(i => i.data);
        }
      });

      // Save to backend
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders/${folder._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contains })
        });

        if (!response.ok) throw new Error('Failed to update folder order');

        await fetchPOSInterface();
      } catch (error) {
        console.error('Error updating folder order:', error);
        toast.error('Failed to update order');
        await fetchPOSInterface();
      }
      return;
    }

    // Case 4: Handle category reordering
    if (categories.find(c => c._id === active.id)) {
      const oldIndex = categories.findIndex(c => c._id === active.id);
      const newIndex = categories.findIndex(c => c._id === over.id);

      setCategories(draft => {
        const [movedCategory] = draft.splice(oldIndex, 1);
        draft.splice(newIndex, 0, movedCategory);
        draft.forEach((cat, idx) => { cat.order = idx; });
      });

      const updatedCategories = [...categories];
      const [movedCategory] = updatedCategories.splice(oldIndex, 1);
      updatedCategories.splice(newIndex, 0, movedCategory);
      updatedCategories.forEach((cat, idx) => { cat.order = idx; });

      savePOSInterface(updatedCategories);
      return;
    }

    // Case 5: Handle item reordering (folders, products, dividers within a category)
    const activeIndex = items.findIndex(i => i._id === active.id);
    const overIndex = items.findIndex(i => i._id === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    // Create updated items array
    const updatedItems = [...items];
    const [movedItem] = updatedItems.splice(activeIndex, 1);
    updatedItems.splice(overIndex, 0, movedItem);
    updatedItems.forEach((item, idx) => { item.order = idx; });

    // Update local state
    setItems(updatedItems);

    // Create updated categories array with new item order
    const updatedCategories = categories.map(cat => {
      if (cat._id === selectedCategory._id) {
        return {
          ...cat,
          items: updatedItems.map((item, idx) => ({
            itemType: item.type === 'folder' ? 'folder' : item.type === 'divider' ? 'divider' : 'product',
            itemId: item._id,
            order: idx
          }))
        };
      }
      return cat;
    });

    // Save to backend first
    try {
      await savePOSInterface(updatedCategories);
      await fetchPOSInterface();
    } catch (error) {
      console.error('Error updating item order:', error);
      toast.error('Failed to update order');
      // Revert on error
      await fetchPOSInterface();
    }
  };

  const moveDivider = async (divider, delta) => {
    const index = items.findIndex(i => i._id === divider._id);
    if (index === -1) return;
    const newIndex = Math.max(0, Math.min(items.length - 1, index + delta));
    if (newIndex === index) return;

    // Create updated items array
    const updatedItems = [...items];
    const [moved] = updatedItems.splice(index, 1);
    updatedItems.splice(newIndex, 0, moved);
    updatedItems.forEach((it, idx) => { it.order = idx; });

    // Update local state
    setItems(updatedItems);

    // Create updated categories array with new item order
    const updatedCategories = categories.map(cat => {
      if (cat._id === selectedCategory._id) {
        return {
          ...cat,
          items: updatedItems.map((item, idx) => ({
            itemType: item.type === 'folder' ? 'folder' : item.type === 'divider' ? 'divider' : 'product',
            itemId: item._id,
            order: idx
          }))
        };
      }
      return cat;
    });

    // Save to backend first
    try {
      await savePOSInterface(updatedCategories);
      await fetchPOSInterface();
    } catch (error) {
      console.error('Error moving divider:', error);
      toast.error('Failed to move divider');
      // Revert on error
      await fetchPOSInterface();
    }
  };

  const handleEditProduct = async (product) => {
    try {
      console.log('Editing product (from POS interface):', product);

      // Fetch full product details from API to get the type and all other fields
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${product._id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch product details');
      }
      const data = await res.json();
      const fullProduct = data.product;

      console.log('Full product data:', fullProduct);
      const productType = fullProduct.type;
      console.log('Product type:', productType);

      if (productType === 'shop') {
        console.log('Opening shop product sheet for:', fullProduct._id);
        setNewProductId(fullProduct._id);
        setNewProductType('shop');
        setNewProductSheetOpen(true);
      } else if (productType === 'membership') {
        console.log('Opening membership sheet for:', fullProduct._id);
        // Load into membership products state
        setMembershipProducts([fullProduct]);
        setSelectedMembershipId(fullProduct._id);
        setMembershipSheetOpen(true);
        membershipAutoSave.markAsSaved(fullProduct._id, fullProduct);
      } else if (productType === 'class') {
        console.log('Opening class sheet for:', fullProduct._id);
        // Load into class products state
        setClassProducts([fullProduct]);
        setSelectedClassId(fullProduct._id);
        setClassSheetOpen(true);
        classAutoSave.markAsSaved(fullProduct._id, fullProduct);
      } else {
        console.warn('Unknown product type:', productType);
        toast.error('Unknown product type');
      }
    } catch (error) {
      console.error('Error opening product for editing:', error);
      toast.error('Failed to open product');
    }
  };

  const handleCreateNewProduct = async (type) => {
    try {
      let createdProduct;

      if (type === 'shop') {
        // Create shop product immediately (same pattern as memberships/classes)
        const newProduct = {
          name: 'New Shop Item',
          type: 'shop',
          variations: [{ name: '', amount: '' }],
          publish: true,
          bump: true
        };
        const categoryName = 'shop';

        // Create shop product in database first
        createdProduct = await createShopProduct(categoryName, newProduct);
        if (createdProduct && createdProduct._id) {
          setNewProductId(createdProduct._id);
          setNewProductType('shop');
          setNewProductSheetOpen(true);
        }
        // Will be added to POS interface below

      } else if (type === 'membership') {
        const newProduct = {
          name: 'New Membership',
          type: 'membership',
          prices: []
        };
        const categoryName = 'memberships';

        // Create membership product
        createdProduct = await createMembershipProduct(categoryName, newProduct);
        if (createdProduct && createdProduct._id) {
          setMembershipProducts(prev => [createdProduct, ...prev]);
          setSelectedMembershipId(createdProduct._id);
          setMembershipSheetOpen(true);
          membershipAutoSave.markAsSaved(createdProduct._id, createdProduct);
        }

      } else if (type === 'class') {
        const newProduct = {
          name: 'New Class',
          type: 'class',
          schedule: { daysOfWeek: [], times: [] },
          prices: []
        };
        const categoryName = 'classes';

        // Create class product
        createdProduct = await createClassProduct(categoryName, newProduct);
        if (createdProduct && createdProduct._id) {
          setClassProducts(prev => [createdProduct, ...prev]);
          setSelectedClassId(createdProduct._id);
          setClassSheetOpen(true);
          classAutoSave.markAsSaved(createdProduct._id, createdProduct);
        }
      }

      // Add to POS interface
      if (createdProduct?._id && selectedCategory?._id) {
        const updatedCategories = categories.map(cat => {
          if (cat._id === selectedCategory._id) {
            // Check if product already exists in this category
            const productExists = cat.items?.some(item => item.itemId === createdProduct._id);
            if (productExists) {
              return cat; // Don't add duplicate
            }
            
            return {
              ...cat,
              items: [
                ...(cat.items || []),
                {
                  itemType: 'product',
                  itemId: createdProduct._id,
                  order: items.length
                }
              ]
            };
          }
          return cat;
        });

        await savePOSInterface(updatedCategories);
        await fetchPOSInterface();
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    }
  };

  const handleNewProductSaved = async (savedProduct) => {
    // Don't refresh on auto-save to prevent sheet from flickering
    // Data will be refreshed when sheet closes
  };

  const handleShopProductSheetClose = async (isOpen) => {
    setNewProductSheetOpen(isOpen);
    // Refresh when sheet closes to show updated product data
    if (!isOpen) {
      await fetchPOSInterface();
    }
  };

  const handleMembershipSheetClose = async (isOpen) => {
    setMembershipSheetOpen(isOpen);
    // Refresh when sheet closes
    if (!isOpen) {
      await fetchPOSInterface();
    }
  };

  const handleClassSheetClose = async (isOpen) => {
    setClassSheetOpen(isOpen);
    // Refresh when sheet closes
    if (!isOpen) {
      await fetchPOSInterface();
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="pb-2 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">{posInterface?.name}</h1>
        {posInterface?.deviceNames && posInterface.deviceNames.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {posInterface.deviceNames.slice(0, 3).map((deviceName, idx) => (
              <Badge key={idx}>
                {deviceName}
              </Badge>
            ))}
            {posInterface.deviceCount > 3 && (
              <Badge variant="outline">+{posInterface.deviceCount - 3}</Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Categories */}
        <div className="flex flex-col w-56 bg-accent rounded-tr-lg overflow-y-auto">
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
                  onEdit={(cat) => {
                    setEditingCategory(cat);
                    setNewCategoryName(cat.name);
                    setNewCategoryThumbnail(cat.thumbnail || '');
                    setEditCategoryOpen(true);
                  }}
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
          {selectedCategory ? (
            <>
              <div className="flex items-center justify-end mb-4">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleNewFolder}
                    className="cursor-pointer"
                  >
                    <FolderPlus className="size-4 mr-1" />
                    New Folder
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        className="cursor-pointer"
                      >
                        <PackagePlus className="size-4 mr-1" />
                        Add Products
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setProductSheetOpen(true)} className="cursor-pointer">
                        Add Existing Products
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleCreateNewProduct('shop')} className="cursor-pointer">
                        Create New Shop Item
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCreateNewProduct('membership')} className="cursor-pointer">
                        Create New Membership
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCreateNewProduct('class')} className="cursor-pointer">
                        Create New Class/Course
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    size="sm"
                    onClick={handleNewDivider}
                    className="cursor-pointer"
                  >
                    <Plus className="size-4 mr-1" />
                    New Divider
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSettingsSheetOpen(true)}
                    className="cursor-pointer"
                  >
                    <Settings className="size-4" />
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
                  ...items.filter(i => i.type !== 'divider').map(i => i._id),
                  ...items.filter(i => i.type === 'folder' && expandedFolders.has(i._id))
                    .flatMap(folder => {
                      // Use unified items array if available
                      if (folder.items && folder.items.length > 0) {
                        return folder.items.map(item => `folder-${folder._id}-product-${item._id}`);
                      }
                      // Fallback to products + groups
                      return [
                        ...(folder.products?.map(p => `folder-${folder._id}-product-${p._id}`) || []),
                        ...(folder.groups?.map(g => `folder-${folder._id}-product-${g._id}`) || [])
                      ];
                    })
                ]} strategy={rectSortingStrategy}>
                  <div className="grid gap-4 auto-rows-min" style={{ gridTemplateColumns: 'repeat(auto-fill, 96px)' }}>
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
                            onFolderEdit={(folderId) => {
                              setSelectedFolderId(folderId);
                              setFolderSheetOpen(true);
                            }}
                            onProductClick={() => handleEditProduct(item)}
                            onDividerDelete={handleDividerDelete}
                            isDraggedOver={false}
                            draggedItemType={draggedItem?.type}
                            isAdjacentToDragged={false}
                            activeId={activeId}
                            overId={overId}
                          />
                        )}
                        {item.type === 'folder' && expandedFolders.has(item._id) && (
                          <>
                            {/* Render items in folder (products and groups in order) */}
                            {item.items && item.items.length > 0 ? (
                              item.items.map((folderItem) => (
                                <DraggableFolderProduct
                                  key={`inline-${folderItem._id}`}
                                  product={folderItem}
                                  folderId={item._id}
                                  onProductClick={() => handleEditProduct(folderItem)}
                                  borderColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]] || colors.blue[500]}
                                  tintColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]] || colors.blue[500]}
                                />
                              ))
                            ) : (
                              <>
                                {/* Fallback: Render products then groups */}
                                {item.products && item.products.length > 0 && item.products.map((product) => (
                                  <DraggableFolderProduct
                                    key={`inline-${product._id}`}
                                    product={product}
                                    folderId={item._id}
                                    onProductClick={() => handleEditProduct(product)}
                                    borderColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]] || colors.blue[500]}
                                    tintColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]] || colors.blue[500]}
                                  />
                                ))}
                                {item.groups && item.groups.length > 0 && item.groups.map((group) => (
                                  <DraggableFolderProduct
                                    key={`inline-group-${group._id}`}
                                    product={group}
                                    folderId={item._id}
                                    onProductClick={() => handleEditProduct(group)}
                                    borderColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]] || colors.blue[500]}
                                    tintColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]] || colors.blue[500]}
                                  />
                                ))}
                              </>
                            )}
                          </>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay>
                  <DragOverlayItem item={draggedItem} />
                </DragOverlay>
              </DndContext>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a category to view items
            </div>
          )}
        </div>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a new category for this POS interface</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Name</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Icon</Label>
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
            <div className="flex flex-col gap-2">
              <Label>Name</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Icon</Label>
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
            <div className="flex flex-col gap-2">
              <Label>Divider Name</Label>
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

      {/* Folder Sheet */}
      <POSFolderSheet
        open={folderSheetOpen}
        onOpenChange={setFolderSheetOpen}
        posInterfaceId={id}
        categoryId={selectedCategory?._id}
        folderId={selectedFolderId}
        onSuccess={fetchPOSInterface}
      />

      {/* Product Sheet */}
      <POSProductSheet
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
        posInterfaceId={id}
        categoryId={selectedCategory?._id}
        onSuccess={fetchPOSInterface}
      />

      {/* Settings Sheet */}
      <POSInterfaceSettingsSheet
        open={settingsSheetOpen}
        onOpenChange={setSettingsSheetOpen}
        posInterface={posInterface}
        onSuccess={fetchPOSInterface}
      />

      {/* New Product Sheet */}
      <StandaloneProductSheet
        open={newProductSheetOpen}
        onOpenChange={handleShopProductSheetClose}
        productId={newProductId}
        category={null}
        productType={newProductType}
        onProductSaved={handleNewProductSaved}
        onIconClick={(thumbnailHandler) => {
          setShopProductThumbnailHandler(() => thumbnailHandler);
          setShopProductIconDialogOpen(true);
        }}
        refreshTrigger={productRefreshTrigger}
      />

      {/* Membership Product Sheet */}
      <MembershipsProductSheet
        open={membershipSheetOpen}
        onOpenChange={handleMembershipSheetClose}
        products={membershipProducts}
        selectedProductId={selectedMembershipId}
        setProducts={setMembershipProducts}
        isDirty={membershipAutoSave.isDirty}
        saving={membershipAutoSave.saving}
        markAsSaved={membershipAutoSave.markAsSaved}
        setIconDialogOpen={setIconDialogOpen}
        setIconDialogProductIdx={setIconDialogProductIdx}
        setIconDialogQuery={setIconDialogQuery}
        createProduct={createMembershipProduct}
        categoryName="memberships"
      />

      {/* Class Product Sheet */}
      <ClassesProductSheet
        open={classSheetOpen}
        onOpenChange={handleClassSheetClose}
        products={classProducts}
        selectedProductId={selectedClassId}
        setProducts={setClassProducts}
        isDirty={classAutoSave.isDirty}
        saving={classAutoSave.saving}
        markAsSaved={classAutoSave.markAsSaved}
        setIconDialogOpen={setIconDialogOpen}
        setIconDialogProductIdx={setIconDialogProductIdx}
        setIconDialogQuery={setIconDialogQuery}
        createProduct={createClassProduct}
        categoryName="classes"
      />

      {/* Icon Select Dialog for Memberships/Classes */}
      <IconSelect
        open={iconDialogOpen}
        setOpen={setIconDialogOpen}
        pIdx={iconDialogProductIdx}
        query={iconDialogQuery}
        updateProduct={membershipSheetOpen ? updateMembershipProductKey : updateClassProductKey}
      />

      {/* Shop Product Icon Select Dialog */}
      <IconSelect
        open={shopProductIconDialogOpen}
        setOpen={setShopProductIconDialogOpen}
        onIconSelected={async (icon) => {
          // Update the thumbnail in the sheet directly
          if (shopProductThumbnailHandler) {
            shopProductThumbnailHandler(icon);
          }
          setShopProductIconDialogOpen(false);
        }}
        query=""
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
    </div>
  );
}
