'use client';

import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { ProductThumbnail } from '@/components/product-thumbnail';
import { ChevronRight, Check, Plus, Minus, Calendar as CalendarIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import dayjs from 'dayjs';
import ProductDetail from './retail/productDetail';
import ProductDetailClass from './(other)/classes/productDetailClass';
import ProductDetailCourse from './(other)/classes/ProductDetailCourse';
import ProductDetailMembership from './(other)/memberships/productDetailMembership';
import { useImmer } from 'use-immer';
import { cn } from '@/lib/utils';

export default function GroupSheet({
  open,
  onOpenChange,
  group,
  onAddToCart,
  onRemoveGroup, // Callback to remove existing group when editing
  useClass,
  useMembership,
  getProductTotal,
  migrateScheduleFormat,
  location // Pass location for store hours
}) {
  const [configuredProducts, setConfiguredProducts] = useImmer({});
  const [currentProduct, setCurrentProduct] = useImmer(null);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [groupTotal, setGroupTotal] = useState(0);
  const [groupQty, setGroupQty] = useState(1); // Group-level quantity
  const [availableProducts, setAvailableProducts] = useState([]); // All shop products
  const [selectedProductIds, setSelectedProductIds] = useState([]); // IDs of products to include in group
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0); // Index of selected variation
  const [scheduledDate, setScheduledDate] = useState(null); // Date for the group booking
  const [scheduledTime, setScheduledTime] = useState(''); // Time for the group booking
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const initialGroupQtyRef = useRef(1); // Store initial quantity when editing

  // Check if this group has variations
  const hasVariations = group?.variations?.length > 0;
  const selectedVariation = hasVariations ? group.variations[selectedVariationIndex] : null;

  // Check if date/time is selected - required before configuring products
  const isDateTimeSelected = scheduledDate && scheduledTime;

  // Helper to check if a day is closed at the location
  const isDayClosed = (date) => {
    if (!location?.storeHours) return false;
    const dayOfWeek = date.getDay();
    const storeHour = location.storeHours.find(h => h.d === dayOfWeek);
    if (!storeHour || (!storeHour.open && !storeHour.close)) {
      return true;
    }
    return false;
  };

  // Helper to check if a specific date is in closedDays
  const isSpecificDateClosed = (date) => {
    if (!location?.closedDays || location.closedDays.length === 0) return false;
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    return location.closedDays.some(closedDay => {
      const startDate = dayjs(closedDay.startDate).format('YYYY-MM-DD');
      const endDate = dayjs(closedDay.endDate).format('YYYY-MM-DD');
      return dateStr >= startDate && dateStr <= endDate;
    });
  };

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
      setGroupQty(1); // Reset quantity
      setSelectedProductIds([]);
      setSelectedVariationIndex(0); // Reset variation selection
      setScheduledDate(null); // Reset date
      setScheduledTime(''); // Reset time
      setDatePickerOpen(false);
      initialGroupQtyRef.current = 1; // Reset ref
    } else if (open && group) {
      // Check if we're editing an existing cart group
      if (group.products && group.gId) {
        // Opening with an existing cart group - pre-populate products
        const configured = {};
        const ids = [];
        const initialGroupQty = group.products[0]?.groupQty || 1;

        group.products.forEach(product => {
          configured[product._id] = product;
          ids.push(product._id.toString());
        });
        setConfiguredProducts(configured);
        setSelectedProductIds(ids);
        setGroupQty(initialGroupQty);
        initialGroupQtyRef.current = initialGroupQty; // Store initial quantity in ref

        // Restore selected variation if editing
        if (group.products[0]?.selectedVariationIndex !== undefined) {
          setSelectedVariationIndex(group.products[0].selectedVariationIndex);
        }

        // Restore scheduled date/time if editing
        if (group.products[0]?.scheduledDateTime) {
          const dt = dayjs(group.products[0].scheduledDateTime);
          setScheduledDate(dt.toDate());
          setScheduledTime(dt.format('HH:mm'));
        }
      } else if (group.products) {
        // Opening with a product group template - set initial selected IDs
        // Combine base products with variation products if available
        const baseProductIds = group.products.map(p => (p._id || p).toString());
        const variationProductIds = hasVariations && group.variations[0]?.products
          ? group.variations[0].products.map(p => (p._id || p).toString())
          : [];
        const allIds = [...new Set([...baseProductIds, ...variationProductIds])];
        setSelectedProductIds(allIds);
        setSelectedVariationIndex(0);
        initialGroupQtyRef.current = 1; // Reset ref for new group
      }
    }
  }, [open]);

  // Update selected products when variation changes
  useEffect(() => {
    if (!open || !group || group.gId) return; // Don't auto-update when editing

    const baseProductIds = (group.products || []).map(p => (p._id || p).toString());
    const variationProductIds = selectedVariation?.products
      ? selectedVariation.products.map(p => (p._id || p).toString())
      : [];
    const allIds = [...new Set([...baseProductIds, ...variationProductIds])];
    setSelectedProductIds(allIds);
    setConfiguredProducts({}); // Reset configured products when variation changes
  }, [selectedVariationIndex, open]);

  // Clear selectedTimes for class/course products when quantity changes during edit
  useEffect(() => {
    if (!group?.gId || !open) return; // Only when editing an existing cart group

    // If quantity changed from the initial value stored in ref
    if (groupQty !== initialGroupQtyRef.current) {
      console.log(`🔄 Quantity changed from ${initialGroupQtyRef.current} to ${groupQty}, clearing class/course configurations`);
      setConfiguredProducts(draft => {
        Object.keys(draft).forEach(productId => {
          const product = draft[productId];
          // Remove class/course products from configured list entirely
          // This forces them to be reconfigured with new time slots
          if (product.type === 'class' || product.type === 'course') {
            console.log(`🔄 Removing ${product.name} from configured products due to quantity change`);
            delete draft[productId];
          }
        });
      });
    }
  }, [groupQty, group?.gId, open]);

  // Calculate group total: start with variation price or template price, adjust for product changes
  useEffect(() => {
    if (!group) return;

    // Start with the variation price if available, otherwise use the original group template price
    let total = selectedVariation?.amount ?? group.amount ?? group.groupAmount ?? 0;

    // If we're editing an existing cart group, check if products have changed
    const originalProducts = group.products || [];
    const originalProductIds = originalProducts.map(p => p._id.toString());

    // Find added products (in selectedProductIds but not in original)
    const addedProductIds = selectedProductIds.filter(id => !originalProductIds.includes(id));

    // Find removed products (in original but not in selectedProductIds)
    const removedProductIds = originalProductIds.filter(id => !selectedProductIds.includes(id));

    // Add prices for newly added products
    addedProductIds.forEach(productId => {
      const product = availableProducts.find(p => p._id === productId);
      if (product) {
        const configured = configuredProducts[productId];
        if (configured && getProductTotal) {
          total += getProductTotal({ product: configured });
        } else {
          total += product.value || product.price || 0;
        }
      }
    });

    // Subtract prices for removed products
    removedProductIds.forEach(productId => {
      const product = originalProducts.find(p => p._id.toString() === productId);
      if (product) {
        const price = product.amount?.subtotal || product.value || product.price || 0;
        total -= price;
      }
    });

    setGroupTotal(total);
  }, [configuredProducts, selectedProductIds, group, getProductTotal, availableProducts]);

  const handleProductClick = (product) => {
    // Require date/time before configuring products
    if (!isDateTimeSelected) return;

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
      qty: existingConfig?.qty || (product.type === 'class' || product.type === 'course' || product.type === 'membership' ? 0 : groupQty),
      schedule: product.type === 'course' && migrateScheduleFormat ? migrateScheduleFormat(product.schedule) : product.schedule,
      variations: existingConfig?.variations || variations,
      groupQty: groupQty, // Pass group quantity to product
      isPartOfGroup: true, // Mark as part of group
      groupScheduledDate: scheduledDate, // Pass group's scheduled date for pre-selection
      groupScheduledTime: scheduledTime // Pass group's scheduled time
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

    // Get all configured products based on selectedProductIds
    const configuredProductsList = groupProducts.map(product => {
      const configured = configuredProducts[product._id];
      const baseProduct = configured || {
        ...product,
        stockQty: product.qty,
        qty: product.type === 'class' || product.type === 'course' || product.type === 'membership' ? 0 : 1,
        schedule: product.type === 'course' && migrateScheduleFormat ? migrateScheduleFormat(product.schedule) : product.schedule
      };

      // Add group metadata to each product
      // Combine date and time into a single ISO string if both are set
      const scheduledDateTime = scheduledDate && scheduledTime
        ? dayjs(scheduledDate).format('YYYY-MM-DD') + 'T' + scheduledTime
        : scheduledDate
          ? dayjs(scheduledDate).toISOString()
          : undefined;

      return {
        ...baseProduct,
        groupId: group._id || group.groupId,           // The product group template ID
        gId: gId,                      // Unique instance ID for this purchase
        groupName: group.name || group.groupName,         // Group name for display
        groupAmount: groupTotal,     // Use calculated group total (dynamically calculated based on products)
        groupThumbnail: group.thumbnail || group.groupThumbnail,
        groupQty: groupQty,  // Store the group quantity on each product
        selectedVariationIndex: hasVariations ? selectedVariationIndex : undefined, // Store selected variation
        selectedVariationName: selectedVariation?.name, // Store variation name for display
        scheduledDateTime // Store scheduled date/time for the group
      };
    });

    // Add all products to cart individually (they're already configured)
    configuredProductsList.forEach(product => {
      onAddToCart(product);
    });

    // Reset and close
    setConfiguredProducts({});
    setGroupQty(1);
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

  // Build the list of products to display based on selectedProductIds
  // Get products from both the group template and available products
  const groupProducts = selectedProductIds.map(id => {
    // First check if it's already configured in the cart
    if (configuredProducts[id]) {
      return configuredProducts[id];
    }
    // Then check the group template
    const templateProduct = group.products?.find(p => p._id.toString() === id);
    if (templateProduct) {
      return templateProduct;
    }
    // Finally check available products (for newly added items)
    return availableProducts.find(p => p._id === id);
  }).filter(Boolean); // Remove any null/undefined

  // Check if all selected products are configured
  const allProductsConfigured = selectedProductIds.every(id => isProductConfigured(id));

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
                  ${groupTotal.toFixed(2)}
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4 px-4">
              {/* Date/Time Selector */}
              <div className="flex flex-col gap-2" suppressHydrationWarning>
                <div className="text-sm font-medium">Date & Time</div>
                <div className="flex gap-2">
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-between font-normal cursor-pointer",
                          !scheduledDate && "text-muted-foreground"
                        )}
                      >
                        {scheduledDate ? dayjs(scheduledDate).format('DD/MM/YYYY') : "Select date"}
                        <CalendarIcon className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={(date) => {
                          setScheduledDate(date);
                          setDatePickerOpen(false);
                        }}
                        disabled={(date) => {
                          // Disable past dates
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (date < today) return true;
                          // Disable if the day is closed at the location
                          if (isDayClosed(date)) return true;
                          // Disable if the date is in closedDays
                          if (isSpecificDateClosed(date)) return true;
                          return false;
                        }}
                        fromDate={new Date()}
                        toDate={(() => {
                          const d = new Date();
                          d.setMonth(d.getMonth() + 6);
                          return d;
                        })()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-32"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* Group Quantity Selector */}
              <div className={cn("flex flex-col gap-2", !isDateTimeSelected && "opacity-50")}>
                <div className="text-sm font-medium">Qty</div>
                <div className="flex gap-2 items-center">
                  <Button
                    size="icon"
                    className="cursor-pointer"
                    onClick={() => setGroupQty(Math.max(1, groupQty - 1))}
                    disabled={groupQty <= 1 || !isDateTimeSelected}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="cursor-pointer"
                    onClick={() => setGroupQty(groupQty + 1)}
                    disabled={!isDateTimeSelected}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <div className="flex-1" />
                  <div className="font-semibold">{groupQty}</div>
                </div>
              </div>

              {/* Variations - displayed like shop product variations */}
              {hasVariations && (
                <div className={cn("flex flex-col gap-2", !isDateTimeSelected && "opacity-50 pointer-events-none")}>
                  <div className="text-sm font-medium">Variations</div>
                  {group.variations.map((variation, index) => (
                    <div
                      key={index}
                      className={cn(
                        "text-sm flex space-x-2 items-center w-full py-1 rounded-md",
                        isDateTimeSelected ? "cursor-pointer hover:bg-muted/50" : "cursor-not-allowed"
                      )}
                      onClick={() => isDateTimeSelected && setSelectedVariationIndex(index)}
                    >
                      <Checkbox checked={selectedVariationIndex === index} className="size-9" disabled={!isDateTimeSelected} />
                      <div>{variation.name}</div>
                      <div className="ml-auto">${variation.amount?.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Product Multi-Select */}
              <div className={cn("space-y-2 pt-2", !isDateTimeSelected && "opacity-50")}>
                <Label className="text-sm font-medium">Add/Remove Products</Label>
                <MultiSelect
                  values={selectedProductIds}
                  onValuesChange={setSelectedProductIds}
                  disabled={!isDateTimeSelected}
                >
                  <MultiSelectTrigger className={cn("w-full", isDateTimeSelected ? "cursor-pointer" : "cursor-not-allowed")} disabled={!isDateTimeSelected}>
                    <MultiSelectValue placeholder="Select products..." />
                  </MultiSelectTrigger>
                  <MultiSelectContent search={{ placeholder: "Search products...", emptyMessage: "No products found" }}>
                    {availableProducts.map((product) => (
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
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
              </div>

              {groupProducts.length > 0 ? (
                groupProducts.map((product, index) => {
                  const configured = isProductConfigured(product._id);
                  const summary = getProductSummary(product);
                  const canClick = isDateTimeSelected && groupQty >= 1;

                  return (
                    <div
                      key={product._id || `product-${index}`}
                      onClick={() => canClick && handleProductClick(product)}
                      className={cn(
                        "flex items-center gap-3 p-3 border rounded-lg transition-colors",
                        canClick ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"
                      )}
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
                            {isDateTimeSelected ? 'Tap to configure' : 'Select date & time first'}
                          </div>
                        )}
                      </div>

                      {configured ? (
                        <Check className="size-5 text-primary flex-shrink-0" />
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
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center">
                <div className="uppercase">total</div>
                <div className="ml-auto">${(groupTotal * groupQty).toFixed(2)}</div>
              </div>
              <Button
                onClick={handleAddGroupToCart}
                className="w-full cursor-pointer"
                size="lg"
                disabled={!allProductsConfigured}
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
