import React, { useContext, useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tag, Plus, Ellipsis, Info, Loader2, CheckCircle, Save, Trash2 } from 'lucide-react';
import { FolderSelect } from './FolderSelect';
import { FolderManagementSheet } from './FolderManagementSheet';
import AccountingSelect from './accounting-select';
import { MultiSelect } from '@/components/ui/multi-select';
import colors from 'tailwindcss/colors';
import { actions } from './actions';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTitle } from '@/components/ui/alert-dialog';


export default function ProductSheet({ 
  open, 
  onOpenChange, 
  products,
  selectedProductId,
  category,
  setProducts,
  isDirty,
  saving,
  markAsSaved,
  setIconDialogOpen,
  setIconDialogProductIdx,
  setIconDialogQuery,
  setAddItem,
  setAddItemOpen,
  setDeleteOpen,
  setToDelete
}) {
  // All hooks must be called before any conditional returns
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [folderSheetOpen, setFolderSheetOpen] = React.useState(false);
  const [folderRefreshTrigger, setFolderRefreshTrigger] = React.useState(0);
  
  // State for ModGroups
  const [availableModGroups, setAvailableModGroups] = React.useState([]);
  const [selectedModGroups, setSelectedModGroups] = React.useState([]);
  const [loadingModGroups, setLoadingModGroups] = React.useState(true);
  
  // Destructure the actions we need
  const {
    updateProduct,
    updateVariation,
    addVariation,
    deleteVariation,
    setFolder,
    saveProduct,
    deleteProduct
  } = actions({category, setProducts});
  
  // Find product and index after all hooks
  const product = products?.find(p => p._id === selectedProductId);
  const pIdx = products?.findIndex(p => p._id === selectedProductId);
  
  // Fetch available ModGroups
  React.useEffect(() => {
    async function fetchModGroups() {
      try {
        setLoadingModGroups(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/modgroups`);
        const data = await res.json();
        setAvailableModGroups(data.modGroups || []);
      } catch (error) {
        console.error('Error fetching mod groups:', error);
      } finally {
        setLoadingModGroups(false);
      }
    }
    
    if (open) {
      fetchModGroups();
    }
  }, [open]);
  
  // Update selected mod groups when product changes
  React.useEffect(() => {
    if (product?.modGroups) {
      setSelectedModGroups(product.modGroups);
    } else {
      setSelectedModGroups([]);
    }
  }, [product]);
  
  // Handle mod groups selection change
  const handleModGroupsChange = (newSelection) => {
    setSelectedModGroups(newSelection);
    updateProduct({pIdx, key: "modGroups", value: newSelection});
  };
  
  // Conditional return must come after all hooks
  if (!product || pIdx === -1) return null;
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[75vw] sm:max-w-[75vw] overflow-y-auto p-4">
        <SheetHeader className='m-0 p-0 mt-4'>
          <SheetTitle className="flex items-center gap-4">
            <div onClick={() => {
              setIconDialogOpen(true);
              setIconDialogProductIdx(pIdx);
              setIconDialogQuery(product.name);
            }}>
              {!product?.thumbnail ? (
                <Button className="bg-white rounded-lg size-16">
                  <Tag className="!w-8 !h-8" />
                </Button>
              ) : (
                <Button className="rounded-lg -p-1 size-16">
                  <img className='rounded-lg size-16' src={product.thumbnail} alt="Thumbnail" />
                </Button>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{product.name}</h2>
            </div>
            
            {/* Auto-save indicator */}
            {product._id && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      {saving[product._id] ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : isDirty[product._id] ? (
                        <Save className="h-5 w-5 text-orange-500 animate-pulse" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {saving[product._id] ? 'Saving...' : 
                       isDirty[product._id] ? 'Unsaved changes (auto-saves in 3s)' : 
                       'All changes saved'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Manual save for new products */}
            {!product._id && (
              <Button
                size="sm"
                onClick={async () => {
                  const updated = await saveProduct({product, pIdx})
                  if (updated) {
                    markAsSaved(updated._id, updated);
                  }
                }}
              >
                Save
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col space-y-6 mt-4">
          <div className="flex flex-col gap-2">
            <Label>Product Name</Label>
            <Input
              type="text"
              placeholder="Flat White"
              onChange={(e) => updateProduct({pIdx, key: "name", value: e.target.value})}
              value={product.name || ''}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label>Send to Bump</Label>
            <Switch
              id={`bump-${product._id}`}
              checked={product.bump !== undefined ? product.bump : true}
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

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Textarea
              type="text"
              rows={6}
              placeholder=""
              onChange={(e) => updateProduct({pIdx, key: "desc", value: e.target.value})}
              value={product.desc || ''}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Folder</Label>
            <FolderSelect 
              pIdx={pIdx} 
              product={product} 
              setFolder={setFolder}
              onManageFolders={() => setFolderSheetOpen(true)}
              refreshTrigger={folderRefreshTrigger}
              category={category}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Accounting Code</Label>
            <AccountingSelect 
              value={product.accounting} 
              onChange={(value) => {
                updateProduct({pIdx, key: "accounting", value});
              }}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                <Label>Qty</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size="15"/>
                    </TooltipTrigger>
                    <TooltipContent>
                      Quantity in stock of this item
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="number"
                min="0"
                value={product.qty || ''}
                onChange={(e) => {
                  updateProduct({pIdx, key: "qty", value: parseInt(e.target.value) || 0});
                }}
                placeholder="0"
                className="w-24"
              />
            </div>
            
            <div className="flex flex-col gap-2">
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
                value={product.par || ''}
                onChange={(e) => {
                  updateProduct({pIdx, key: "par", value: parseInt(e.target.value) || 0});
                }}
                placeholder="0"
                className="w-24"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Variations</Label>
            
            <div className="space-y-2">
              {product?.variations?.map((v, i) => (
                <div key={`${product._id}-${i}`} className="flex gap-2 items-center">
                  <Input
                    type="text" 
                    placeholder="SM" 
                    value={v.name || ''} 
                    className="w-24"
                    onChange={(e) => updateVariation({pIdx, vIdx: i, key: "name", value: e.target.value})}
                  />
                  <Input
                    type="text" 
                    placeholder="5.50" 
                    value={v.amount || ''}
                    className="w-24"
                    onChange={(e) => updateVariation({pIdx, vIdx: i, key: "amount", value: e.target.value})}
                  />
                  <Button
                    className="cursor-pointer"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      deleteVariation({ pIdx, vIdx: i });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {/* Add + button below variations, left-aligned */}
              <div className="flex gap-2 items-center">
                <Button
                  size="icon" 
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => addVariation({pIdx})}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mods</Label>
            <MultiSelect
              options={availableModGroups.map(group => ({
                value: group._id,
                label: group.name
              }))}
              selected={selectedModGroups}
              onChange={handleModGroupsChange}
              placeholder={loadingModGroups ? "Loading..." : "Select modification groups..."}
              emptyText="No modification groups available"
              className="w-full"
            />
            {!loadingModGroups && availableModGroups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No modification groups have been created yet. <a href="/products/mods" className="text-primary hover:underline">Create groups</a> to add product modifications.
              </p>
            )}
          </div>
          
          {/* Delete Product Button */}
          <div className="w-54">
            <Button
              variant="destructive"
              className="w-full cursor-pointer"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Product
            </Button>
          </div>
        </div>
      </SheetContent>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{product?.name}"? This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteProduct({ pIdx, product });
                onOpenChange(false); // Close the sheet
                setDeleteDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Folder Management Sheet */}
      <FolderManagementSheet
        open={folderSheetOpen}
        onOpenChange={setFolderSheetOpen}
        initialFolder={product?.folder}
        category={category}
        onFolderUpdated={(folder, isNew) => {
          // If it's a new folder or updating existing, set it as the product's folder
          if (product && folder) {
            setFolder({folder, pIdx});
          }
          // Trigger refresh of the folder list in FolderSelect
          setFolderRefreshTrigger(prev => prev + 1);
        }}
        onFolderDeleted={(deletedFolderId) => {
          // If the deleted folder was the one selected for this product, clear it
          if (product?.folder?._id === deletedFolderId) {
            updateProduct({pIdx, key: "folder", value: null});
          }
          // Trigger refresh of the folder list in FolderSelect
          setFolderRefreshTrigger(prev => prev + 1);
        }}
      />
    </Sheet>
  );
}