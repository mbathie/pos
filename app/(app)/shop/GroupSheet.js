'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { ProductThumbnail } from '@/components/product-thumbnail';
import { ChevronRight, Check, Plus, X } from 'lucide-react';
import { SelectionCheck } from '@/components/control-button';
import dayjs from 'dayjs';
import ProductDetail from './retail/productDetail';
import ProductDetailClass from './(other)/classes/productDetailClass';
import ProductDetailCourse from './(other)/classes/ProductDetailCourse';
import ProductDetailMembership from './(other)/memberships/productDetailMembership';
import { useImmer } from 'use-immer';
import { cn } from '@/lib/utils';
import { calculateDerivedPrice } from '@/lib/product';

export default function GroupSheet({
  open,
  onOpenChange,
  group,
  onAddToCart,
  onRemoveGroup, // Callback to remove existing group when editing
  useClass,
  useMembership,
  getProductTotal,
  migrateScheduleFormat
}) {
  const [configuredProducts, setConfiguredProducts] = useImmer({});
  const [currentProduct, setCurrentProduct] = useImmer(null);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [groupTotal, setGroupTotal] = useState(0);
  const [availableProducts, setAvailableProducts] = useState([]); // All shop products
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(null); // Index of selected variation (null = none selected)
  const [variationInstances, setVariationInstances] = useState({}); // Track instances per variation product: { productId: [0, 1, 2] }

  // Check if this group has variations
  const hasVariations = group?.variations?.length > 0;
  const selectedVariation = hasVariations ? group.variations[selectedVariationIndex] : null;

  // Get minimum quantity requirement (null/0 = no minimum)
  const minQty = group?.minQty || 0;

  const { setTimesClass, setTimesCourse } = useClass || {};

  // Fetch all products when sheet opens
  useEffect(() => {
    if (open) {
      fetchAllProducts();
    }
  }, [open]);

  const fetchAllProducts = async () => {
    try {
      // Fetch all products that can be added to groups (shop, class, course, membership)
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        const productsList = data.products || data;
        // Filter to product types that can be in groups (exclude dividers and categories)
        const groupableProducts = Array.isArray(productsList)
          ? productsList.filter(p => ['shop', 'class', 'course', 'membership'].includes(p.type))
          : [];
        setAvailableProducts(groupableProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setAvailableProducts([]);
    }
  };

  // Reset state when sheet closes OR load existing group when opening
  useEffect(() => {
    if (!open) {
      setProductSheetOpen(false);
      setCurrentProduct(null);
      setConfiguredProducts({});
      setSelectedVariationIndex(null); // Reset variation selection
      setVariationInstances({}); // Reset variation instances
    } else if (open && group) {
      // Check if we're editing an existing cart group
      if (group.products && group.gId) {
        // Opening with an existing cart group - pre-populate products
        const configured = {};

        group.products.forEach(product => {
          configured[product._id] = product;
        });
        setConfiguredProducts(configured);

        // Restore selected variation if editing
        if (group.products[0]?.selectedVariationIndex !== undefined) {
          setSelectedVariationIndex(group.products[0].selectedVariationIndex);
        }
      } else if (group.products) {
        // Opening with a product group template
        setSelectedVariationIndex(null); // No variation selected by default
      }
    }
  }, [open]);

  // Update variation instances when variation changes
  useEffect(() => {
    if (!open || !group || group.gId) return; // Don't auto-update when editing

    // Initialize variation instances (start with 1 instance per variation product)
    if (selectedVariation?.products) {
      const instances = {};
      selectedVariation.products.forEach(p => {
        const productId = (p._id || p).toString();
        instances[productId] = [0]; // Start with instance 0
      });
      setVariationInstances(instances);
    } else {
      setVariationInstances({});
    }

    // Clear all variation products (including per-instance keys) when variation changes
    setConfiguredProducts(draft => {
      // Get all variation product IDs from all variations (not just selected)
      const allVariationProductIds = new Set();
      (group.variations || []).forEach(v => {
        (v.products || []).forEach(p => {
          allVariationProductIds.add((p._id || p).toString());
        });
      });

      // Remove variation products and their per-instance keys, keep base products
      Object.keys(draft).forEach(key => {
        // Extract base product ID (handle both "productId" and "productId_N" formats)
        const baseProductId = key.includes('_') ? key.split('_')[0] : key;
        if (allVariationProductIds.has(baseProductId)) {
          delete draft[key];
        }
      });
    });
  }, [selectedVariationIndex, open]);

  // Helper function to add a new variation product instance
  const addVariationInstance = (productId) => {
    setVariationInstances(prev => {
      const currentInstances = prev[productId] || [0];
      // Find the next available instance index
      const maxIdx = Math.max(...currentInstances, -1);
      return {
        ...prev,
        [productId]: [...currentInstances, maxIdx + 1]
      };
    });
  };

  // Helper function to remove a variation product instance
  const removeVariationInstance = (productId, instanceIdx) => {
    setVariationInstances(prev => {
      const currentInstances = prev[productId] || [];
      const filtered = currentInstances.filter(i => i !== instanceIdx);
      // Ensure at least one instance remains
      if (filtered.length === 0) return prev;
      return {
        ...prev,
        [productId]: filtered
      };
    });
    // Also remove the configured product for this instance
    setConfiguredProducts(draft => {
      const configKey = `${productId}_${instanceIdx}`;
      delete draft[configKey];
    });
  };

  // Derive group quantity from configured class/course product price selections
  const derivedGroupQty = (() => {
    const allConfigured = Object.values(configuredProducts);
    const classProduct = allConfigured.find(p => p.type === 'class' || p.type === 'course');
    if (!classProduct?.prices) return 1;
    return classProduct.prices.reduce((sum, p) => sum + (p.qty || 0), 0) || 1;
  })();

  // Get the display price for a variation (override or derived)
  const getVariationDisplayPrice = (variation) => {
    if (variation?.useOverridePrice !== false && variation?.amount != null) {
      return Number(variation.amount) || 0;
    }
    // Calculate derived price using shared function
    const derived = calculateDerivedPrice(group?.products, variation?.products, availableProducts);
    return Number(derived) || 0;
  };

  // Calculate group total based on variation selection and configured products
  // groupTotal is the FULL total for the entire group (not per-unit)
  useEffect(() => {
    if (!group) return;

    let total = 0;

    // Check if we should use override price or derive from products
    const useOverridePrice = hasVariations && selectedVariation && selectedVariation?.useOverridePrice !== false;

    if (useOverridePrice) {
      // Use the variation's override price (this is per-unit, multiply by derivedGroupQty)
      // This REPLACES all base product and variation product prices
      total = (Number(selectedVariation.amount) || 0) * derivedGroupQty;
    } else {
      // Derive total from configured products (no override price OR no variation selected)
      // Sum up base products
      // Note: class/course products already have qty set by attendees, so don't multiply by groupQty
      // Shop products need to be multiplied by groupQty
      const baseProductIds = (group.products || []).map(p => (p._id || p).toString());
      baseProductIds.forEach(productId => {
        const configured = configuredProducts[productId];
        if (configured) {
          const productTotal = configured.amount?.subtotal ?? configured.amount?.total ?? 0;
          // Classes/courses already account for attendees in their price, don't multiply
          if (configured.type === 'class' || configured.type === 'course') {
            total += productTotal;
          } else {
            // Shop products need qty multiplier
            total += productTotal * derivedGroupQty;
          }
        }
      });

      // Sum up per-instance variation products (each instance has its own qty)
      if (selectedVariation?.products) {
        selectedVariation.products.forEach(product => {
          const productId = (product._id || product).toString();
          const instances = variationInstances[productId] || [];
          instances.forEach(instanceIdx => {
            const configKey = `${productId}_${instanceIdx}`;
            const configured = configuredProducts[configKey];
            if (configured) {
              // Each instance has its own configured amount (which includes qty)
              total += configured.amount?.subtotal ?? configured.amount?.total ?? 0;
            }
          });
        });
      }
    }

    setGroupTotal(total);
  }, [configuredProducts, group, hasVariations, selectedVariation, derivedGroupQty, variationInstances]);

  const handleProductClick = (product, instanceIndex = null) => {
    // Check if product is already configured (use instance key if provided)
    const configKey = instanceIndex !== null ? `${product._id}_${instanceIndex}` : product._id;
    const existingConfig = configuredProducts[configKey];

    // For shop items (or items with variations), ensure variations have selected property initialized
    let variations = product.variations;
    if (variations && !existingConfig && product.type !== 'class' && product.type !== 'course' && product.type !== 'membership') {
      variations = variations.map(v => ({
        ...v,
        selected: v.selected || false
      }));
    }

    // Build base product without old selectedTimes for class/course products
    let baseProduct = { ...product };

    // If product is NOT in configuredProducts (was removed due to qty change),
    // ensure we don't carry over old selectedTimes
    if (!existingConfig && (product.type === 'class' || product.type === 'course')) {
      // Remove any selectedTimes from the base product
      delete baseProduct.selectedTimes;
    }

    const cartProduct = {
      ...baseProduct,
      ...(existingConfig || {}),
      stockQty: product.qty,
      qty: existingConfig?.qty || (product.type === 'class' || product.type === 'course' || product.type === 'membership' ? 0 : 1), // Each instance has qty 1
      schedule: product.type === 'course' && migrateScheduleFormat ? migrateScheduleFormat(product.schedule) : product.schedule,
      variations: existingConfig?.variations || variations,
      isPartOfGroup: true, // Mark as part of group
      groupHasPriceOverride: selectedVariation?.useOverridePrice !== false, // Whether group variation overrides price
      instanceIndex: instanceIndex, // Track which instance this is (for variation products)
      configKey: configKey // Store the config key for saving
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
      // Use configKey if available (for per-instance products), otherwise use _id
      const key = configuredProduct.configKey || configuredProduct._id;
      draft[key] = configuredProduct;
    });
    setProductSheetOpen(false);
    setCurrentProduct(null);
  };

  const handleAddGroupToCart = () => {
    if (!group || !onAddToCart) return;

    // Check if we're editing an existing cart group
    const isEditingCartGroup = group.gId && group.products;

    // If editing, remove the old group first
    if (isEditingCartGroup && onRemoveGroup) {
      onRemoveGroup(group);
    }

    // Always add ONE group instance - quantity is tracked via groupQty field on each product
    const gId = isEditingCartGroup
      ? group.gId
      : `${group._id || group.groupId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Derive scheduledDateTime from the first configured class/course product's selectedTimes
    let scheduledDateTime;
    const allConfigured = Object.values(configuredProducts);
    const firstScheduledProduct = allConfigured.find(
      p => (p.type === 'class' || p.type === 'course') && p.selectedTimes?.length > 0
    );
    if (firstScheduledProduct?.selectedTimes?.[0]?.datetime) {
      scheduledDateTime = firstScheduledProduct.selectedTimes[0].datetime;
    }

    // Helper to add group metadata to a product
    const addGroupMetadata = (product) => ({
      ...product,
      groupId: group._id || group.groupId,
      gId: gId,
      groupName: group.name || group.groupName,
      groupAmount: groupTotal,
      groupThumbnail: group.thumbnail || group.groupThumbnail,
      groupQty: derivedGroupQty,
      groupHasPriceOverride: selectedVariation?.useOverridePrice !== false,
      selectedVariationIndex: hasVariations ? selectedVariationIndex : undefined,
      selectedVariationName: selectedVariation?.name,
      scheduledDateTime
    });

    // Build list of all products to add
    const productsToAdd = [];

    // Add base products (configured by product ID)
    const baseProductIdSet = new Set((group?.products || []).map(p => (p._id || p).toString()));
    baseProductIdSet.forEach(productId => {
      const configured = configuredProducts[productId];
      if (configured) {
        productsToAdd.push(addGroupMetadata(configured));
      }
    });

    // Add variation products (configured per-instance using variationInstances)
    if (selectedVariation?.products) {
      selectedVariation.products.forEach(product => {
        const productId = (product._id || product).toString();
        const instances = variationInstances[productId] || [];
        instances.forEach(instanceIdx => {
          const configKey = `${productId}_${instanceIdx}`;
          const configured = configuredProducts[configKey];
          if (configured) {
            // Add with instance index for tracking
            productsToAdd.push(addGroupMetadata({
              ...configured,
              instanceIndex: instanceIdx
            }));
          }
        });
      });
    }

    // Add all products to cart individually
    productsToAdd.forEach(product => {
      onAddToCart(product);
    });

    // Reset and close
    setConfiguredProducts({});
    onOpenChange(false);
  };

  const isProductConfigured = (productId, instanceIndex = null) => {
    const key = instanceIndex !== null ? `${productId}_${instanceIndex}` : productId;
    return !!configuredProducts[key];
  };

  const getProductSummary = (product, instanceIndex = null, options = {}) => {
    const { includeQty = true } = options;
    const key = instanceIndex !== null ? `${product._id}_${instanceIndex}` : product._id;
    const configured = configuredProducts[key];
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

    // Quantity (only if includeQty is true)
    if (includeQty && configured.qty > 1) {
      parts.push(`Qty: ${configured.qty}`);
    }

    return parts.join(' • ');
  };

  if (!group) return null;

  // Get variation product IDs if a variation is selected
  const variationProductIds = selectedVariation?.products?.map(p => (p._id || p).toString()) || [];

  // Get base product IDs (from group.products)
  const baseProductIds = (group?.products || []).map(p => (p._id || p).toString());

  // Check if all products are configured
  // - Base products: check by product ID
  // - Variation products: check each instance in variationInstances
  const allProductsConfigured = (() => {
    // Check base products
    const baseConfigured = baseProductIds.every(id => isProductConfigured(id));
    if (!baseConfigured) return false;

    // Check variation products (if variation selected) - each instance must be configured
    if (selectedVariation && variationProductIds.length > 0) {
      for (const productId of variationProductIds) {
        const instances = variationInstances[productId] || [];
        for (const instanceIdx of instances) {
          if (!isProductConfigured(productId, instanceIdx)) return false;
        }
      }
    }

    return baseProductIds.length > 0 || variationProductIds.length > 0;
  })();

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
          groupHasPriceOverride={currentProduct?.groupHasPriceOverride}
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
          groupHasPriceOverride={currentProduct?.groupHasPriceOverride}
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
          groupHasPriceOverride={currentProduct?.groupHasPriceOverride}
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
          groupHasPriceOverride={currentProduct?.groupHasPriceOverride}
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
                src={group.thumbnail || group.groupThumbnail}
                alt={group.name || group.groupName}
                size="md"
              />
              <div className="flex-1">
                <div className="text-xl font-semibold">
                  {group.name || group.groupName}
                  {selectedVariation && (
                    <span className="text-muted-foreground font-normal"> - {selectedVariation.name}</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground font-normal">
                  {selectedVariation?.useOverridePrice !== false ? (
                    `$${Number(selectedVariation?.amount ?? group.amount ?? 0).toFixed(2)}`
                  ) : (
                    `$${(Number(calculateDerivedPrice(group?.products, selectedVariation?.products, availableProducts)) || 0).toFixed(2)} (base price)`
                  )}
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4 px-4">
              {/* Base Products */}
              {group.products && group.products.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium">Base Products</div>
                  {group.products.map((product, index) => {
                    const productData = availableProducts.find(p => p._id === (product._id || product).toString()) || product;
                    const configured = isProductConfigured(productData._id);
                    const configuredProduct = configuredProducts[productData._id];
                    const productPrice = configuredProduct?.amount?.subtotal ?? configuredProduct?.amount?.total ?? 0;
                    const summary = getProductSummary(productData);
                    const canClick = true;

                    return (
                      <div key={productData._id || `base-${index}`} className="flex items-center gap-2">
                        <div
                          onClick={() => canClick && handleProductClick(productData)}
                          className={cn(
                            "flex items-center gap-3 p-3 border rounded-lg transition-colors flex-1",
                            canClick ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <ProductThumbnail
                            src={productData.thumbnail || productData.image}
                            alt={productData.name}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">
                              {productData.name}
                              {(productData.type === 'class' || productData.type === 'course') && productData.capacity && (
                                <span className="text-xs text-muted-foreground font-normal ml-2">
                                  (max {productData.capacity})
                                </span>
                              )}
                            </div>
                            {summary && (
                              <div className="text-xs text-muted-foreground truncate">{summary}</div>
                            )}
                            {!configured && (
                              <div className="text-xs text-muted-foreground">Tap to configure</div>
                            )}
                          </div>
                          {configured ? (
                            <Check className="size-5 text-primary flex-shrink-0" />
                          ) : (
                            <ChevronRight className="size-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        {configured && <div className="w-16 text-right text-sm">${productPrice.toFixed(2)}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Variations with nested products */}
              {hasVariations && (
                <div className="flex flex-col gap-3">
                  <div className="text-sm font-medium">Variations</div>
                  {group.variations.map((variation, index) => {
                    const isSelected = selectedVariationIndex === index;
                    const variationProducts = variation.products || [];

                    return (
                      <div key={index} className="flex flex-col gap-2">
                        {/* Variation header */}
                        <div
                          className="text-sm flex space-x-2 items-center w-full py-1 rounded-md cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedVariationIndex(prev => prev === index ? null : index)}
                        >
                          <SelectionCheck checked={isSelected} />
                          <div>{variation.name}</div>
                          {variation.useOverridePrice !== false && (
                            <div className="ml-auto">${Number(variation.amount || 0).toFixed(2)}</div>
                          )}
                        </div>

                        {/* Variation products (shown when selected) - dynamic instances */}
                        {isSelected && variationProducts.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {variationProducts.map((product, pIndex) => {
                              const productData = availableProducts.find(p => p._id === (product._id || product).toString()) || product;
                              const productId = (product._id || product).toString();
                              const instances = variationInstances[productId] || [0];
                              const canClick = true;

                              return (
                                <div key={`var-${index}-prod-${pIndex}`} className="flex flex-col gap-2">
                                  {/* Render each instance */}
                                  {instances.map((instanceIdx, arrIndex) => {
                                    const configured = isProductConfigured(productId, instanceIdx);
                                    const configKey = `${productId}_${instanceIdx}`;
                                    const configuredProduct = configuredProducts[configKey];
                                    const productPrice = configuredProduct?.amount?.subtotal ?? configuredProduct?.amount?.total ?? 0;
                                    const productQty = configuredProduct?.qty || 1;
                                    const summary = getProductSummary(productData, instanceIdx, { includeQty: false });
                                    const canRemove = instances.length > 1;

                                    return (
                                      <div key={`var-${index}-prod-${pIndex}-inst-${instanceIdx}`} className="flex items-center gap-2">
                                        <div
                                          onClick={() => canClick && handleProductClick(productData, instanceIdx)}
                                          className={cn(
                                            "flex items-center gap-3 p-3 border rounded-lg transition-colors flex-1",
                                            canClick ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"
                                          )}
                                        >
                                          <ProductThumbnail
                                            src={productData.thumbnail || productData.image}
                                            alt={productData.name}
                                            size="sm"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium">
                                              {productQty}x {productData.name}
                                            </div>
                                            {summary && (
                                              <div className="text-xs text-muted-foreground truncate">{summary}</div>
                                            )}
                                            {!configured && (
                                              <div className="text-xs text-muted-foreground">Tap to configure</div>
                                            )}
                                          </div>
                                          {configured ? (
                                            <Check className="size-5 text-primary flex-shrink-0" />
                                          ) : (
                                            <ChevronRight className="size-5 text-muted-foreground flex-shrink-0" />
                                          )}
                                        </div>
                                        {canRemove && (
                                          <button
                                            onClick={() => removeVariationInstance(productId, instanceIdx)}
                                            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground cursor-pointer"
                                          >
                                            <X className="size-4" />
                                          </button>
                                        )}
                                        {configured && <div className="w-16 text-right text-sm">${productPrice.toFixed(2)}</div>}
                                      </div>
                                    );
                                  })}
                                  {/* Add more button */}
                                  <Button
                                    variant="default"
                                    size="lg"
                                    onClick={() => addVariationInstance(productId)}
                                    className="w-full cursor-pointer"
                                  >
                                    <Plus className="size-4 mr-1" />
                                    Add {productData.name}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

          <SheetFooter className="pt-4 border-t">
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center">
                <div className="uppercase">total</div>
                <div className="ml-auto">${groupTotal.toFixed(2)}</div>
              </div>
              <Button
                onClick={handleAddGroupToCart}
                className="w-full cursor-pointer"
                size="lg"
                disabled={!allProductsConfigured || (minQty > 0 && derivedGroupQty < minQty)}
              >
                {group.gId ? 'Update' : 'Add to Cart'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
