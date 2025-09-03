'use client'

import { useState, useEffect } from 'react';
import { useImmer } from 'use-immer';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, CheckCircle, Save } from 'lucide-react';
import ProductsTable from '../ProductsTable';
import MembershipsProductSheet from '../MembershipsProductSheet';
import IconSelect from '@/components/icon-select';
import { useProduct } from '../useProduct';
import { useAutoSave } from '../../useAutoSave';

export default function Page() {
  const [products, setProducts] = useImmer([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconDialogProductIdx, setIconDialogProductIdx] = useState(null);
  const [iconDialogQuery, setIconDialogQuery] = useState('');
  
  const categoryName = "memberships";
  
  const { updateProduct, updateProductKey, addProduct, createProduct } = useProduct(setProducts);
  
  // Use the auto-save hook
  const { isDirty, saving, isAnySaving, hasAnyUnsaved, markAsSaved } = useAutoSave(products, updateProduct, 3000);

  const getProducts = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${categoryName}/products`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
    }
  };

  useEffect(() => {
    getProducts();
  }, []);

  return (
    <div className="px-4 pt-2 w-full h-full flex flex-col py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold mb-1">Membership Subscription Products</h1>
          <p className='text-sm text-muted-foreground'>Configure membership plans and pricing</p>
        </div>
        
        <Button 
          size="sm" 
          onClick={async () => {
            // Create a new membership product and save it to database immediately
            const newProduct = {
              name: 'New Membership',
              type: 'membership',
              prices: []
            };
            
            try {
              const createdProduct = await createProduct(categoryName, newProduct);
              if (createdProduct && createdProduct._id) {
                setProducts(prev => [createdProduct, ...prev]);
                setSelectedProductId(createdProduct._id);
                setSheetOpen(true);
                markAsSaved(createdProduct._id, createdProduct);
              }
            } catch (error) {
              console.error('Failed to create new membership product:', error);
            }
          }} 
          className="cursor-pointer"
        >
          <Plus className="size-4 mr-1" />
          New Product
        </Button>
      </div>

      {/* Products Table */}
      <ProductsTable
        products={products}
        onProductClick={(product, idx) => {
          setSelectedProductId(product._id || idx);
          setSheetOpen(true);
        }}
      />
      
      {/* Product Details Sheet */}
      <MembershipsProductSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        products={products}
        selectedProductId={selectedProductId}
        setProducts={setProducts}
        isDirty={isDirty}
        saving={saving}
        markAsSaved={markAsSaved}
        setIconDialogOpen={setIconDialogOpen}
        setIconDialogProductIdx={setIconDialogProductIdx}
        setIconDialogQuery={setIconDialogQuery}
        createProduct={createProduct}
        categoryName={categoryName}
      />
      
      {/* Icon Select Dialog */}
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