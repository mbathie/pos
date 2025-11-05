'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { ProductThumbnail } from '@/components/product-thumbnail';
import { ChevronRight, Check } from 'lucide-react';
import ProductDetail from './retail/productDetail';
import ProductDetailClass from './(other)/classes/productDetailClass';
import ProductDetailCourse from './(other)/classes/ProductDetailCourse';
import ProductDetailMembership from './(other)/memberships/productDetailMembership';
import { useImmer } from 'use-immer';

export default function GroupSheet({
  open,
  onOpenChange,
  group,
  onAddToCart,
  useClass,
  useMembership,
  getProductTotal,
  migrateScheduleFormat
}) {
  const [configuredProducts, setConfiguredProducts] = useImmer({});
  const [currentProduct, setCurrentProduct] = useImmer(null);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [groupTotal, setGroupTotal] = useState(0);

  const { setTimesClass, setTimesCourse } = useClass || {};

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setProductSheetOpen(false);
      setCurrentProduct(null);
      setConfiguredProducts({});
    }
  }, [open]);

  // Calculate group total
  useEffect(() => {
    if (!group) return;

    let total = 0;
    const productIds = Object.keys(configuredProducts);

    if (productIds.length === 0) {
      // Use group amount if no products configured
      total = group.amount || 0;
    } else {
      // Sum up configured product totals
      productIds.forEach(productId => {
        const product = configuredProducts[productId];
        if (product && getProductTotal) {
          total += getProductTotal({ product });
        }
      });
    }

    setGroupTotal(total);
  }, [configuredProducts, group, getProductTotal]);

  const handleProductClick = (product) => {
    // Check if product is already configured
    const existingConfig = configuredProducts[product._id];

    // For shop items (or items with variations), ensure variations have selected property initialized
    let variations = product.variations;
    if (variations && !existingConfig && product.type !== 'class' && product.type !== 'course' && product.type !== 'membership') {
      variations = variations.map(v => ({
        ...v,
        selected: v.selected || false
      }));
    }

    const cartProduct = {
      ...product,
      ...(existingConfig || {}),
      stockQty: product.qty,
      qty: existingConfig?.qty || (product.type === 'class' || product.type === 'course' || product.type === 'membership' ? 0 : 1),
      schedule: product.type === 'course' && migrateScheduleFormat ? migrateScheduleFormat(product.schedule) : product.schedule,
      variations: existingConfig?.variations || variations
    };

    setCurrentProduct(cartProduct);

    if (product.type === 'class' && setTimesClass) {
      setTimesClass(cartProduct);
    } else if (product.type === 'course' && setTimesCourse) {
      setTimesCourse(cartProduct);
    }

    setProductSheetOpen(true);
  };

  const handleProductConfigured = (configuredProduct) => {
    setConfiguredProducts(draft => {
      draft[configuredProduct._id] = configuredProduct;
    });
    setProductSheetOpen(false);
    setCurrentProduct(null);
  };

  const handleAddGroupToCart = () => {
    if (!group || !onAddToCart) return;

    // Generate a unique group instance ID for this specific group purchase
    const gId = `${group._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get all configured products or use defaults, and add them flatly with group metadata
    const configuredProductsList = group.products?.map(product => {
      const configured = configuredProducts[product._id];
      const baseProduct = configured || {
        ...product,
        stockQty: product.qty,
        qty: product.type === 'class' || product.type === 'course' || product.type === 'membership' ? 0 : 1,
        schedule: product.type === 'course' && migrateScheduleFormat ? migrateScheduleFormat(product.schedule) : product.schedule
      };

      // Add group metadata to each product
      return {
        ...baseProduct,
        groupId: group._id,           // The product group template ID
        gId: gId,                      // Unique instance ID for this purchase
        groupName: group.name,         // Group name for display
        groupAmount: group.amount,     // Group price in dollars
        groupThumbnail: group.thumbnail
      };
    }) || [];

    // Add all products to cart individually (they're already configured)
    configuredProductsList.forEach(product => {
      onAddToCart(product);
    });

    // Reset and close
    setConfiguredProducts({});
    onOpenChange(false);
  };

  const isProductConfigured = (productId) => {
    return !!configuredProducts[productId];
  };

  const getProductSummary = (product) => {
    const configured = configuredProducts[product._id];
    if (!configured) return null;

    const parts = [];

    // Variation
    if (configured.selectedVariation) {
      const variation = configured.variations?.find(v => v._id === configured.selectedVariation);
      if (variation) {
        parts.push(variation.name);
      }
    }

    // Mods
    if (configured.selectedMods && configured.selectedMods.length > 0) {
      parts.push(`${configured.selectedMods.length} mod${configured.selectedMods.length !== 1 ? 's' : ''}`);
    }

    // Quantity
    if (configured.qty > 1) {
      parts.push(`Qty: ${configured.qty}`);
    }

    return parts.join(' • ');
  };

  if (!group) return null;

  // Ensure products array exists
  const groupProducts = group.products || [];

  return (
    <>
      {/* Product configuration sheets */}
      {currentProduct?.type === 'class' && (
        <ProductDetailClass
          product={currentProduct}
          setProduct={setCurrentProduct}
          open={productSheetOpen}
          setOpen={setProductSheetOpen}
          onAddToCart={handleProductConfigured}
          isPartOfGroup={true}
        />
      )}
      {currentProduct?.type === 'course' && (
        <ProductDetailCourse
          product={currentProduct}
          setProduct={setCurrentProduct}
          open={productSheetOpen}
          setOpen={setProductSheetOpen}
          onAddToCart={handleProductConfigured}
          isPartOfGroup={true}
        />
      )}
      {currentProduct?.type === 'membership' && (
        <ProductDetailMembership
          product={currentProduct}
          setProduct={setCurrentProduct}
          open={productSheetOpen}
          setOpen={setProductSheetOpen}
          onAddToCart={handleProductConfigured}
          isPartOfGroup={true}
        />
      )}
      {(!currentProduct?.type || (currentProduct?.type !== 'class' && currentProduct?.type !== 'course' && currentProduct?.type !== 'membership')) && (
        <ProductDetail
          product={currentProduct}
          setProduct={setCurrentProduct}
          open={productSheetOpen}
          setOpen={setProductSheetOpen}
          onAddToCart={handleProductConfigured}
          isPartOfGroup={true}
        />
      )}

      {/* Main group sheet */}
      <Sheet
        open={open && !productSheetOpen}
        onOpenChange={(isOpen) => {
          // Only propagate close event if we're not opening a product sheet
          if (!isOpen && !productSheetOpen) {
            onOpenChange(false);
          } else if (isOpen) {
            onOpenChange(true);
          }
        }}
      >
        <SheetContent className="sm:max-w-[700px] flex flex-col h-full">

          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-3">
              <ProductThumbnail
                src={group.thumbnail}
                alt={group.name}
                size="md"
              />
              <div>
                <div className="text-xl font-semibold">{group.name}</div>
                <div className="text-sm text-muted-foreground font-normal">
                  ${groupTotal.toFixed(2)}
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2 px-4">
              <div className="text-sm font-medium mb-3">
                Products in this group
              </div>

              {groupProducts.length > 0 ? (
                groupProducts.map((product, index) => {
                  const configured = isProductConfigured(product._id);
                  const summary = getProductSummary(product);

                  return (
                    <div
                      key={product._id || `product-${index}`}
                      onClick={() => handleProductClick(product)}
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <ProductThumbnail
                        src={product.thumbnail || product.image}
                        alt={product.name}
                        size="sm"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{product.name}</div>
                        {summary && (
                          <div className="text-xs text-muted-foreground truncate">
                            {summary}
                          </div>
                        )}
                        {!configured && (
                          <div className="text-xs text-muted-foreground">
                            Tap to configure
                          </div>
                        )}
                      </div>

                      {configured ? (
                        <Check className="size-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="size-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No products in this group
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="pt-4 border-t">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total</span>
                <span>${groupTotal.toFixed(2)}</span>
              </div>
              <Button
                onClick={handleAddGroupToCart}
                className="w-full cursor-pointer"
                size="lg"
                disabled={Object.keys(configuredProducts).length !== groupProducts.length}
              >
                Add to Cart
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
