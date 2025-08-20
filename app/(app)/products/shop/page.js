'use client';

import React, { useState, useEffect } from 'react';
import { useImmer } from 'use-immer';
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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Separator } from '@radix-ui/react-separator'
import { Button } from '@/components/ui/button'
import { Tag, Plus, Ellipsis, EllipsisVertical, Info, Trash, Loader2, CheckCircle, Save, GripVertical, Edit2, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

import { actions } from './actions'
import Delete from '../Delete'
import ProductsTable from './ProductsTable'
import ProductSheet from './ProductSheet'
import { FolderSelect } from './FolderSelect'
import IconSelect  from '@/components/icon-select'
import AccountingSelect from './accounting-select'
import colors from 'tailwindcss/colors';
import { useAutoSave } from '../useAutoSave';

// Sortable Category Component
function SortableCategory({ category, isActive, onSelect, onEdit, onDelete, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
        isActive ? 'bg-muted' : 'hover:bg-muted/50'
      } ${isDragging ? 'z-50' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-6 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div
        className="flex-1 text-sm mx-2"
        onClick={onSelect}
      >
        {category.name}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="size-4 mr-1" />
            Edit Category
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="size-4 mr-1" />
            Delete Category
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function Page() {
  const [categories, setCategories] = useState([]);
  const [folders, setFolders] = useState([]);
  const [category, setCategory] = useState({});
  const [product, setProduct] = useState({});
  const [products, setProducts] = useImmer([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState({});

  const [ addItem, setAddItem ] = useState({})
  const [ addItemOpen, setAddItemOpen ] = useState(false)
  
  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Icon dialog state
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconDialogProductIdx, setIconDialogProductIdx] = useState(null);
  const [iconDialogQuery, setIconDialogQuery] = useState('');
  
  // Sheet state for product details
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const { 
    addVariation, updateVariation, 
    updateProduct, saveProduct, addProduct, deleteProduct,
    deleteVariation, addModCat, deleteCategory,
    addMod, updateMod, saveMod, updateModCat, setFolder } = actions({category, setProducts})

  // Wrapper function for auto-save that matches the expected signature
  const autoSaveProduct = async (product) => {
    const pIdx = products.findIndex(p => p._id === product._id);
    if (pIdx !== -1) {
      return await saveProduct({ product, pIdx });
    }
  };

  // Use the auto-save hook
  const { isDirty, saving, isAnySaving, hasAnyUnsaved, markAsSaved } = useAutoSave(products, autoSaveProduct, 3000);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for categories
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c._id === active.id);
      const newIndex = categories.findIndex((c) => c._id === over.id);
      
      const reorderedCategories = arrayMove(categories, oldIndex, newIndex);
      
      // Update local state immediately for smooth UX
      setCategories(reorderedCategories);
      
      // Assign order values based on new positions
      const orderedCategories = reorderedCategories.map((cat, index) => ({
        ...cat,
        order: index + 1
      }));
      
      // Update each category's order in the backend
      try {
        await Promise.all(
          orderedCategories.map(cat =>
            fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${cat._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order: cat.order }),
            })
          )
        );
      } catch (error) {
        console.error('Error updating category order:', error);
        // Optionally revert the order on error
      }
    }
  };

  const handleDelete = async () => {
    if (toDelete.variationIdx !== undefined) {
      deleteVariation(toDelete)
    } else if (toDelete.category) {
      await deleteCategory({
        category: toDelete.category, 
        setCategory, 
        setCategories, 
        categories
      });
    }
    setToDelete({})
  }

  useEffect(() => {
    async function fetchCategories() {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/categories?menu=shop');
      const c = await res.json();
      setCategories(c.categories);
      
      // Default select the first category if available
      if (c.categories && c.categories.length > 0) {
        setCategory(c.categories[0]);
        getCategoryProducts(c.categories[0]);
      }
    }
    
    async function fetchFolders() {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/folders?search=');
      const data = await res.json();
      if (Array.isArray(data)) {
        setFolders(data);
      }
    }
    
    fetchCategories();
    fetchFolders();
  }, []);


  const saveCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${newCategoryName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu: 'shop' }),
    });
    const data = await res.json();
    console.log("Category saved response:", data);
    if (data.category && data.category._id) {
      const updatedCategory = { ...data.category };
      setCategory(updatedCategory);
      setCategories([updatedCategory, ...categories]);
      getCategoryProducts(updatedCategory);
      setCategoryDialogOpen(false);
      setNewCategoryName('');
    }
  }

  const updateCategory = async () => {
    if (!editCategoryName.trim() || !editingCategory) return;
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${editingCategory._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editCategoryName }),
    });
    const data = await res.json();
    
    if (data.category) {
      // Update the category in the list
      setCategories(categories.map(c => 
        c._id === editingCategory._id ? { ...c, name: editCategoryName } : c
      ));
      
      // Update the current category if it's the one being edited
      if (category._id === editingCategory._id) {
        setCategory({ ...category, name: editCategoryName });
      }
      
      setEditCategoryDialogOpen(false);
      setEditingCategory(null);
      setEditCategoryName('');
    }
  }

  const getCategoryProducts = async (c) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${c._id}/products`);
    const _products = await res.json()
    setProducts(_products.products)
  };

  return (
    <>
      {/* Create Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Enter a name for the new product category
            </DialogDescription>
          </DialogHeader>
          <Input 
            placeholder="e.g., Coffees, Pastries, Sandwiches" 
            value={newCategoryName} 
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                saveCategory();
              }
            }}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => {
              setCategoryDialogOpen(false);
              setNewCategoryName('');
            }}>
              Cancel
            </Button>
            <Button onClick={saveCategory} disabled={!newCategoryName.trim()}>
              Create Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCategoryDialogOpen} onOpenChange={setEditCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category name
            </DialogDescription>
          </DialogHeader>
          <Input 
            placeholder="Category name" 
            value={editCategoryName} 
            onChange={(e) => setEditCategoryName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                updateCategory();
              }
            }}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => {
              setEditCategoryDialogOpen(false);
              setEditingCategory(null);
              setEditCategoryName('');
            }}>
              Cancel
            </Button>
            <Button onClick={updateCategory} disabled={!editCategoryName.trim()}>
              Update Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FOR ADDING SOMETHING */}
      <Dialog
        open={addItemOpen} onOpenChange={setAddItemOpen}
      >
        <DialogTrigger asChild>
          <span style={{ display: "none" }} />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter New Modification Name</DialogTitle>
            <DialogDescription>
              Enter a Modification, i.e. Milk, Extras, Sugar, etc
            </DialogDescription>
          </DialogHeader>
          <Input placeholder="Milk" value={addItem.name || ""} 
            onChange={(e) => {
              setAddItem({...addItem, name: e.target.value})
            }}
          />
          <Button
            onClick={() => {
              addModCat({pIdx: addItem.pIdx, name: addItem.name, multi: false})
              setAddItemOpen(false)
              setAddItem({})
            }}
          >
            Save
          </Button>

        </DialogContent>
      </Dialog>

      {/* FOR DELETING SOMETHING */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document.body.style.pointerEvents = '';
            }}
          >
            <AlertDialogTitle>Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete?
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete()}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      <div className="p-4 h-screen flex flex-col">
        <div className="mb-4">
          <h1 className="font-semibold">
            Retail Shop Products
          </h1>
        </div>
        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Categories Sidebar */}
          <div className="flex flex-col min-w-56">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium">
                Categories
              </h2>
              <Button
                size="icon"
                onClick={() => setCategoryDialogOpen(true)}
                className="h-8 w-8 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map(c => c._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-1">
                  {categories.map((c) => (
                    <SortableCategory
                      key={c._id}
                      category={c}
                      isActive={category._id === c._id}
                      onSelect={() => {
                        setCategory(c);
                        setProduct({ new: false });
                        getCategoryProducts(c);
                      }}
                      onEdit={() => {
                        setEditingCategory(c);
                        setEditCategoryName(c.name);
                        setEditCategoryDialogOpen(true);
                      }}
                      onDelete={() => {
                        setToDelete({ category: c });
                        setDeleteOpen(true);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
          
          {/* Folders Column */}
          <div className="flex flex-col w-48 border-x px-2 h-full">
            <div className="mb-4">
              <h2 className="text-sm font-medium">
                Folders
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="flex flex-col gap-1">
                {folders.map((folder) => (
                  <div 
                    key={folder._id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div
                      style={{ 
                        backgroundColor: colors?.[folder.color?.split('-')[0]]?.[folder.color?.split('-')[1]] 
                      }}
                      className="w-5 h-5 rounded-sm border flex-shrink-0"
                    />
                    <span className="text-sm truncate">{folder.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Products Content */}
          <div className="flex-1">
              <div className="flex pb-4 items-center">
                <div className="flex items-center gap-4">
                  <div className="text-lg- font-semibold">
                    {category?.name ? category.name : ''}
                  </div>
                  {category._id && (
                    <Button
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => addProduct()}
                    >
                      New Product
                    </Button>
                  )}
                </div>
                
                {/* Overall save status */}
                {category._id && products.length > 0 && (
                  <div className="ml-auto">
                    {isAnySaving ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Saving changes...</span>
                      </div>
                    ) : hasAnyUnsaved ? (
                      <div className="flex items-center gap-2 text-sm text-orange-500">
                        <Save className="h-3 w-3 animate-pulse" />
                        <span>Unsaved changes</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <CheckCircle className="h-3 w-3" />
                        <span>All changes saved</span>
                      </div>
                    )}
                  </div>
                )}
              </div>



              {/* {categories.map((c, i) => (
                <Tabs.Content
                  key={c._id}
                  value={c.name}
                  className="flex flex-col space-y-4 w-full"
                > */}

                  {/* Products Table */}
                  <ProductsTable
                    products={products}
                    onProductClick={(product, idx) => {
                      setSelectedProductId(product._id || idx);
                      setSheetOpen(true);
                    }}
                    onProductsReorder={(reorderedProducts) => {
                      setProducts(draft => {
                        // Replace the entire array with reordered products
                        draft.length = 0;
                        reorderedProducts.forEach((p, idx) => {
                          draft.push({
                            ...p,
                            order: idx,
                            updated: true
                          });
                        });
                      });
                    }}
                  />
                  
                  {/* Product Details Sheet */}
                  <ProductSheet
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                    products={products}
                    selectedProductId={selectedProductId}
                    category={category}
                    setProducts={setProducts}
                    isDirty={isDirty}
                    saving={saving}
                    markAsSaved={markAsSaved}
                    setIconDialogOpen={setIconDialogOpen}
                    setIconDialogProductIdx={setIconDialogProductIdx}
                    setIconDialogQuery={setIconDialogQuery}
                    setAddItem={setAddItem}
                    setAddItemOpen={setAddItemOpen}
                    setDeleteOpen={setDeleteOpen}
                    setToDelete={setToDelete}
                  />
                  
                  {/* Old card view - removing this */}
                  {false && products?.map((p, pIdx) => 
                    (
                      <Card
                        key={p._id}
                      >
                        <CardHeader>
                          <CardTitle className="flex w-full items-center space-x-4">
                          <div onClick={() => {
                            setIconDialogOpen(true);
                            setIconDialogProductIdx(pIdx);
                            setIconDialogQuery(p.name);
                          }}>
                              {!p?.thumbnail ? (
                                <Button className="bg-white rounded-lg w-16 h-16">
                                  <Tag className="!w-8 !h-8" />
                                </Button>
                              ) : (
                                <Button className="rounded-lg -p-1 w-16 h-16">
                                  <img className='rounded-lg w-16 h-16' src={p.thumbnail} alt="Thumbnail" />
                                </Button>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span>{p.name}</span>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant='ghost'>
                                  <Ellipsis className='size-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end'>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setToDelete({ pIdx, product: p })
                                    setDeleteOpen(true)
                                  }}
                                >
                                  Delete Product
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Auto-save indicator */}
                            {p._id && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center ml-auto">
                                      {saving[p._id] ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                      ) : isDirty[p._id] ? (
                                        <Save className="h-4 w-4 text-orange-500 animate-pulse" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {saving[p._id] ? 'Saving...' : 
                                       isDirty[p._id] ? 'Unsaved changes (auto-saves in 3s)' : 
                                       'All changes saved'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            {/* Manual save for new products */}
                            {!p._id && (
                              <Button
                                size="sm"
                                className="ml-auto"
                                onClick={async () => {
                                  const updated = await saveProduct({product: p, pIdx})
                                  if (updated) {
                                    markAsSaved(updated._id, updated);
                                  }
                                }}
                              >
                                Save
                              </Button>
                            )}


                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col space-y-4">

                          <div className="flex flex-col gap-1 w-[400px]">
                            <Label>Product Name</Label>
                            <Input
                              // id={c.id}
                              type="text"
                              placeholder="Flat White"
                              onChange={(e) => updateProduct({pIdx, key: "name", value: e.target.value})}
                              value={p.name || ''}
                            />
                          </div>

                            <div className="flex items-center gap-2">
                             <Label>Send to Bump</Label>
                             <Switch
                               id={`bump-${p._id}`}
                               checked={p.bump !== undefined ? p.bump : true}
                               onCheckedChange={(checked) => {
                                 updateProduct({pIdx, key: "bump", value: checked});
                               }}
                             />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info size="15"/>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>After a purchase of this product</p>
                                  <p>should it be sent to the bump screen</p>
                                  <p>for processing?</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          <div className="flex flex-col gap-1 w-[400px]">
                            <Label>Description</Label>
                            <Textarea
                              type="text"
                              rows={6}
                              placeholder=""
                              onChange={(e) => updateProduct({pIdx, key: "desc", value: e.target.value})}
                              value={p.desc || ''}
                            />
                          </div>



                          <div className="flex flex-col gap-1">
                            <Label>Folder</Label>
                            <div className='flex'>
                              <FolderSelect pIdx={pIdx} product={p} setFolder={setFolder}/>
                              {p.folder?.color && (
                                <div
                                  style={{ backgroundColor: colors?.[p.folder.color.split('-')[0]]?.[p.folder.color.split('-')[1]] }}
                                  className="size-9 rounded-md border ml-2"
                                />
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 w-72">
                            <Label>Accounting Code</Label>
                            <AccountingSelect 
                              value={p.accounting} 
                              onChange={(value) => {
                                updateProduct({pIdx, key: "accounting", value});
                              }}
                            />
                          </div>

                          <div className="flex gap-2">
                            <div className="flex flex-col gap-1 w-24">
                              <div className="flex items-center gap-1">
                                <Label>Qty</Label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info size="15"/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Quanty in stock of this item
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <Input
                                type="number"
                                min="0"
                                value={p.qty || ''}
                                onChange={(e) => {
                                  updateProduct({pIdx, key: "qty", value: parseInt(e.target.value) || 0});
                                }}
                                placeholder="0"
                              />

                            </div>
                            <div className="flex flex-col gap-1 w-24">

                              <div className="flex items-center gap-1">
                                <Label>Par</Label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info size="15"/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Remaining stock level to issue a warning
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>

                              <Input
                                type="number"
                                min="0"
                                value={p.par || ''}
                                onChange={(e) => {
                                  updateProduct({pIdx, key: "par", value: parseInt(e.target.value) || 0});
                                }}
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div className="flex space-x-2-">
                            <Label className="text-sm mr-2">Variations</Label>
                            <Button
                              size="icon" variant="outline"
                              onClick={() => addVariation({pIdx})}
                            >
                              <Plus />
                            </Button>
                          </div>
                          <div className='flex flex-col gap-0.5'>
                            {p?.variations?.length > 0 && (
                              <div className="flex flex-row">
                                <Label className="text-xs w-26">
                                  Variation
                                </Label>
                                <Label className="text-xs w-24">
                                  Price
                                </Label>
                              </div>
                            )}
                            {p?.variations?.map((v, i) => (
                              <div
                                className="flex space-x-2 space-y-2"
                                key={`${p.id}-${i}`}
                              >
                                <div className="flex flex-col w-24 items-center">
                                  <Input
                                    type="text" placeholder="SM" value={v.name || ''} className="text-sm"
                                    onChange={(e) => updateVariation({pIdx, vIdx: i, key: "name", value: e.target.value})}
                                  />
                                </div>
                                <div className="w-24 items-center">
                                  <Input
                                    type="text" placeholder="5.50" className="text-sm" value={v.amount || ''}
                                    onChange={(e) => updateVariation({pIdx, vIdx: i, key: "amount", value: e.target.value})}
                                  />
                                </div>

                                {v.id > 0 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="icon">
                                        <Ellipsis className="size-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setDeleteOpen(true);
                                          setToDelete({ product: p, productIdx: pIdx, variationIdx: i });
                                        }}
                                      >
                                        Delete Variation
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            ))}
                          </div>


                          {/* ADD MODIFICATION DROPDOWN */}

                          <div className='flex'>
                            <Label className='mr-2'>Mod Groups</Label>
                            <Button
                              className="text-xs"
                              variant="outline"
                              size="icon" 
                              onClick={() => {
                                setAddItem({pIdx, p})
                                setAddItemOpen(true)
                              }}
                            >
                              <Plus />
                            </Button>

                          </div>

                          {/* MODIFICATIONS (used to be called variations) */}

                          <div className='grid grid-cols-[1fr_1fr_4fr] gap-y-2'>
                            <div></div>
                            <div className='flex space-x-2'>
                              <Label className="text-xs">Multi</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info size="15"/>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Allow more than one mod to</p>
                                    <p>be selectepd from the group</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className='flex space-x-2'>
                              <Label className="text-xs">Mods</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info size="15"/>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Enable mods on / off by clicking each one.</p>
                                    <p>Click the + to add new</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            {p.modCats?.map((mp, mcIdx) => {
                              return (
                                <React.Fragment key={mcIdx}>
                                  <div className='h-full w-28 flex items-start'>
                                    {!mp.new &&
                                      <Label>{mp.name}</Label>
                                    }
                                  </div>
                                  <div>
                                    <Switch
                                      checked={mp.multi}
                                      onCheckedChange={(value) => updateModCat({ pIdx, mcIdx, key: "multi", value })}
                                    />
                                  </div>
                                  <div className='flex flex-wrap space-x-2- space-y-2- gap-2'>
                                    {mp?.mods?.map((m, mIdx) => {
                                      return (
                                        <React.Fragment key={mIdx}>
                                          {!m.new &&
                                            <div key={mIdx}>
                                              <Button
                                                className="cursor-pointer"
                                                onClick={() => updateMod({ pIdx, mcIdx, mIdx, key: "enabled", value: !m.enabled })}
                                                variant={m.enabled ? "" : "outline"}>{m.name} {`${!isNaN(m?.amount) ? '$' + Number(m.amount).toFixed(2) : ''}`}
                                              </Button>
                                            </div>
                                          }
                                          {m.new &&
                                            <div key={mIdx} className='flex space'>
                                              <Input
                                                value={m.name || ""} placeholder="Soy" className="w-24 rounded-r-none h-[32.5px]-"
                                                onChange={(e) => updateMod({ pIdx, mcIdx, mIdx, key: "name", value: e.target.value })}
                                              />
                                              <Input
                                                size="sm"
                                                onChange={(e) => updateMod({ pIdx, mcIdx, mIdx, key: "amount", value: e.target.value })}
                                                value={m.amount || ""} placeholder="$0.75" className="w-24 rounded-none h-[32.5px]-"></Input>
                                              <Button
                                                className="rounded-l-none"
                                                onClick={() => saveMod({ pIdx, mcIdx, mIdx })}
                                              >
                                                Save
                                              </Button>
                                            </div>
                                          }
                                        </React.Fragment>
                                      ) 
                                    })}
                                    {!mp.new &&
                                    <Button
                                      variant="outline"
                                      onClick={() => addMod({ pIdx, mcIdx })}
                                    >
                                      <Plus />
                                    </Button>
                                    }
                                  </div>
                                </React.Fragment>
                              )
                            })}
                          </div>

                          
                        </CardContent>
                      </Card>
                    ),
                  )}
          </div>
        </div>
      </div>

      <Delete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        name={toDelete?.category ? `${toDelete.category.name} category` : `${toDelete?.product?.name}`}
        onConfirm={() => {
          console.log(toDelete);
          if (toDelete.category) {
            deleteCategory({
              category: toDelete.category,
              setCategory,
              setCategories,
              categories
            });
          } else {
            deleteProduct({...toDelete});
          }
          setDeleteOpen(false);
        }}
      />
      <IconSelect
        open={iconDialogOpen}
        setOpen={setIconDialogOpen}
        pIdx={iconDialogProductIdx}
        query={iconDialogQuery}
        updateProduct={updateProduct}
      />
    </>
  );
}