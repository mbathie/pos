'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PackagePlus } from 'lucide-react';
import IconSelect from '@/components/icon-select';
import StandaloneProductSheet from '../StandaloneProductSheet';
import ShopTable from './ShopTable';

export default function Page() {
  const [products, setProducts] = useState([]);

  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productIconDialogOpen, setProductIconDialogOpen] = useState(false);
  const [productIconQuery, setProductIconQuery] = useState('');

  // Fetch all shop products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products?type=shop`);
      const data = await res.json();

      // Filter out dividers
      const productsData = Array.isArray(data.products) ? data.products : [];
      const filteredProducts = productsData.filter(p => p.type !== 'divider');

      // Sort products by order
      filteredProducts.sort((a, b) => (a.order || 0) - (b.order || 0));

      setProducts(filteredProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleProductClick = (product) => {
    setSelectedProductId(product._id);
    setProductSheetOpen(true);
  };

  const handleNewProduct = () => {
    const tempId = `new-${Date.now()}`;
    setSelectedProductId(tempId);
    setProductSheetOpen(true);
  };

  const handleProductSaved = async () => {
    await fetchProducts();
  };

  return (
    <div className='px-4 pt-2 w-full h-full flex flex-col py-4'>
      <div className='flex items-center justify-between mb-4'>
        <div>
          <h1 className='text-xl font-semibold mb-1'>Shop Products</h1>
          <p className='text-sm text-muted-foreground'>Manage all shop products</p>
        </div>
        <Button
          size='sm'
          onClick={handleNewProduct}
          className='cursor-pointer'
        >
          <PackagePlus className='size-4 mr-1' />
          New Product
        </Button>
      </div>

      <ShopTable products={products} onRowClick={handleProductClick} />

      {/* Product Sheet */}
      <StandaloneProductSheet
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
        productId={selectedProductId}
        category={null}
        onProductSaved={handleProductSaved}
        onIconClick={() => setProductIconDialogOpen(true)}
      />

      {/* Product Icon Select Dialog */}
      <IconSelect
        open={productIconDialogOpen}
        setOpen={setProductIconDialogOpen}
        onIconSelected={async (icon) => {
          if (selectedProductId) {
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${selectedProductId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product: { thumbnail: icon } })
              });

              if (res.ok) {
                await fetchProducts();
              }
            } catch (error) {
              console.error('Error updating product icon:', error);
            }
          }
          setProductIconDialogOpen(false);
        }}
        query={productIconQuery}
      />
    </div>
  );
}
