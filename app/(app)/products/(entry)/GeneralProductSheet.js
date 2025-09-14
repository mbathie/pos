import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, CheckCircle, Save, Trash2, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProductIcon } from '@/components/product-icon';
import ProductInstructions from '@/app/(app)/products/(entry)/ProductInstructions';
import ProductTerms from '@/app/(app)/products/(entry)/ProductTerms';
import GeneralPricing from './GeneralPricing';

export default function GeneralProductSheet({ 
  open, 
  onOpenChange, 
  products,
  selectedProductId,
  setProducts,
  isDirty,
  saving,
  markAsSaved,
  setIconDialogOpen,
  setIconDialogProductIdx,
  setIconDialogQuery,
  createProduct,
  categoryName
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  
  // Find product and index - handle both real IDs and temporary IDs for new products
  const product = products?.find(p => p._id === selectedProductId);
  const pIdx = products?.findIndex(p => p._id === selectedProductId);
  
  if (!product || pIdx === -1) return null;
  
  const handleDelete = async () => {
    setProducts(draft => {
      draft.splice(pIdx, 1);
    });
    onOpenChange(false);
    setDeleteDialogOpen(false);
    
    // If product has _id, delete from database
    if (product._id) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${product._id}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[75vw] sm:max-w-[75vw] overflow-y-auto p-4">
        <SheetHeader className='m-0 p-0 mt-4'>
          <SheetTitle className="flex items-center gap-4">
            <div 
              className="cursor-pointer"
              onClick={() => {
                setIconDialogOpen(true);
                setIconDialogProductIdx(pIdx);
                setIconDialogQuery(product.name);
              }}
            >
              <ProductIcon
                src={product.thumbnail}
                alt={product.name}
                size="lg"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{product.name}</h2>
            </div>
            
            {/* Auto-save indicator - works for both new and existing products */}
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
                      {saving[product._id] ? (product.isNew ? 'Creating...' : 'Saving...') : 
                       isDirty[product._id] ? 'Unsaved changes (auto-saves in 3s)' : 
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
                <Label htmlFor={`publish-${product._id}`} className="text-sm font-normal">Publish</Label>
                <Switch
                  id={`publish-${product._id}`}
                  checked={product.publish !== undefined ? product.publish : true}
                  onCheckedChange={(checked) => {
                    setProducts(draft => {
                      draft[pIdx].publish = checked;
                    });
                  }}
                />
              </div>
            </div>
            <Input
              type="text"
              placeholder="Product Name"
              onChange={(e) => {
                setProducts(draft => {
                  draft[pIdx].name = e.target.value;
                });
              }}
              value={product.name || ''}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Textarea
              type="text"
              rows={6}
              placeholder="Product description"
              onChange={(e) => {
                setProducts(draft => {
                  draft[pIdx].desc = e.target.value;
                });
              }}
              value={product.desc || ''}
            />
          </div>

          <div>
            <ProductInstructions
              value={product.instructionsContent}
              onChange={(content) => {
                setProducts(draft => {
                  draft[pIdx].instructionsContent = content;
                });
              }}
            />
          </div>

          <div>
            <ProductTerms
              value={product.tandcContent}
              onChange={(content) => {
                setProducts(draft => {
                  draft[pIdx].tandcContent = content;
                });
              }}
              productId={product._id}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`waiver-${pIdx}`}
              checked={product.waiverRequired || false}
              onCheckedChange={(checked) => {
                setProducts(draft => {
                  draft[pIdx].waiverRequired = checked;
                });
              }}
            />
            <Label htmlFor={`waiver-${pIdx}`} className="cursor-pointer">
              Waiver Required
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Check if customers will be required to complete a waiver or not</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Pricing Section */}
          <GeneralPricing
            product={product}
            productIdx={pIdx}
            setProducts={setProducts}
          />
          
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
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
