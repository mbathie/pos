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
import { Image, Plus, Ellipsis, EllipsisVertical, Info, Trash, Loader2, CheckCircle, Save, GripVertical, Edit2, Trash2, PanelLeft, ChevronRight, ChevronLeft  } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

import { actions } from './actions'
import Delete from '../Delete'
import ProductsTable from './ProductsTable'
import ProductSheet from './ProductSheet'
import { FolderSelect } from './FolderSelect'
import { FolderManagementSheet } from './FolderManagementSheet'
import IconSelect  from '@/components/icon-select'
import CategoryIconSelect from '@/components/category-icon-select'
import AccountingSelect from './accounting-select'
import colors from 'tailwindcss/colors';
import { useAutoSave } from '../useAutoSave';

// Sortable Category Component
function SortableCategory({ category, isActive, onSelect, onEdit, onEditIcon, onDelete, expanded }) {
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

  if (!expanded) {
    // Collapsed view - just icon
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={setNodeRef}
              style={style}
              className={`flex items-center justify-center size-10 rounded-lg cursor-pointer ${
                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/50'
              } ${!category.thumbnail && !isActive ? 'bg-muted/20' : ''}`}
              onClick={onSelect}
            >
              {category.thumbnail ? (
                <img 
                  src={category.thumbnail} 
                  alt={category.name} 
                  className="invert size-6 rounded-lg object-cover text-foreground"
                />
              ) : (
                <Image className="stroke-1 size-6 rounded-lg text-foreground" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{category.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Expanded view - icon + name + controls
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between h-10 rounded-lg cursor-pointer transition-colors mx-2 ${
        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/50'
      } ${isDragging ? 'z-50' : ''} ${!category.thumbnail && !isActive ? 'bg-muted/20' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-6 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div
        className="flex-1 flex items-center gap-2 text-sm mx-2"
        onClick={onSelect}
      >
        {category.thumbnail ? (
          <img 
            src={category.thumbnail} 
            alt={category.name} 
            className={`w-6 h-6 rounded object-cover ${isActive ? 'invert' : 'invert opacity-60'}`}
          />
        ) : (
          <Image className={`w-6 h-6 ${isActive ? 'text-primary-foreground' : 'text-foreground'}`} />
        )}
        <span>{category.name}</span>
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
          <DropdownMenuItem onClick={onEditIcon}>
            <Image className="size-4 mr-1" />
            Edit Icon
          </DropdownMenuItem>
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
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [category, setCategory] = useState({});
  const [product, setProduct] = useState({});
  const [products, setProducts] = useImmer([]);
  const [allProducts, setAllProducts] = useImmer([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState({});
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const [ addItem, setAddItem ] = useState({})
  const [ addItemOpen, setAddItemOpen ] = useState(false)
  
  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryThumbnail, setNewCategoryThumbnail] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryThumbnail, setEditCategoryThumbnail] = useState('');
  
  // Category icon dialog state
  const [categoryIconDialogOpen, setCategoryIconDialogOpen] = useState(false);
  const [categoryIconMode, setCategoryIconMode] = useState('create'); // 'create' or 'edit'

  // Icon dialog state
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconDialogProductIdx, setIconDialogProductIdx] = useState(null);
  const [iconDialogQuery, setIconDialogQuery] = useState('');
  
  // Sheet state for product details
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  
  // Folder management sheet state
  const [folderSheetOpen, setFolderSheetOpen] = useState(false);
  const [folderRefreshTrigger, setFolderRefreshTrigger] = useState(0);

  const { 
    addVariation, updateVariation, 
    updateProduct, saveProduct, addProduct, deleteProduct,
    deleteVariation, addModCat, deleteCategory,
    addMod, updateMod, saveMod, updateModCat, setFolder } = actions({category, setProducts, setAllProducts})

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
    
    fetchCategories();
  }, []);


  const saveCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${newCategoryName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        menu: 'shop',
        thumbnail: newCategoryThumbnail 
      }),
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
      setNewCategoryThumbnail('');
    }
  }

  const updateCategory = async () => {
    if (!editCategoryName.trim() || !editingCategory) return;
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${editingCategory._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: editCategoryName,
        thumbnail: editCategoryThumbnail 
      }),
    });
    const data = await res.json();
    
    if (data.category) {
      // Update the category in the list
      setCategories(categories.map(c => 
        c._id === editingCategory._id ? { ...c, name: editCategoryName, thumbnail: editCategoryThumbnail } : c
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
    setAllProducts(_products.products);
    setProducts(_products.products);
    setSelectedFolder(null);
    
    // Also fetch folders for this category
    fetchFolders(c._id);
  };
  
  const fetchFolders = async (categoryId) => {
    const url = categoryId 
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders?category=${categoryId}`
      : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders?search=`;
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) {
      setFolders(data);
    }
  };
  
  const handleFolderClick = (folder) => {
    if (selectedFolder?._id === folder._id) {
      setSelectedFolder(null);
      setProducts(allProducts);
    } else {
      setSelectedFolder(folder);
      const filtered = allProducts.filter(p => p.folder?._id === folder._id);
      setProducts(filtered);
    }
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-16 w-16 rounded-lg bg-primary"
                onClick={() => {
                  setCategoryIconMode('create');
                  setCategoryIconDialogOpen(true);
                }}
              >
                {newCategoryThumbnail ? (
                  <img src={newCategoryThumbnail} alt="Icon" className="w-full h-full rounded-lg object-cover" />
                ) : (
                  <Image className="size-8 text-black" />
                )}
              </Button>
              <Input 
                placeholder="e.g., Coffees, Pastries, Sandwiches" 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    saveCategory();
                  }
                }}
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => {
              setCategoryDialogOpen(false);
              setNewCategoryName('');
              setNewCategoryThumbnail('');
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-16 w-16 rounded-lg bg-primary"
                onClick={() => {
                  setCategoryIconMode('edit');
                  setCategoryIconDialogOpen(true);
                }}
              >
                {editCategoryThumbnail ? (
                  <img src={editCategoryThumbnail} alt="Icon" className="w-full h-full rounded-lg object-cover" />
                ) : (
                  <Image className="size-8 text-black" />
                )}
              </Button>
              <Input 
                placeholder="Category name" 
                value={editCategoryName} 
                onChange={(e) => setEditCategoryName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    updateCategory();
                  }
                }}
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => {
              setEditCategoryDialogOpen(false);
              setEditingCategory(null);
              setEditCategoryName('');
              setEditCategoryThumbnail('');
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

      <div className="p-2 pr-4 pb-0 h-full flex flex-col">
        {/* Top header row with panel control */}
        <div className="ml-2 mb-2">Manage Shop Products</div>
        <div className="flex gap-4- mb-2">
          <div className={`transition-all duration-200 ${
            categoriesExpanded ? 'min-w-56' : 'w-16-'
          }`}>
            <div className="ml-2 justify-start flex justify-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                      className="size-10"
                    >
                      <ChevronLeft className={`size-4 transition-transform ${
                        categoriesExpanded ? '' : 'rotate-180'
                      }`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{categoriesExpanded ? 'Collapse' : 'Expand'} categories</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="flex gap-4- flex-1 overflow-hidden">
          {/* Categories Sidebar */}
          <div className={`flex flex-col transition-all duration-200 ${
            categoriesExpanded ? 'min-w-56' : 'w-16-'
          } border-r`}>
            {/* Categories content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className={`flex ${
                categoriesExpanded ? 'justify-start px-2' : 'justify-center'
              } mb-2`}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCategoryDialogOpen(true)}
                        className="w-10 h-10 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Add new category</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                  <div className={`flex flex-col gap-2 ${
                    categoriesExpanded ? 'px-0' : 'items-center px-2'
                  }`}>
                    {categories.map((c) => (
                      <SortableCategory
                        key={c._id}
                        category={c}
                        isActive={category._id === c._id}
                        expanded={categoriesExpanded}
                        onSelect={() => {
                          setCategory(c);
                          setProduct({ new: false });
                          getCategoryProducts(c);
                        }}
                        onEdit={() => {
                          setEditingCategory(c);
                          setEditCategoryName(c.name);
                          setEditCategoryThumbnail(c.thumbnail || '');
                          setEditCategoryDialogOpen(true);
                        }}
                        onEditIcon={() => {
                          setEditingCategory(c);
                          setEditCategoryName(c.name);
                          setEditCategoryThumbnail(c.thumbnail || '');
                          setCategoryIconMode('edit');
                          setCategoryIconDialogOpen(true);
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
          </div>
          
          {/* Folders Column */}
          <div className="flex flex-col w-16 border-r h-full">
            <div className="flex-1 overflow-y-auto min-h-0 py-2-">
              <div className="flex flex-col items-center gap-2">
                <TooltipProvider>
                  {/* Add new folder button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-10 h-10 cursor-pointer"
                        onClick={() => setFolderSheetOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Add new folder</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Show all button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className={`size-10 ${selectedFolder === null ? 'ring-2 ring-white' : ''} cursor-pointer`}
                        onClick={() => {
                          setSelectedFolder(null);
                          setProducts(allProducts);
                        }}
                      >
                        <span className="">All</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Show all products</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {folders.map((folder) => {
                    // Get initials from folder name
                    const initials = folder.name
                      .split(' ')
                      .map(word => word[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    
                    return (
                      <Tooltip key={folder._id}>
                        <TooltipTrigger asChild>
                          <div 
                            className={`cursor-pointer transition-all ${
                              selectedFolder?._id === folder._id 
                                ? 'scale-110- ring-2 ring-white rounded-md' 
                                : 'hover:scale-110'
                            }`}
                            onClick={() => handleFolderClick(folder)}
                          >
                            <div
                              style={{ 
                                backgroundColor: colors?.[folder.color?.split('-')[0]]?.[folder.color?.split('-')[1]] 
                              }}
                              className="size-10 rounded-md border-2 border-border flex items-center justify-center"
                            >
                              <span className="text-xs font-semibold text-white/90">
                                {initials}
                              </span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{folder.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>
          </div>
          
          {/* Products Content */}
          <div className="flex-1 pl-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {category?.name && (
                      <div className="flex items-center gap-2">
                        {category.thumbnail ? (
                          <img 
                            src={category.thumbnail} 
                            alt={category.name} 
                            className="w-6 h-6 rounded object-cover invert"
                          />
                        ) : (
                          <Image className="w-6 h-6 text-foreground" />
                        )}
                        <div>
                          {category.name}
                        </div>
                      </div>
                    )}
                    {selectedFolder && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted">
                        <div
                          style={{ 
                            backgroundColor: colors?.[selectedFolder.color?.split('-')[0]]?.[selectedFolder.color?.split('-')[1]] 
                          }}
                          className="w-3 h-3 rounded-sm"
                        />
                        <span className="text-sm">{selectedFolder.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* New Product Button - moved to right */}
                {category._id && (
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => {
                      const newProductId = addProduct(selectedFolder);
                      setSelectedProductId(newProductId);
                      setSheetOpen(true);
                    }}
                  >
                    New Product
                  </Button>
                )}
              </div>
              
            {/* Save status indicator (removed All changes saved) */}
            {category._id && products.length > 0 && (
              <div className="pb-2">
                {isAnySaving && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Saving changes...</span>
                  </div>
                )}
                {!isAnySaving && hasAnyUnsaved && (
                  <div className="flex items-center gap-2 text-sm text-orange-500">
                    <Save className="h-3 w-3 animate-pulse" />
                    <span>Unsaved changes</span>
                  </div>
                )}
              </div>
            )}



              {/* {categories.map((c, i) => (
                <Tabs.Content
                  key={c._id}
                  value={c.name}
                  className="flex flex-col space-y-4 w-full"
                > */}

                  {/* Products Table */}
                  {products && products.length > 0 ? (
                    <div className="">
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
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No products found. Click "New Product" to add one.
                    </div>
                  )}
                  
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
      
      {/* Folder Management Sheet */}
      <FolderManagementSheet
        open={folderSheetOpen}
        onOpenChange={setFolderSheetOpen}
        category={category}
        onFolderUpdated={(folder, isNew) => {
          // Refresh the folders list
          fetchFolders(category._id);
          setFolderRefreshTrigger(prev => prev + 1);
        }}
        onFolderDeleted={(deletedFolderId) => {
          // If the deleted folder was selected, clear the selection
          if (selectedFolder?._id === deletedFolderId) {
            setSelectedFolder(null);
            setProducts(allProducts);
          }
          // Refresh the folders list
          fetchFolders(category._id);
          setFolderRefreshTrigger(prev => prev + 1);
        }}
      />
      
      {/* Category Icon Select Dialog */}
      <CategoryIconSelect
        open={categoryIconDialogOpen}
        setOpen={setCategoryIconDialogOpen}
        query={categoryIconMode === 'create' ? newCategoryName : editCategoryName}
        onIconSelected={async (thumbnail) => {
          if (categoryIconMode === 'create') {
            setNewCategoryThumbnail(thumbnail);
          } else {
            setEditCategoryThumbnail(thumbnail);
            // Immediately save the icon when selected in edit mode
            if (editingCategory) {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${editingCategory._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  thumbnail: thumbnail 
                }),
              });
              const data = await res.json();
              
              if (data.category) {
                // Update the category in the list
                setCategories(categories.map(c => 
                  c._id === editingCategory._id ? { ...c, thumbnail: thumbnail } : c
                ));
                
                // Update the current category if it's the one being edited
                if (category._id === editingCategory._id) {
                  setCategory({ ...category, thumbnail: thumbnail });
                }
              }
            }
          }
          setCategoryIconDialogOpen(false);
        }}
      />
    </>
  );
}