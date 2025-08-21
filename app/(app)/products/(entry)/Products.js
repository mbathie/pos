'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, Ellipsis, Loader2, CheckCircle, Save } from 'lucide-react'
import Variations from './Variations'
import GeneralPricing from './GeneralPricing'
import Delete from '../Delete'
import AddProduct from './AddProduct'
import IconSelect from '@/components/icon-select'
import ProductInstructions from '@/components/product-instructions'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useProduct } from './useProduct';
import { useAutoSave } from '../useAutoSave';

export default function Page({products, setProducts, units, title, description, categoryName, type}) {
  
  const { updateProduct, updateProductKey, addProduct, createProduct } = useProduct(setProducts);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ type: null, productIdx: null, variationIdx: null });
  const [addOpen, setAddOpen] = useState(false);

  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconDialogProductIdx, setIconDialogProductIdx] = useState(null);
  const [iconDialogQuery, setIconDialogQuery] = useState('');

  // Use the auto-save hook
  const { isDirty, saving, isAnySaving, hasAnyUnsaved, markAsSaved } = useAutoSave(products, updateProduct, 3000);

  return (
    <div className='flex flex-col space-y-4'>
      <div className="flex items-center">
        <div className='mb-2'>
          <div className='font-semibold'>{title}</div>
          {description && <div className='text-sm text-muted-foreground'>{description}</div>}
        </div>
        
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
                      markAsSaved(createdProduct._id, createdProduct);
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

          <div className='px-6 pb-2 space-y-2'>
            <Label>Name</Label>
            <Input
              value={p.name} 
              onChange={(e) => {
                setProducts(draft => {
                  draft[pIdx].name = e.target.value;
                })
              }}
            />
          </div>

          <div className="px-6 pb-2 space-y-2">
            <Label>Description</Label>
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

          <div className="px-6">
            <ProductInstructions
              value={p.instructions}
              onChange={(content) => {
                setProducts(draft => {
                  draft[pIdx].instructions = content;
                })
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