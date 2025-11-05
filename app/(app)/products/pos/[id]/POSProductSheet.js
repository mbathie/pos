'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import ProductCategorySelector from '@/components/discounts/product-category-selector';

export default function POSProductSheet({ open, onOpenChange, posInterfaceId, categoryId, onSuccess }) {
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [categoriesWithProducts, setCategoriesWithProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableItems();
      setSelectedProducts(new Set());
      setSelectedCategories(new Set());
    }
  }, [open]);

  const fetchAvailableItems = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}/available-items`
      );
      const data = await res.json();
      setCategoriesWithProducts(data.categoriesWithProducts || []);
    } catch (error) {
      console.error('Error fetching available items:', error);
    }
  };

  const handleAdd = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Please select at least one product');
      return;
    }

    setLoading(true);
    try {
      // Get the POS interface to update it
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}`);
      const data = await res.json();
      const posInterface = data.interface;

      // Find the category and add items
      const categoryIndex = posInterface.categories.findIndex(c => c._id === categoryId);
      if (categoryIndex === -1) {
        throw new Error('Category not found');
      }

      const currentItems = posInterface.categories[categoryIndex].items || [];
      const nextOrder = currentItems.length;

      // Add selected products
      const productIds = Array.from(selectedProducts);
      const newItems = productIds.map((productId, index) => ({
        itemType: 'product',
        itemId: productId,
        order: nextOrder + index
      }));

      // If categories are selected, get all products from those categories
      if (selectedCategories.size > 0) {
        const categoryIds = Array.from(selectedCategories);
        categoryIds.forEach(catId => {
          const category = categoriesWithProducts.find(c => c._id === catId);
          if (category && category.products) {
            category.products.forEach((product, index) => {
              newItems.push({
                itemType: 'product',
                itemId: product._id,
                order: nextOrder + productIds.length + index
              });
            });
          }
        });
      }

      // Update the category items
      posInterface.categories[categoryIndex].items = [...currentItems, ...newItems];

      // Save the updated POS interface
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: posInterface.categories })
      });

      toast.success('Products added successfully');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error adding products:', error);
      toast.error('Failed to add products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader className="p-4">
          <SheetTitle>Add Products</SheetTitle>
          <SheetDescription>
            Select products to add to this POS interface
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4 pt-0">
          <div className="flex flex-col gap-2">
            <Label>Products</Label>
            <ProductCategorySelector
              categoriesWithProducts={categoriesWithProducts}
              selectedProducts={selectedProducts}
              selectedCategories={selectedCategories}
              onSelectionChange={({ products, categories }) => {
                setSelectedProducts(products);
                setSelectedCategories(categories);
              }}
              placeholder="Select products to add"
              excludeTypes={['divider']}
              showCategories={false}
            />
            <p className="text-xs text-muted-foreground">
              {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>

        <SheetFooter className="p-4 pt-0">
          <div className="flex gap-2 flex-1">
            <Button
              className="cursor-pointer"
              onClick={handleAdd}
              disabled={loading || selectedProducts.size === 0}
            >
              {loading ? 'Adding...' : 'Add'}
            </Button>
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
