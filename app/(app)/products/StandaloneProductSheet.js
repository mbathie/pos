'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tag, Plus, Info, Loader2, Trash2, CheckCircle, Save } from 'lucide-react';
import { toast } from "sonner";
import { FolderSelect } from './shopold/FolderSelect';
import { FolderManagementSheet } from './shopold/FolderManagementSheet';
import AccountingSelect from './shopold/accounting-select';
import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectValue,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectGroup
} from '@/components/ui/multi-select';
import Link from 'next/link';
import IconSelect from '@/components/icon-select';

export default function StandaloneProductSheet({
  open,
  onOpenChange,
  productId,
  category,
  onProductSaved,
  onIconClick
}) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [folderSheetOpen, setFolderSheetOpen] = useState(false);
  const [folderRefreshTrigger, setFolderRefreshTrigger] = useState(0);
  const [availableModGroups, setAvailableModGroups] = useState([]);
  const [selectedModGroups, setSelectedModGroups] = useState([]);
  const [loadingModGroups, setLoadingModGroups] = useState(true);
  const saveTimeoutRef = React.useRef(null);

  // Fetch product data when sheet opens
  useEffect(() => {
    if (open && productId && !productId.startsWith('new-')) {
      fetchProduct();
    } else if (open && productId && productId.startsWith('new-')) {
      // Create new product
      setProduct({
        _id: productId,
        name: '',
        desc: '',
        category: category?._id,
        variations: [{ name: '', amount: '' }],
        type: 'shop',
        publish: true,
        bump: true,
        qty: 0,
        par: 0,
        folder: null,
        accounting: null,
        modGroups: []
      });
    }
  }, [open, productId]);

  // Fetch available ModGroups when sheet opens
  useEffect(() => {
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
  useEffect(() => {
    if (product?.modGroups) {
      setSelectedModGroups(product.modGroups);
    } else {
      setSelectedModGroups([]);
    }
  }, [product]);

  // Auto-save effect - trigger save 3 seconds after changes
  useEffect(() => {
    if (isDirty && product && product._id) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // For new products, only auto-save if name is filled
      const isNew = product._id.startsWith('new-');
      if (isNew && !product.name) {
        return;
      }

      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, product]);

  // Clean up timeout when sheet closes
  useEffect(() => {
    if (!open) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setIsDirty(false);
    }
  }, [open]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${productId}`);
      const data = await res.json();
      if (res.ok) {
        setProduct(data.product);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (showToast = false) => {
    if (!product.name) {
      if (showToast) {
        toast.error('Product name is required');
      }
      return null;
    }

    setSaving(true);
    try {
      const isNew = product._id.startsWith('new-');
      const url = isNew
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${product._id}`;

      // Prepare the product data
      const productData = {
        ...product,
        // Extract just the ID if folder is populated
        folder: product.folder?._id || product.folder || null,
        // Extract just the ID if accounting is populated
        accounting: product.accounting?._id || product.accounting || null,
      };

      // Remove the temporary _id for new products
      if (isNew) {
        delete productData._id;
      }

      // Both POST and PUT expect { product: ... }
      const body = { product: productData };

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        if (showToast) {
          toast.success(isNew ? 'Product created' : 'Product updated');
        }

        // If it was a new product, update the product state with the new ID
        if (isNew) {
          setProduct(data.product);
        }

        setIsDirty(false);
        onProductSaved?.(data.product);
        return data.product;
      } else {
        if (showToast) {
          toast.error(data.error || 'Failed to save product');
        }
        console.error('Save error:', data);
        return null;
      }
    } catch (error) {
      console.error('Error saving product:', error);
      if (showToast) {
        toast.error('Failed to save product');
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setProduct(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const updateVariation = (index, field, value) => {
    setProduct(prev => {
      const newVariations = [...prev.variations];
      newVariations[index] = { ...newVariations[index], [field]: value };
      return { ...prev, variations: newVariations };
    });
    setIsDirty(true);
  };

  const addVariation = () => {
    setProduct(prev => ({
      ...prev,
      variations: [...(prev.variations || []), { name: '', amount: '' }]
    }));
    setIsDirty(true);
  };

  const deleteVariation = (index) => {
    setProduct(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index)
    }));
    setIsDirty(true);
  };

  const handleModGroupsChange = (newSelection) => {
    setSelectedModGroups(newSelection);
    updateField('modGroups', newSelection);
    setIsDirty(true);
  };

  const handleDeleteProduct = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${product._id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Product deleted');
        onOpenChange(false);
        onProductSaved?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-6 animate-spin" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[75vw] sm:max-w-[75vw] overflow-y-auto p-4">
          <SheetHeader className='m-0 p-0 mt-4'>
            <SheetTitle className="flex items-center gap-4">
              <div onClick={onIconClick}>
                {!product?.thumbnail ? (
                  <Button className="rounded-lg size-16 cursor-pointer">
                    <Tag className="!w-8 !h-8" />
                  </Button>
                ) : (
                  <Button className="rounded-lg -p-1 size-16 cursor-pointer">
                    <img className='rounded-lg size-16' src={product.thumbnail} alt="Thumbnail" />
                  </Button>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{product.name || 'New Product'}</h2>
              </div>

              {/* Auto-save indicator for all products */}
              {product._id && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        {saving ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : isDirty ? (
                          <Save className="h-5 w-5 text-orange-500 animate-pulse" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {saving ? 'Saving...' :
                         isDirty ? 'Unsaved changes (auto-saves in 2s)' :
                         'All changes saved'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col space-y-6 mt-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Product Name</Label>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Select publish if you want this product to appear in your POS</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Label htmlFor={`publish-${product._id}`} className="text-sm font-normal">Publish</Label>
                  <Switch
                    id={`publish-${product._id}`}
                    checked={product.publish !== undefined ? product.publish : true}
                    onCheckedChange={(checked) => updateField('publish', checked)}
                  />
                </div>
              </div>
              <Input
                type="text"
                placeholder="Flat White"
                onChange={(e) => updateField('name', e.target.value)}
                value={product.name || ''}
              />
            </div>

            <div className="flex items-center gap-2">
              <Label>Send to Bump</Label>
              <Switch
                id={`bump-${product._id}`}
                checked={product.bump !== undefined ? product.bump : true}
                onCheckedChange={(checked) => updateField('bump', checked)}
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
                onChange={(e) => updateField('desc', e.target.value)}
                value={product.desc || ''}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Folder</Label>
              <FolderSelect
                pIdx={0}
                product={product}
                setFolder={({ folder }) => updateField('folder', folder)}
                onManageFolders={() => setFolderSheetOpen(true)}
                refreshTrigger={folderRefreshTrigger}
                category={category}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Accounting Code</Label>
              <AccountingSelect
                value={product.accounting}
                onChange={(value) => updateField('accounting', value)}
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
                <NumberInput
                  min={0}
                  value={product.qty || null}
                  onChange={(value) => updateField('qty', value || 0)}
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
                <NumberInput
                  min={0}
                  value={product.par || null}
                  onChange={(value) => updateField('par', value || 0)}
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
                      onChange={(e) => updateVariation(i, 'name', e.target.value)}
                    />
                    <NumberInput
                      placeholder="5.50"
                      value={v.amount ? parseFloat(v.amount) : null}
                      min={0}
                      step={0.01}
                      className="w-24"
                      onChange={(value) => updateVariation(i, 'amount', value ? value.toString() : '')}
                    />
                    <Button
                      className="cursor-pointer"
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteVariation(i)}
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
                    onClick={addVariation}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mods</Label>
                <Link href="/products/mods">
                  <Button variant="outline" size="sm" className="cursor-pointer">
                    Manage Mods
                  </Button>
                </Link>
              </div>
              <MultiSelect
                values={selectedModGroups}
                onValuesChange={handleModGroupsChange}
              >
                <MultiSelectTrigger className="w-full">
                  <MultiSelectValue
                    placeholder={loadingModGroups ? "Loading..." : "Select modification groups..."}
                  />
                </MultiSelectTrigger>
                <MultiSelectContent>
                  <MultiSelectGroup>
                    {availableModGroups.length > 0 ? (
                      availableModGroups.map(group => (
                        <MultiSelectItem
                          key={group._id}
                          value={group._id}
                          badgeLabel={group.name}
                          keywords={[group.name]}
                        >
                          {group.name}
                        </MultiSelectItem>
                      ))
                    ) : (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No modification groups available
                      </div>
                    )}
                  </MultiSelectGroup>
                </MultiSelectContent>
              </MultiSelect>
              {!loadingModGroups && availableModGroups.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No modification groups have been created yet. <a href="/products/mods" className="text-primary hover:underline">Create groups</a> to add product modifications.
                </p>
              )}
            </div>

            {/* Delete Product Button - only show for existing products */}
            {!product._id.startsWith('new-') && (
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
            )}
          </div>
        </SheetContent>
      </Sheet>

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
                await handleDeleteProduct();
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
          if (product && folder) {
            updateField('folder', folder);
          }
          setFolderRefreshTrigger(prev => prev + 1);
        }}
        onFolderDeleted={(deletedFolderId) => {
          if (product?.folder?._id === deletedFolderId) {
            updateField('folder', null);
          }
          setFolderRefreshTrigger(prev => prev + 1);
        }}
      />
    </>
  );
}
