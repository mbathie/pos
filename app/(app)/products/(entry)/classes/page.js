'use client'

import { useState, useEffect } from 'react';
import { useImmer } from 'use-immer';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ProductsTable from '../ProductsTable';
import ClassesProductSheet from '../ClassesProductSheet';
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
  
  const categoryName = "class";
  
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
          <h1 className="text-xl font-semibold mb-1">Setup Class and Course Products</h1>
          <p className='text-sm text-muted-foreground'>Configure class schedules and course offerings</p>
        </div>
                
        <Button 
          size="sm" 
          onClick={() => {
            const newProductId = addProduct('New Class', 'class');
            if (newProductId) {
              setSelectedProductId(newProductId);
              setSheetOpen(true);
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
        showType={true}  // Show class/course type column
        onProductClick={(product, idx) => {
          setSelectedProductId(product._id || idx);
          setSheetOpen(true);
        }}
      />
      
      {/* Product Details Sheet */}
      <ClassesProductSheet
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
