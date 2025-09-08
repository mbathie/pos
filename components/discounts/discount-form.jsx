'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MultiSelect, 
  MultiSelectTrigger, 
  MultiSelectValue, 
  MultiSelectContent, 
  MultiSelectGroup, 
  MultiSelectItem
} from '@/components/ui/multi-select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Calendar as CalendarIcon, Loader2, Info, Save, CheckCircle, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTitle } from '@/components/ui/alert-dialog';
// radio-group no longer used here

function LabelWithInfo({ children, info }) {
  return (
    <div className="flex items-center gap-2">
      <FormLabel className="m-0">{children}</FormLabel>
      {info && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{info}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// Zod validation schema (expanded per spec)
const discountSchema = z.object({
  // Attributes
  code: z.string().trim().max(64).optional().or(z.literal('')),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  archivedAt: z.date().optional().nullable(),
  // Type
  mode: z.enum(["discount", "surcharge"]).default("discount"),
  type: z.enum(["percent", "amount"], { required_error: "Select amount type" }),
  value: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number({ required_error: 'Value is required' }).positive("Must be positive")),
  maxAmount: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().positive().optional()),
  bogoEnabled: z.boolean().optional(),
  bogoBuyQty: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  bogoGetQty: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  bogoDiscountPercent: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).max(100).optional()),
  // Limits
  start: z.date().optional().nullable(),
  expiry: z.date().optional().nullable(),
  usageLimit: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  perCustomerLimit: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  frequencyCount: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  frequencyPeriod: z.enum(["day", "week", "month", "year"]).optional(),
  // Applicability
  products: z.array(z.string()).min(0).optional(),
  categories: z.array(z.string()).min(0).optional(),
}).refine((data) => {
  if (data.type === 'percent' && typeof data.value === 'number' && data.value > 100) return false;
  return true;
}, { message: 'Percentage value cannot exceed 100%', path: ['value'] })
  .refine((data) => {
    if (data.start && data.expiry) return data.start <= data.expiry;
    return true;
  }, { message: 'Start date must be before expiry', path: ['start'] });

export default function DiscountForm({ 
  mode = 'create', 
  discountId = null,
  onSuccess = null,
  onCancel = null,
  onDelete = null,
  isInSheet = false,
  showHeader = true,
  formId = 'discount-form'
}) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(mode === 'edit');
  const [categoriesWithProducts, setCategoriesWithProducts] = useState([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Auto-save state management
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimeoutRef = useRef(null);
  const initialValuesRef = useRef(null);

  // Build a deduped flat list of all products for the selector and log for verification
  const allProducts = useMemo(() => {
    const seen = new Set();
    const arr = [];
    categoriesWithProducts.forEach((cat) => {
      (cat.products || []).forEach((p) => {
        if (!seen.has(p._id)) {
          seen.add(p._id);
          arr.push(p);
        }
      });
    });
    try {
      // Helpful console diagnostics without being too noisy
      console.log('[DiscountForm] categories:', categoriesWithProducts.length);
      console.log('[DiscountForm] unique products for selector (count):', arr.length);
      console.log('[DiscountForm] product names:', arr.map((p) => p.name));
    } catch {}
    return arr;
  }, [categoriesWithProducts]);

  const form = useForm({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      archivedAt: null,
      mode: 'discount',
      type: 'percent',
      value: undefined,
      maxAmount: undefined,
      bogoEnabled: false,
      bogoBuyQty: 2,
      bogoGetQty: 1,
      bogoDiscountPercent: 50,
      start: null,
      expiry: null,
      usageLimit: undefined,
      perCustomerLimit: undefined,
      frequencyCount: undefined,
      frequencyPeriod: undefined,
      products: [],
      categories: [],
    },
  });

  // Watch form values for changes
  const watchedValues = form.watch();

  // Auto-save function
  const autoSave = async () => {
    if (mode === 'create' || !discountId || saving) return; // Don't auto-save for new discounts or if already saving
    
    setSaving(true);
    try {
      const data = form.getValues(); // Get current form values
      const submitData = {
        code: data.code?.trim() || undefined,
        name: data.name,
        description: data.description || '',
        archivedAt: data.archivedAt ? data.archivedAt.toISOString() : null,
        mode: data.mode,
        type: data.type,
        value: typeof data.value === 'number' ? data.value : undefined,
        maxAmount: typeof data.maxAmount === 'number' ? data.maxAmount : undefined,
        bogo: data.mode === 'discount' && data.bogoEnabled ? {
          enabled: true,
          buyQty: data.bogoBuyQty ?? 2,
          getQty: data.bogoGetQty ?? 1,
          discountPercent: data.bogoDiscountPercent ?? 50,
        } : { enabled: false },
        start: data.start ? data.start.toISOString() : null,
        expiry: data.expiry ? data.expiry.toISOString() : null,
        limits: {
          usageLimit: data.usageLimit,
          perCustomer: {
            total: data.perCustomerLimit,
            frequency: data.frequencyCount && data.frequencyPeriod ? {
              count: data.frequencyCount,
              period: data.frequencyPeriod,
            } : undefined,
          }
        },
        products: Array.from(selectedProducts),
        categories: Array.from(selectedCategories)
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts/${discountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (res.ok) {
        setLastSaved(new Date());
        setIsDirty(false);
        // Update initial values to current values to prevent re-triggering
        initialValuesRef.current = { ...data };
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Check if form data has changed
  useEffect(() => {
    if (initialValuesRef.current && mode === 'edit' && !saving) {
      const hasChanged = JSON.stringify(watchedValues) !== JSON.stringify(initialValuesRef.current);
      
      // Update dirty state if it has changed
      if (hasChanged !== isDirty) {
        setIsDirty(hasChanged);
      }

      // Clear any existing timer
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      // Only set up auto-save timer if there are actual changes
      if (hasChanged) {
        saveTimeoutRef.current = setTimeout(() => {
          autoSave();
        }, 3000); // Auto-save after 3 seconds of inactivity
      }
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, saving, mode]); // Removed isDirty from dependencies to prevent loops

  // Store initial values for comparison
  useEffect(() => {
    if (mode === 'edit' && !fetching && !initialValuesRef.current) {
      initialValuesRef.current = { ...watchedValues };
    }
  }, [watchedValues, fetching, mode]);

  useEffect(() => {
    console.log('DiscountForm mounted, mode:', mode, 'discountId:', discountId);
    if (mode === 'edit' && discountId) {
      fetchDiscountAndProducts();
    } else {
      fetchCategoriesAndProducts();
    }

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [mode, discountId]);

  const fetchDiscountAndProducts = async () => {
    try {
      const discountRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts/${discountId}`);
      if (discountRes.ok) {
        const discount = await discountRes.json();
        form.reset({
          code: discount.code || '',
          name: discount.name,
          description: discount.description || '',
          archivedAt: discount.archivedAt ? new Date(discount.archivedAt) : null,
          mode: discount.mode || 'discount',
          type: discount.type,
          value: typeof discount.value === 'number' ? discount.value : undefined,
          maxAmount: discount.maxAmount,
          bogoEnabled: discount.bogo?.enabled || false,
          bogoBuyQty: discount.bogo?.buyQty ?? 2,
          bogoGetQty: discount.bogo?.getQty ?? 1,
          bogoDiscountPercent: discount.bogo?.discountPercent ?? 50,
          start: discount.start ? new Date(discount.start) : null,
          expiry: discount.expiry ? new Date(discount.expiry) : null,
          usageLimit: discount.limits?.usageLimit,
          perCustomerLimit: discount.limits?.perCustomer?.total,
          frequencyCount: discount.limits?.perCustomer?.frequency?.count,
          frequencyPeriod: discount.limits?.perCustomer?.frequency?.period,
          products: discount.products || [],
          categories: discount.categories || [],
        });
        setSelectedProducts(new Set(discount.products || []));
        setSelectedCategories(new Set(discount.categories || []));
        
        // Set initial values for auto-save comparison after form is reset
        setTimeout(() => {
          initialValuesRef.current = { ...form.getValues() };
        }, 100);
      }

      const categoriesRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?includeProducts=true`);
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        console.log('Fetched categories with products:', categoriesData.categories);
        setCategoriesWithProducts(categoriesData.categories || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setFetching(false);
    }
  };

  const fetchCategoriesAndProducts = async () => {
    try {
      const categoriesRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?includeProducts=true`);
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        console.log('Fetched categories with products:', categoriesData.categories);
        setCategoriesWithProducts(categoriesData.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories and products:', error);
    } finally {
      setFetching(false);
    }
  };



  const handleDelete = async () => {
    if (!discountId) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts/${discountId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        if (onDelete) {
          onDelete();
        }
      } else {
        const error = await res.json();
        console.error('Delete error:', error);
        alert(error.error || 'Failed to delete discount');
      }
    } catch (error) {
      console.error('Error deleting discount:', error);
      alert('Failed to delete discount');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      const submitData = {
        code: data.code?.trim() || undefined,
        name: data.name,
        description: data.description || '',
        archivedAt: data.archivedAt ? data.archivedAt.toISOString() : null,
        mode: data.mode,
        type: data.type,
        value: typeof data.value === 'number' ? data.value : undefined,
        maxAmount: typeof data.maxAmount === 'number' ? data.maxAmount : undefined,
        bogo: data.mode === 'discount' && data.bogoEnabled ? {
          enabled: true,
          buyQty: data.bogoBuyQty ?? 2,
          getQty: data.bogoGetQty ?? 1,
          discountPercent: data.bogoDiscountPercent ?? 50,
        } : { enabled: false },
        start: data.start ? data.start.toISOString() : null,
        expiry: data.expiry ? data.expiry.toISOString() : null,
        limits: {
          usageLimit: data.usageLimit,
          perCustomer: {
            total: data.perCustomerLimit,
            frequency: data.frequencyCount && data.frequencyPeriod ? {
              count: data.frequencyCount,
              period: data.frequencyPeriod,
            } : undefined,
          }
        },
        products: Array.from(selectedProducts),
        categories: Array.from(selectedCategories)
      };

      const url = mode === 'edit' 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts/${discountId}` 
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts`;
      const method = mode === 'edit' ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (res.ok) {
        const savedDiscount = await res.json();
        if (onSuccess) {
          onSuccess(savedDiscount);
        }
      } else {
        const error = await res.json();
        console.error('Save error:', error);
        alert(error.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error saving discount:', error);
      alert('Failed to save discount');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Flat layout (no cards) per spec
  const ContentWrapper = 'div';

  return (
    <div className={isInSheet ? "space-y-4" : "mx-4 mb-4 space-y-4"}>
      {showHeader && !isInSheet && (
        <div className="flex items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel} className="cursor-pointer">
                <ArrowLeft className="size-4" />
                Back to Adjustments
              </Button>
            )}
          </div>
          
          {/* Auto-save indicator - only show in edit mode */}
          {mode === 'edit' && discountId && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    {saving ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : isDirty ? (
                      <Save className="h-5 w-5 text-orange-500 animate-pulse" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {saving ? 'Saving...' : 
                     isDirty ? 'Unsaved changes (auto-saves in 3s)' : 
                     'All changes saved'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      <Form {...form}>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ContentWrapper className="space-y-6">
            {/* Archived Switch - Top Right */}
            <div className="flex justify-end">
              <FormField
                control={form.control}
                name="archivedAt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked ? new Date() : null);
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Archived
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* Adjustment Type & Attributes */}
            <Card>
              <CardHeader>
                <CardTitle>Adjustment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="mode"
                    render={({ field }) => (
                      <FormItem>
                        <LabelWithInfo info="Choose whether this subtracts or adds to price.">Adjustment type</LabelWithInfo>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="discount">Discount</SelectItem>
                            <SelectItem value="surcharge">Surcharge</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className={fieldState.error ? '!text-destructive' : ''}>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. SUMMER Sale" className={fieldState.error ? '!border-destructive' : ''} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <LabelWithInfo info="Discount-only. Share with guests or promos.">Code</LabelWithInfo>
                        <FormControl>
                          <Input placeholder="e.g. SUMMER10" {...field} disabled={form.watch('mode') !== 'discount'} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Details for internal use (optional)" rows={3} {...field} />
                        </FormControl>
                        {/* <FormMessage /> */}
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Type & Values */}
            <Card>
              <CardHeader>
                <CardTitle>Type & Values</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Top-level Type Selector */}
                <FormField
                  control={form.control}
                  name="bogoEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === '2for1')} 
                        value={field.value ? '2for1' : 'regular'}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="2for1">2 for 1</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select amount type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percent">Percentage</SelectItem>
                            <SelectItem value="amount">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value {form.watch('type') === 'percent' ? '(%)' : '($)'}</FormLabel>
                        <FormControl>
                          <NumberInput 
                            step={form.watch('type') === 'percent' ? 1 : 0.01} 
                            min={0} 
                            max={form.watch('type') === 'percent' ? 100 : undefined} 
                            placeholder={form.watch('type') === 'percent' ? 'e.g. 10' : 'e.g. 5.00'} 
                            value={field.value} 
                            onChange={field.onChange} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxAmount"
                    render={({ field }) => (
                      <FormItem>
                        <LabelWithInfo info="Caps the applied amount when using percentage.">Max $ value (optional)</LabelWithInfo>
                        <FormControl>
                          <NumberInput 
                            step={0.01} 
                            min={0} 
                            placeholder="e.g. 100" 
                            value={field.value} 
                            onChange={field.onChange} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 2-for-1 specific fields */}
                  {form.watch('bogoEnabled') && (
                    <div className="flex gap-4">
                      <FormField control={form.control} name="bogoBuyQty" render={({ field }) => (
                        <FormItem className="flex-1">
                          <LabelWithInfo info="Number of items customer must purchase to qualify for the discount.">Buy Qty</LabelWithInfo>
                          <FormControl>
                            <NumberInput 
                              min={1} 
                              step={1} 
                              value={field.value} 
                              onChange={field.onChange} 
                            />
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="bogoGetQty" render={({ field }) => (
                        <FormItem className="flex-1">
                          <LabelWithInfo info="Number of items customer gets at the discounted rate.">Get Qty</LabelWithInfo>
                          <FormControl>
                            <NumberInput 
                              min={1} 
                              step={1} 
                              value={field.value} 
                              onChange={field.onChange} 
                            />
                          </FormControl>
                        </FormItem>
                      )} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Products Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Limit to Products & Categories</CardTitle>
                <p className="text-sm text-muted-foreground">Choose categories and/or specific products this adjustment will be restricted to. Leave blank to apply to all products and categories.</p>
              </CardHeader>
              <CardContent>
              <div className="max-w-3xl">
                <FormField
                  control={form.control}
                  name="products"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <MultiSelect
                          values={[...field.value, ...Array.from(selectedCategories).map(c => `category-${c}`)]}
                          onValuesChange={(values) => {
                            // Separate categories and products
                            const newProducts = new Set();
                            const newCategories = new Set();
                            
                            values.forEach((value) => {
                              if (value.startsWith('category-')) {
                                const categoryId = value.replace('category-', '');
                                newCategories.add(categoryId);
                              } else {
                                newProducts.add(value);
                              }
                            });
                            
                            // Update both states
                            setSelectedProducts(newProducts);
                            setSelectedCategories(newCategories);
                            field.onChange(Array.from(newProducts));
                            
                            // Also update the categories field
                            form.setValue('categories', Array.from(newCategories));
                          }}
                        >
                          <MultiSelectTrigger className="w-full">
                            <MultiSelectValue placeholder="Select categories and/or products this discount applies to" />
                          </MultiSelectTrigger>
                          <MultiSelectContent className="[&_[cmdk-list]]:max-h-[60vh] [&_[cmdk-list]]:overflow-y-auto [&_[cmdk-list]]:overscroll-contain">
                            <MultiSelectGroup>
                              {(() => {
                                const seen = new Set();
                                const sortedCategories = [...categoriesWithProducts].sort((a, b) =>
                                  (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
                                );

                                console.log('[MultiSelect Debug] Building items list:', {
                                  categoriesCount: sortedCategories.length,
                                  categories: sortedCategories.map(c => ({
                                    name: c.name,
                                    id: c._id,
                                    productsCount: c.products?.length || 0
                                  }))
                                });

                                const items = [];
                                for (const category of sortedCategories) {
                                  const catLabel = category.name || '';
                                  console.log(`[MultiSelect Debug] Adding category: "${catLabel}" (${category._id})`);
                                  
                                  items.push(
                                    <MultiSelectItem
                                      key={`cat-${category._id}`}
                                      value={`category-${category._id}`}
                                      keywords={[catLabel]}
                                      badgeLabel={catLabel?.toUpperCase?.() || catLabel}
                                      className="font-semibold uppercase"
                                    >
                                      {catLabel}
                                    </MultiSelectItem>
                                  );

                                  const sortedProducts = [...(category.products || [])].sort((a, b) =>
                                    (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
                                  );
                                  for (const product of sortedProducts) {
                                    if (seen.has(product._id)) continue; // avoid duplicates across categories
                                    seen.add(product._id);
                                    
                                    console.log(`[MultiSelect Debug] Adding product: "${product.name}" (${product._id}) under category "${category.name}"`);
                                    
                                    // Check if this product name contains any unexpected text
                                    if (!product.name.toLowerCase().includes('class') && product.name.includes('Membership')) {
                                      console.warn(`[MultiSelect Debug] Product "${product.name}" might appear in 'class' search unexpectedly`);
                                    }
                                    
                                    items.push(
                                      <MultiSelectItem
                                        key={product._id}
                                        value={product._id}
                                        keywords={[product.name]}
                                      >
                                        {product.name}
                                      </MultiSelectItem>
                                    );
                                  }
                                }
                                
                                console.log(`[MultiSelect Debug] Total items created: ${items.length}`);
                                return items;
                              })()}
                            </MultiSelectGroup>
                          </MultiSelectContent>
                        </MultiSelect>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start */}
                <FormField control={form.control} name="start" render={({ field }) => (
                  <FormItem>
                    <LabelWithInfo info="Optional. Adjustment becomes active on this date.">Start date</LabelWithInfo>
                    <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                            {field.value ? dayjs(field.value).format('DD/MM/YYYY') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={(date) => field.onChange(date)} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )} />
                {/* End */}
                <FormField control={form.control} name="expiry" render={({ field }) => (
                  <FormItem>
                    <LabelWithInfo info="Leave blank if it never expires.">End date</LabelWithInfo>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                            {field.value ? dayjs(field.value).format('DD/MM/YYYY') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={(date) => field.onChange(date)} initialFocus />
                      </PopoverContent>
                    </Popover>
                    
                  </FormItem>
                )} />
                {/* Usage */}
                <FormField control={form.control} name="usageLimit" render={({ field }) => (
                  <FormItem>
                    <LabelWithInfo info="Maximum times this can be used across all customers.">Usage limit (total)</LabelWithInfo>
                    <FormControl>
                      <NumberInput 
                        min={1} 
                        step={1} 
                        value={field.value} 
                        onChange={field.onChange} 
                      />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="perCustomerLimit" render={({ field }) => (
                  <FormItem>
                    <LabelWithInfo info="Lifetime limit per customer.">Per-customer limit</LabelWithInfo>
                    <FormControl>
                      <NumberInput 
                        min={1} 
                        step={1} 
                        value={field.value} 
                        onChange={field.onChange} 
                      />
                    </FormControl>
                  </FormItem>
                )} />
                <div className="grid grid-cols-3 gap-2 md:col-span-2">
                  <FormField control={form.control} name="frequencyCount" render={({ field }) => (
                    <FormItem>
                      <LabelWithInfo info="How many times the customer can use this adjustment within the specified period.">Frequency</LabelWithInfo>
                      <FormControl>
                        <NumberInput 
                          min={1} 
                          step={1} 
                          placeholder="Count" 
                          value={field.value} 
                          onChange={field.onChange} 
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="frequencyPeriod" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="opacity-0">Period</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="week">Week</SelectItem>
                          <SelectItem value="month">Month</SelectItem>
                          <SelectItem value="year">Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>

        </ContentWrapper>

        {/* Delete Discount Button - only show in edit mode */}
        {mode === 'edit' && discountId && (
          <div className="w-54">
            <Button
              variant="destructive"
              className="w-full cursor-pointer"
              onClick={() => setDeleteDialogOpen(true)}
              type="button"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Discount
            </Button>
          </div>
        )}

        {/* Inline Action Buttons (hidden when inside Sheet) */}
          {!isInSheet && (
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={loading}
                className="cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  mode === 'edit' ? 'Update Discount' : 'Create Discount'
                )}
              </Button>
            </div>
          )}
        </form>
      </Form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Discount</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{form.watch('name')}"? This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
