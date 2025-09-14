'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useImmer } from 'use-immer';

// Removed unused sortable imports

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button'
import { Image, Plus, Loader2, Save, Edit2, Trash2, MoreVertical, Folder as FolderIcon, Check, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'


import { actions } from './actions'
import Delete from '../Delete'
import ProductsTable from './ProductsTable'
import ProductSheet from './ProductSheet'
import { FolderManagementSheet } from './FolderManagementSheet'
import IconSelect from '@/components/icon-select'
import colors from '@/lib/tailwind-colors';
import { useAutoSave } from '../useAutoSave';
import { CategoryFolderMenu } from './CategoryFolderMenu';
import { SvgIcon } from '@/components/ui/svg-icon';

// Note: An older SortableCategory component was removed as it was unused

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
  // const [categoriesExpanded, setCategoriesExpanded] = useState(false); // No longer needed
  const [editMode, setEditMode] = useState(false);

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

  // Use the auto-save hook - shop products don't support creating new products via auto-save
  const { isDirty, saving, isAnySaving, hasAnyUnsaved, markAsSaved } = useAutoSave(
    products,
    setProducts,
    autoSaveProduct,
    null, // createProduct - not needed for shop products
    null, // categoryName - not needed for shop products
    3000,
    null  // onProductCreated - not needed for shop products
  );

  // Drag and drop sensors - NO LONGER USED
  // const sensors = useSensors(
  //   useSensor(PointerSensor),
  //   useSensor(KeyboardSensor, {
  //     coordinateGetter: sortableKeyboardCoordinates,
  //   })
  // );

  // Handle drag end for categories - NO LONGER USED
  // const handleDragEnd = async (event) => {
  //   const { active, over } = event;
  //   ...
  // };

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
      // Categories are already sorted by order from the API
      setCategories(c.categories);
      
      // Fetch all folders for all categories
      if (c.categories && c.categories.length > 0) {
        fetchAllFolders();
        
        // Default select the first category
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
  
  const fetchAllFolders = async () => {
    // Fetch all folders regardless of category to show chevrons
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders`);
    const data = await res.json();
    if (data.folders && Array.isArray(data.folders)) {
      setFolders(data.folders);
    } else if (Array.isArray(data)) {
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
                  <Image className="size-8" />
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

      <div className="p-2 pl-0 pr-4 pb-0 h-full flex flex-col">
        {/* Top header row */}
        <div className="p-4 pt-0">Manage Shop Products</div>
        
        {/* Main content area */}
        <div className="flex gap-4- flex-1 overflow-hidden">
          {/* Categories and Folders Menu */}
          <div className="flex flex-col w-64 rounded-tr-lg h-full bg-accent/30">
            <div className="p-2 flex items-center">
              <div className="text-xs text-muted-foreground font-semibold ml-2">Categories</div>
              <div className="flex-1" />
              {editMode ? (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditMode(false)}
                    className="rounded-lg"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant=""
                      size="icon"
                      className="rounded-lg mr-1"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setCategoryDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Category
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditMode(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit List
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/products/mods" className="flex cursor-pointer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Manage Mods
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 px-2">
              <CategoryFolderMenu
                categories={categories}
                folders={folders}
                selectedCategory={category}
                selectedFolder={selectedFolder}
                editMode={editMode}
                onCategoriesReorder={(reorderedCategories) => {
                  setCategories(reorderedCategories);
                }}
                onCategorySelect={(cat) => {
                  if (!editMode) {
                    setCategory(cat);
                    setSelectedFolder(null);
                    getCategoryProducts(cat);
                  }
                }}
                onFolderSelect={async (folder, cat) => {
                  setSelectedFolder(folder);
                  if (category._id !== cat._id) {
                    // Switching to a different category
                    setCategory(cat);
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${cat._id}/products`);
                    const data = await res.json();
                    const categoryProducts = data.products || [];
                    setAllProducts(categoryProducts);
                    
                    // Filter by the selected folder
                    const filtered = categoryProducts.filter(p => p.folder?._id === folder._id);
                    setProducts(filtered);
                  } else {
                    // Same category, just filter by folder
                    const filtered = allProducts.filter(p => p.folder?._id === folder._id);
                    setProducts(filtered);
                  }
                }}
              />
            </div>
          </div>
          
          {/* Products Content */}
          <div className="flex-1 pl-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {category?.name && (
                      <>
                        <div className="flex items-center gap-2">
                          {category.thumbnail ? (
                            <SvgIcon
                              src={category.thumbnail}
                              alt={category.name}
                              className="size-5"
                            />
                          ) : (
                            <Image className="w-6 h-6 text-foreground" />
                          )}
                          <div>
                            {category.name}
                          </div>
                        </div>
                        
                        {/* Category actions menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => {
                              setCategory(category);
                              setFolderSheetOpen(true);
                            }}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Folder
                            </DropdownMenuItem>
                            {folders.length > 0 && (
                              <DropdownMenuItem onClick={() => {
                                setCategory(category);
                                setFolderSheetOpen(true);
                              }}>
                                <FolderIcon className="h-4 w-4 mr-2" />
                                Manage Folders
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {
                              setEditingCategory(category);
                              setEditCategoryName(category.name);
                              setEditCategoryThumbnail(category.thumbnail || '');
                              setCategoryIconMode('edit');
                              setCategoryIconDialogOpen(true);
                            }}>
                              <Image className="h-4 w-4 mr-2" />
                              Edit Icon
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setEditingCategory(category);
                              setEditCategoryName(category.name);
                              setEditCategoryThumbnail(category.thumbnail || '');
                              setEditCategoryDialogOpen(true);
                            }}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Category
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setToDelete({ category: category });
                                setDeleteOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
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
                     className="cursor-pointer"
                     size="sm"
                     onClick={() => {
                       const newProductId = addProduct(selectedFolder);
                       setSelectedProductId(newProductId);
                       setSheetOpen(true);
                     }}
                   >
                     <Plus className="size-4" /> Product
                   </Button>
                 )}
              </div>
              
            {/* Save status indicator (removed All changes saved) */}
            {/* {category._id && products.length > 0 && (
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
            )} */}

              <div className="mt-6">
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
              </div>
                  
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
          fetchAllFolders();
          setFolderRefreshTrigger(prev => prev + 1);
        }}
        onFolderDeleted={(deletedFolderId) => {
          // If the deleted folder was selected, clear the selection
          if (selectedFolder?._id === deletedFolderId) {
            setSelectedFolder(null);
            setProducts(allProducts);
          }
          // Refresh the folders list
          fetchAllFolders();
          setFolderRefreshTrigger(prev => prev + 1);
        }}
      />
      
      {/* Category Icon Select Dialog */}
      <IconSelect
        open={categoryIconDialogOpen}
        setOpen={setCategoryIconDialogOpen}
        query={categoryIconMode === 'create' ? newCategoryName : editCategoryName}
        title="Select Category Icon"
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
