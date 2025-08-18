'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, Ellipsis, Info, Loader2, CheckCircle, Save } from 'lucide-react'
import Variations from './Variations'
import GeneralPricing from './GeneralPricing'
import Delete from '../Delete'
import AddProduct from './AddProduct'
import IconSelect from '@/components/icon-select'
import WysiwygEditor from '@/components/wysiwyg-editor'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useProduct } from './useProduct';

export default function Page({products, setProducts, units, title, categoryName, type}) {
  
  const { updateProduct, updateProductKey, addProduct, createProduct } = useProduct(setProducts);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ type: null, productIdx: null, variationIdx: null });
  const [addOpen, setAddOpen] = useState(false);

  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconDialogProductIdx, setIconDialogProductIdx] = useState(null);
  const [iconDialogQuery, setIconDialogQuery] = useState('');

  const originalProducts = useRef({});
  const [isDirty, setIsDirty] = useState({});
  
  // Auto-save state
  const [saving, setSaving] = useState({});
  const autoSaveTimers = useRef({});
  useEffect(() => {
    const updatedIsDirty = { ...isDirty };
    
    // Populate the originalProducts hash with _id as the key
    products.forEach((p) => {
      originalProducts.current[p._id] = originalProducts.current[p._id] || JSON.parse(JSON.stringify(p));
    });

    products.forEach((p) => {
      const isProductChanged = JSON.stringify(p) !== JSON.stringify(originalProducts.current[p._id]);
      updatedIsDirty[p._id] = isProductChanged || !p._id
    });
    setIsDirty(updatedIsDirty);
  }, [products]);

  // Auto-save effect for each dirty product
  useEffect(() => {
    products.forEach((product, pIdx) => {
      const productId = product._id;
      
      // Skip if product is new (no ID yet) or not dirty
      if (!productId || !isDirty[productId]) {
        // Clear any existing timer for this product
        if (autoSaveTimers.current[productId]) {
          clearTimeout(autoSaveTimers.current[productId]);
          delete autoSaveTimers.current[productId];
        }
        return;
      }

      // Clear existing timer if any
      if (autoSaveTimers.current[productId]) {
        clearTimeout(autoSaveTimers.current[productId]);
      }

      // Set new auto-save timer for 5 seconds
      autoSaveTimers.current[productId] = setTimeout(async () => {
        setSaving(prev => ({ ...prev, [productId]: true }));
        
        try {
          const updated = await updateProduct(product);
          originalProducts.current[productId] = JSON.parse(JSON.stringify(updated));
          setIsDirty(prev => ({ ...prev, [productId]: false }));
        } catch (error) {
          console.error('Auto-save error:', error);
        } finally {
          setSaving(prev => ({ ...prev, [productId]: false }));
        }
      }, 3000); // 3 seconds
    });

    // Cleanup timers on unmount
    return () => {
      Object.values(autoSaveTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, [products, isDirty]);

  // Check if any product is being saved or has unsaved changes
  const isAnySaving = Object.values(saving).some(s => s);
  const hasAnyUnsaved = Object.values(isDirty).some(d => d);

  return (
    <div className='flex flex-col space-y-4'>
      <div className="flex items-center">
        <div className='font-semibold mb-2'>{title}</div>
        
        {/* Overall save status */}
        <div className="ml-4 mb-2">
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
          ) : products.some(p => p._id) && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <CheckCircle className="h-3 w-3" />
              <span>All changes saved</span>
            </div>
          )}
        </div>
        
        <div className='flex-1'/>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          New Product
        </Button>
      </div>
      {products.map((p, pIdx) => {
        return (
        <Card key={pIdx}>
          <CardHeader>
            <CardTitle className='flex w-full items-center'>
              <div 
                onClick={() => {
                  setIconDialogOpen(true);
                  setIconDialogProductIdx(pIdx);
                  setIconDialogQuery(p.name);
                }}
                className="mr-4"
              >
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
              <div className="flex-1 font-semibold">{p.name}</div>
              
              {/* Right side controls */}
              <div className="flex items-center gap-2">
                {/* Save status indicator */}
                {p._id && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
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
                
                {/* Manual save button for new products only */}
                {!p._id && (
                  <Button
                    size="sm"
                    className="bg-primary"
                    onClick={async () => {
                      console.log('creating')
                      const createdProduct = await createProduct(categoryName, p);
                      console.log(createdProduct)
                      setProducts(draft => {
                        draft[pIdx] = createdProduct;
                      });
                      originalProducts.current[createdProduct._id] = JSON.parse(JSON.stringify(createdProduct));
                      setIsDirty((prev) => ({ ...prev, [createdProduct._id]: false }));
                    }}
                  >
                    Save
                  </Button>
                )}

                {/* Ellipsis menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size="sm">
                      <Ellipsis className='size-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem
                      onClick={() => {
                        setDeleteTarget({ type: 'product', productIdx: pIdx, product: p });
                        setDeleteOpen(true);
                      }}
                    >
                      Delete Product
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardTitle>
          </CardHeader>

          <div className='px-6 pb-2'>
            <Input
              value={p.name} 
              onChange={(e) => {
                setProducts(draft => {
                  draft[pIdx].name = e.target.value;
                })
              }}
            />
          </div>

          <div className="px-6 pb-2">
            <Textarea
              type="text"
              rows={4}
              placeholder="product description"
              onChange={(e) => {
                setProducts(draft => {
                  draft[pIdx].desc = e.target.value;
                })
              }}
              value={p.desc || ''}
            />
          </div>

          <div className="px-6 space-y-2">
            <div className="flex items-center gap-2">
              <Label>Instructions</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>These instructions will appear in the customer's confirmation email</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <WysiwygEditor
              content={p.instructions || ''}
              onChange={(content) => {
                setProducts(draft => {
                  draft[pIdx].instructions = content;
                })
              }}
              placeholder="Enter product instructions or usage guidelines..."
              minHeight="200px"
              showToolbar={true}
              toolbarPosition="top"
              toolbarOptions={{
                headings: false,
                bold: true,
                italic: true,
                underline: true,
                bulletList: true,
                orderedList: true,
                alignment: false,
                indent: false,
                link: true
              }}
            />
          </div>

          <CardContent>
            {type === 'general' ? (
              <GeneralPricing
                product={p}
                productIdx={pIdx}
                setProducts={setProducts}
              />
            ) : (
              <Variations
                units={units}
                product={p}
                productIdx={pIdx}
                setProducts={setProducts}
                products={products}
              />
            )}
          </CardContent>
        </Card>
        );
      })}
      <Delete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        name={`${deleteTarget.name} ${deleteTarget.unit}`}
        onConfirm={() => {
          const { type, productIdx, variationIdx } = deleteTarget;
          if (type === 'product') {
            setProducts((_p) => {
              _p.splice(productIdx, 1);
            });
          }
          setDeleteOpen(false);
        }}
      />
      <AddProduct
        open={addOpen}
        onOpenChange={setAddOpen}
        setProducts={setProducts}
        addProduct={addProduct}
        type={type}
      />
      <IconSelect
        open={iconDialogOpen}
        setOpen={setIconDialogOpen}
        pIdx={iconDialogProductIdx}
        query={iconDialogQuery}
        updateProduct={updateProductKey}
      />
    </div>
  );
}