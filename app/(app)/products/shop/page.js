'use client';

import React, { useState, useEffect } from 'react';
import { useImmer } from 'use-immer';


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Separator } from '@radix-ui/react-separator'
import { Button } from '@/components/ui/button'
import { Tag, Plus, Ellipsis, EllipsisVertical, Info, Trash, Loader2, CheckCircle, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

import { actions } from './actions'
import Delete from '../Delete'
import ProductsTable from './ProductsTable'
import ProductSheet from './ProductSheet'
import { FolderSelect } from './folder-select'
import IconSelect  from '@/components/icon-select'
import AccountingSelect from './accounting-select'
import colors from 'tailwindcss/colors';
import { useAutoSave } from '../useAutoSave';

export default function Page() {
  const [categories, setCategories] = useState([]);
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

  const getCategoryProducts = async (c) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${c._id}/products`);
    const _products = await res.json()
    setProducts(_products.products)
  };

  return (
    <>
      {/* Category Dialog */}
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

      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-lg font-semibold">
            Retail Shop Products
          </h1>
        </div>
        <div className="flex gap-4">
          {/* Categories Sidebar */}
          <div className="flex flex-col min-w-56">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Categories
              </h2>
              <Button
                size="icon"
                onClick={() => setCategoryDialogOpen(true)}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col">
              {categories.map((c) => (
                <div
                  key={c._id}
                  className={`group flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                    category._id === c._id ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <div
                    className="flex-1 text-sm"
                    onClick={() => {
                      setCategory(c);
                      setProduct({ new: false });
                      getCategoryProducts(c);
                    }}
                  >
                    {c.name}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EllipsisVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setToDelete({ category: c });
                          setDeleteOpen(true);
                        }}
                      >
                        Delete Category
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
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
                      <div className="flex items-center gap-2 text-sm text-green-500">
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
                    setToDelete={setToDelete}
                    setDeleteOpen={setDeleteOpen}
                    isDirty={isDirty}
                    saving={saving}
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