'use client';

import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { ProductThumbnail } from '@/components/product-thumbnail';
import { ChevronRight, Check, Calendar as CalendarIcon, Plus, X } from 'lucide-react';
import { IconButton, SelectionCheck } from '@/components/control-button';
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
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(null); // Index of selected variation (null = none selected)
  const [scheduledDate, setScheduledDate] = useState(null); // Date for the group booking
  const [scheduledTime, setScheduledTime] = useState(''); // Time for the group booking
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const initialGroupQtyRef = useRef(1); // Store initial quantity when editing
  const [variationInstances, setVariationInstances] = useState({}); // Track instances per variation product: { productId: [0, 1, 2] }

  // Check if this group has variations
  const hasVariations = group?.variations?.length > 0;
  const selectedVariation = hasVariations ? group.variations[selectedVariationIndex] : null;

  // Get minimum quantity requirement (null/0 = no minimum)
  const minQty = group?.minQty || 0;

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
      setSelectedVariationIndex(null); // Reset variation selection
      setScheduledDate(null); // Reset date
      setScheduledTime(''); // Reset time
      setDatePickerOpen(false);
      initialGroupQtyRef.current = 1; // Reset ref
      setVariationInstances({}); // Reset variation instances
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
        const allIds = [...new Set([...baseProductIds])]; // Start with just base products
        setSelectedProductIds(allIds);
        setSelectedVariationIndex(null); // No variation selected by default
        // Set initial quantity to minQty if set, otherwise 1
        const initialQty = group.minQty || 1;
        setGroupQty(initialQty);
        initialGroupQtyRef.current = initialQty;
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

  // Calculate the max capacity from class/course base products
  const getMaxCapacity = () => {
    if (!group?.products || !availableProducts.length) return null;

    let minCapacity = null;

    group.products.forEach(product => {
      const productData = availableProducts.find(p => p._id === (product._id || product).toString()) || product;
      if ((productData.type === 'class' || productData.type === 'course') && productData.capacity) {
        if (minCapacity === null || productData.capacity < minCapacity) {
          minCapacity = productData.capacity;
        }
      }
    });

    return minCapacity;
  };

  const maxCapacity = getMaxCapacity();

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
      // Use the variation's override price (this is per-unit, multiply by groupQty)
      // This REPLACES all base product and variation product prices
      total = (Number(selectedVariation.amount) || 0) * groupQty;

      // Only add prices for EXTRA products (manually added, not part of base or variation)
      const baseProductIds = (group.products || []).map(p => (p._id || p).toString());
      const variationProductIds = (selectedVariation.products || []).map(p => (p._id || p).toString());
      const groupProductIds = new Set([...baseProductIds, ...variationProductIds]);

      selectedProductIds.forEach(productId => {
        if (!groupProductIds.has(productId)) {
          const configured = configuredProducts[productId];
          if (configured) {
            total += configured.amount?.subtotal ?? configured.amount?.total ?? 0;
          }
        }
      });
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
            total += productTotal * groupQty;
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

      // Add extra products (not base or variation)
      const variationProductIds = (selectedVariation?.products || []).map(p => (p._id || p).toString());
      const groupProductIds = new Set([...baseProductIds, ...variationProductIds]);
      selectedProductIds.forEach(productId => {
        if (!groupProductIds.has(productId)) {
          const configured = configuredProducts[productId];
          if (configured) {
            total += configured.amount?.subtotal ?? configured.amount?.total ?? 0;
          }
        }
      });
    }

    setGroupTotal(total);
  }, [configuredProducts, selectedProductIds, group, hasVariations, selectedVariation, groupQty, variationInstances]);

  const handleProductClick = (product, instanceIndex = null) => {
    // Require date/time before configuring products
    if (!isDateTimeSelected) return;

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
      groupQty: groupQty, // Pass group quantity to product
      isPartOfGroup: true, // Mark as part of group
      groupHasPriceOverride: selectedVariation?.useOverridePrice !== false, // Whether group variation overrides price
      groupScheduledDate: scheduledDate, // Pass group's scheduled date for pre-selection
      groupScheduledTime: scheduledTime, // Pass group's scheduled time
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

    // Combine date and time into a single ISO string if both are set
    const scheduledDateTime = scheduledDate && scheduledTime
      ? dayjs(scheduledDate).format('YYYY-MM-DD') + 'T' + scheduledTime
      : scheduledDate
        ? dayjs(scheduledDate).toISOString()
        : undefined;

    // Helper to add group metadata to a product
    const addGroupMetadata = (product) => ({
      ...product,
      groupId: group._id || group.groupId,
      gId: gId,
      groupName: group.name || group.groupName,
      groupAmount: groupTotal,
      groupThumbnail: group.thumbnail || group.groupThumbnail,
      groupQty: groupQty,
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
    setGroupQty(1);
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
                <div className="text-sm font-medium">
                  Qty
                  {minQty > 0 && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">(min {minQty})</span>
                  )}
                  {maxCapacity && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">(max {maxCapacity})</span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <IconButton
                    icon="minus"
                    onClick={() => setGroupQty(Math.max(minQty || 1, groupQty - 1))}
                    disabled={groupQty <= (minQty || 1) || !isDateTimeSelected}
                  />
                  <IconButton
                    icon="plus"
                    onClick={() => setGroupQty(groupQty + 1)}
                    disabled={!isDateTimeSelected || (maxCapacity && groupQty >= maxCapacity)}
                  />
                  <div className="flex-1" />
                  <div className="font-semibold">{groupQty}</div>
                </div>
              </div>

              {/* Base Products */}
              {group.products && group.products.length > 0 && (
                <div className={cn("flex flex-col gap-2", !isDateTimeSelected && "opacity-50")}>
                  <div className="text-sm font-medium">Base Products</div>
                  {group.products.map((product, index) => {
                    const productData = availableProducts.find(p => p._id === (product._id || product).toString()) || product;
                    const configured = isProductConfigured(productData._id);
                    const configuredProduct = configuredProducts[productData._id];
                    const productPrice = configuredProduct?.amount?.subtotal ?? configuredProduct?.amount?.total ?? 0;
                    const summary = getProductSummary(productData);
                    const canClick = isDateTimeSelected && groupQty >= 1;

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
                        {configured && <div className="w-16 text-right text-sm">${productPrice.toFixed(2)}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Variations with nested products */}
              {hasVariations && (
                <div className={cn("flex flex-col gap-3", !isDateTimeSelected && "opacity-50 pointer-events-none")}>
                  <div className="text-sm font-medium">Variations</div>
                  {group.variations.map((variation, index) => {
                    const isSelected = selectedVariationIndex === index;
                    const variationProducts = variation.products || [];

                    return (
                      <div key={index} className="flex flex-col gap-2">
                        {/* Variation header */}
                        <div
                          className={cn(
                            "text-sm flex space-x-2 items-center w-full py-1 rounded-md",
                            isDateTimeSelected ? "cursor-pointer hover:bg-muted/50" : "cursor-not-allowed"
                          )}
                          onClick={() => isDateTimeSelected && setSelectedVariationIndex(prev => prev === index ? null : index)}
                        >
                          <SelectionCheck checked={isSelected} disabled={!isDateTimeSelected} />
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
                              const canClick = isDateTimeSelected;

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

              {/* Product Multi-Select (for adding extra products) */}
              <div className={cn("space-y-2 pt-2", !isDateTimeSelected && "opacity-50")}>
                <Label className="text-sm font-medium">Add Extra Products</Label>
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
                disabled={!allProductsConfigured || (minQty > 0 && groupQty < minQty)}
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
