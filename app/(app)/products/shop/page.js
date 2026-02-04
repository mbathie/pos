'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PackagePlus, Search } from 'lucide-react';
import IconSelect from '@/components/icon-select';
import StandaloneProductSheet from '../StandaloneProductSheet';
import ShopTable from './ShopTable';

export default function Page() {
  const [products, setProducts] = useState([]);

  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productIconDialogOpen, setProductIconDialogOpen] = useState(false);
  const [productIconQuery, setProductIconQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [thumbnailUpdateCallback, setThumbnailUpdateCallback] = useState(null);
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q) ||
      p.tags?.some(tag => tag.name?.toLowerCase().includes(q))
    );
  }, [products, search]);

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

      <div className='relative mb-4'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
        <Input
          placeholder='Search by name, barcode, or tag...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='pl-9 max-w-sm'
        />
      </div>

      <ShopTable products={filteredProducts} onRowClick={handleProductClick} />

      {/* Product Sheet */}
      <StandaloneProductSheet
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
        productId={selectedProductId}
        category={null}
        onProductSaved={handleProductSaved}
        onIconClick={(updateCallback) => {
          setThumbnailUpdateCallback(() => updateCallback);
          setProductIconDialogOpen(true);
        }}
        refreshTrigger={refreshTrigger}
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
                // Update the sheet's internal state immediately
                if (thumbnailUpdateCallback) {
                  thumbnailUpdateCallback(icon);
                }
                // Trigger refresh to re-fetch product in sheet
                setRefreshTrigger(prev => prev + 1);
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
