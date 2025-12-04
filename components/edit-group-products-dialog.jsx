'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/ui/action-button';
import { Label } from '@/components/ui/label';
import { IconButton } from '@/components/control-button';
import { toast } from 'sonner';
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from '@/components/ui/multi-select';

export function EditGroupProductsDialog({
  open,
  onOpenChange,
  group,
  transaction,
  onUpdate
}) {
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [groupQty, setGroupQty] = useState(1);

  // Fetch all products when dialog opens
  useEffect(() => {
    if (open && group) {
      fetchProducts();
      // Initialize with current products in the group
      const currentProductIds = group.products.map(p => p._id.toString());
      setSelectedProductIds(currentProductIds);
      setGroupQty(group.groupQty || 1);
    }
  }, [open, group]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?type=shop');
      if (response.ok) {
        const data = await response.json();
        // API returns { products: [], total: number }
        const productsList = data.products || data;
        // Filter to only show shop type products
        const shopProducts = Array.isArray(productsList)
          ? productsList.filter(p => p.type === 'shop')
          : [];
        setAllProducts(shopProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
      setAllProducts([]);
    }
  };

  const handleSave = async () => {
    if (selectedProductIds.length === 0) {
      return { error: true, message: 'Please select at least one product' };
    }

    try {
      const response = await fetch(`/api/transactions/${transaction._id}/update-group`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gId: group.gId,
          productIds: selectedProductIds,
          groupQty: groupQty
        })
      });

      if (response.ok) {
        const updatedTransaction = await response.json();
        toast.success('Group updated successfully');
        onUpdate?.(updatedTransaction);
        onOpenChange(false);
        return { error: false };
      } else {
        const error = await response.json();
        return { error: true, message: error.message || 'Failed to update group' };
      }
    } catch (error) {
      console.error('Error updating group:', error);
      return { error: true, message: 'Failed to update group' };
    }
  };

  // Calculate current and new totals
  const formatCurrency = (amount) => `$${parseFloat(amount || 0).toFixed(2)}`;

  // Calculate current total from original group
  const currentSubtotal = (group?.groupAmount || 0) * (group?.groupQty || 1);

  // Calculate new total based on selected products and quantity
  const newSubtotal = selectedProductIds.reduce((total, productId) => {
    // First try to find in allProducts (shop items)
    let product = allProducts.find(p => p._id === productId);

    // If not found, try to find in original group products (classes, etc.)
    if (!product) {
      product = group?.products?.find(p => p._id.toString() === productId);
    }

    if (!product) return total;

    // Get the product price - try different locations where price might be stored
    // For products already in the group, use amount.subtotal (configured price)
    // For new products, use value (base product price)
    const productPrice = product.amount?.subtotal || product.value || product.price || 0;
    return total + (productPrice * groupQty);
  }, 0);

  const currentTax = currentSubtotal * 0.1;
  const newTax = newSubtotal * 0.1;
  const currentTotal = currentSubtotal + currentTax;
  const newTotal = newSubtotal + newTax;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl flex flex-col h-full">
        <SheetHeader className="shrink-0">
          <SheetTitle>Edit {group?.groupName}</SheetTitle>
          <SheetDescription>
            Modify the products and quantity for this group. Changes will update the invoice.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-4">
            {/* Group Quantity Control */}
            <div className="flex items-center justify-between py-2-">
              <span className="text-sm font-medium">Group Quantity</span>
              <div className="flex items-center gap-2">
                <IconButton
                  icon="minus"
                  onClick={() => setGroupQty(Math.max(1, groupQty - 1))}
                  disabled={groupQty <= 1}
                />
                <div className="w-12 text-center font-medium">
                  {groupQty}
                </div>
                <IconButton
                  icon="plus"
                  onClick={() => setGroupQty(groupQty + 1)}
                />
              </div>
            </div>

            {/* Product Selection - Multi-select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add/Remove Products</Label>
              <MultiSelect
                values={selectedProductIds}
                onValuesChange={setSelectedProductIds}
              >
                <MultiSelectTrigger className="w-full cursor-pointer">
                  <MultiSelectValue placeholder="Select products..." />
                </MultiSelectTrigger>
                <MultiSelectContent search={{ placeholder: "Search products...", emptyMessage: "No products found" }}>
                  {Array.isArray(allProducts) && allProducts.length > 0 ? (
                    allProducts.map((product) => (
                      <MultiSelectItem
                        key={product._id}
                        value={product._id}
                        badgeLabel={product.name}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{product.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">{product.type}</span>
                        </div>
                      </MultiSelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Loading products...
                    </div>
                  )}
                </MultiSelectContent>
              </MultiSelect>
            </div>

            {/* Cart-style Product List */}
            <div className="space-y-2- py-4-">
              {/* Show all products from the original group, plus any newly selected shop items */}
              {group?.products?.map((product) => {
                const isInNew = selectedProductIds.includes(product._id.toString());
                const isRemoved = !isInNew;

                return (
                  <div
                    key={product._id}
                    className={`flex items-center justify-between py-2 ${isRemoved ? 'opacity-50' : ''}`}
                  >
                    <div className="flex-1">
                      <div className={`text-sm ${isRemoved ? 'line-through' : ''}`}>
                        {groupQty > 1 && `${groupQty}x `}{product.name}
                        {isRemoved && <span className="ml-2 text-xs text-red-500">REMOVED</span>}
                      </div>
                    </div>
                    <div className={`text-sm ${isRemoved ? 'line-through' : ''}`}>
                      {formatCurrency((product.amount?.subtotal || product.value || product.price || 0) * groupQty)}
                    </div>
                  </div>
                );
              })}
              {/* Show newly added shop items that weren't in the original group */}
              {allProducts
                .filter(p => selectedProductIds.includes(p._id) && !group?.products?.some(gp => gp._id.toString() === p._id))
                .map((product) => {
                  return (
                    <div
                      key={product._id}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex-1">
                        <div className="text-sm">
                          {groupQty > 1 && `${groupQty}x `}{product.name}
                          <span className="ml-2 text-xs text-green-500">NEW</span>
                        </div>
                      </div>
                      <div className="text-sm">
                        {formatCurrency((product.amount?.subtotal || product.value || product.price || 0) * groupQty)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="shrink-0 px-4 py-4-">
          <div className="flex flex-col text-sm">
            <div className="flex">
              <div className="">Subtotal</div>
              <div className="ml-auto">{formatCurrency(currentSubtotal)}</div>
            </div>
            <div className="flex">
              <div className="">Tax</div>
              <div className="ml-auto">{formatCurrency(currentTax)}</div>
            </div>
            <div className="flex font-semibold">
              <div className="uppercase">Total</div>
              <div className="ml-auto">{formatCurrency(currentTotal)}</div>
            </div>
            {currentTotal !== newTotal && (
              <div className="flex font-semibold mt-3 pt-3 border-t">
                <div className="uppercase">New Total</div>
                <div className="ml-auto">{formatCurrency(newTotal)}</div>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <ActionButton
            action={handleSave}
            requireAreYouSure={true}
            areYouSureDescription="This will edit your order invoice and re-send an updated invoice to the customer."
            disabled={selectedProductIds.length === 0}
            className="cursor-pointer"
          >
            Save Changes
          </ActionButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
