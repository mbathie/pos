'use client';

import React, { useState, useEffect, useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Calendar as CalendarIcon, Loader2, Info, Save, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import ProductCategorySelector from './product-category-selector';

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

// Adjustment schema for multiple adjustments
const adjustmentSchema = z.object({
  products: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  type: z.enum(["percent", "amount"]),
  value: z.number().positive(),
  maxAmount: z.number().positive().optional()
});

// Main discount schema
const discountSchema = z.object({
  // Attributes
  code: z.string().trim().max(64).optional().or(z.literal('')),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  archivedAt: z.date().optional().nullable(),
  
  // Type
  mode: z.enum(["discount", "surcharge"]).default("discount"),
  
  // Must haves
  mustProducts: z.array(z.string()).optional(),
  mustCategories: z.array(z.string()).optional(),
  
  // Adjustments (multiple) - make it optional with default empty array
  adjustments: z.array(adjustmentSchema).optional().default([]),
  
  // Limits
  start: z.date().optional().nullable(),
  expiry: z.date().optional().nullable(),
  daysOfWeek: z.object({
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
    sunday: z.boolean()
  }),
  totalUsageLimit: z.number().int().positive().optional(),
  totalFrequencyCount: z.number().int().positive().optional(),
  totalFrequencyPeriod: z.enum(["day", "week", "month", "year"]).optional(),
  perCustomerLimit: z.number().int().positive().optional()
}).refine((data) => {
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
  formId = 'discount-form-v2'
}) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(mode === 'edit');
  const [categoriesWithProducts, setCategoriesWithProducts] = useState([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Tracking adjustments
  const [adjustments, setAdjustments] = useState([{
    id: Date.now(),
    products: new Set(),
    categories: new Set(),
    type: 'percent',
    value: undefined,
    maxAmount: undefined
  }]);

  // Must haves
  const [mustProducts, setMustProducts] = useState(new Set());
  const [mustCategories, setMustCategories] = useState(new Set());
  
  // Auto-save state
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimeoutRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      archivedAt: null,
      mode: 'discount',
      mustProducts: [],
      mustCategories: [],
      adjustments: [],
      start: null,
      expiry: null,
      daysOfWeek: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true
      },
      totalUsageLimit: undefined,
      totalFrequencyCount: undefined,
      totalFrequencyPeriod: undefined,
      perCustomerLimit: undefined
    },
  });

  useEffect(() => {
    if (mode === 'edit' && discountId) {
      fetchDiscountAndProducts();
    } else {
      fetchCategoriesAndProducts();
    }
  }, [mode, discountId]);

  // Watch for form changes and trigger auto-save
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (mode === 'edit' && !fetching) {
        setIsDirty(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, mode, fetching]);

  // Watch for adjustment and must-have changes
  useEffect(() => {
    if (mode === 'edit' && !fetching) {
      setIsDirty(true);
    }
  }, [adjustments, mustProducts, mustCategories, mode, fetching]);

  // Auto-save when dirty
  useEffect(() => {
    if (mode === 'edit' && isDirty && !saving) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 3000); // Auto-save after 3 seconds of inactivity
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, mode, saving]);

  const fetchDiscountAndProducts = async () => {
    try {
      const [discountRes, categoriesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts/${discountId}`, {
          credentials: 'include'
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?includeProducts=true`, {
          credentials: 'include'
        })
      ]);

      if (discountRes.ok) {
        const discount = await discountRes.json();
        
        // Convert old format to new format if needed
        let discountAdjustments = [];
        if (discount.adjustments && discount.adjustments.length > 0) {
          discountAdjustments = discount.adjustments.map(adj => ({
            id: Date.now() + Math.random(),
            products: new Set(adj.products || []),
            categories: new Set(adj.categories || []),
            type: adj.adjustment?.type || 'percent',
            value: adj.adjustment?.value,
            maxAmount: adj.adjustment?.maxAmount
          }));
        } else if (discount.type && discount.value) {
          // Legacy format - convert to single adjustment
          discountAdjustments = [{
            id: Date.now(),
            products: new Set(discount.products || []),
            categories: new Set(discount.categories || []),
            type: discount.type,
            value: discount.value,
            maxAmount: discount.maxAmount
          }];
        }

        setAdjustments(discountAdjustments.length > 0 ? discountAdjustments : [{
          id: Date.now(),
          products: new Set(),
          categories: new Set(),
          type: 'percent',
          value: undefined,
          maxAmount: undefined
        }]);

        // Set must haves
        setMustProducts(new Set(discount.musts?.products || []));
        setMustCategories(new Set(discount.musts?.categories || []));

        form.reset({
          code: discount.code || '',
          name: discount.name,
          description: discount.description || '',
          archivedAt: discount.archivedAt ? new Date(discount.archivedAt) : null,
          mode: discount.mode || 'discount',
          mustProducts: discount.musts?.products || [],
          mustCategories: discount.musts?.categories || [],
          adjustments: [], // Will be managed separately in state
          start: discount.start ? new Date(discount.start) : null,
          expiry: discount.expiry ? new Date(discount.expiry) : null,
          daysOfWeek: discount.daysOfWeek || {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: true
          },
          totalUsageLimit: discount.limits?.total?.usageLimit,
          totalFrequencyCount: discount.limits?.total?.frequency?.count,
          totalFrequencyPeriod: discount.limits?.total?.frequency?.period,
          perCustomerLimit: discount.limits?.perCustomer
        });
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        console.log('Categories API response:', data);
        setCategoriesWithProducts(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setFetching(false);
    }
  };

  const fetchCategoriesAndProducts = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?includeProducts=true`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Categories API response (create mode):', data);
        setCategoriesWithProducts(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setFetching(false);
    }
  };

  const addAdjustment = () => {
    setAdjustments([...adjustments, {
      id: Date.now(),
      products: new Set(),
      categories: new Set(),
      type: 'percent',
      value: undefined,
      maxAmount: undefined
    }]);
  };

  const removeAdjustment = (id) => {
    if (adjustments.length > 1) {
      setAdjustments(adjustments.filter(adj => adj.id !== id));
    }
  };

  const updateAdjustment = (id, updates) => {
    setAdjustments(adjustments.map(adj => 
      adj.id === id ? { ...adj, ...updates } : adj
    ));
  };

  // Auto-save function
  const autoSave = async () => {
    if (mode === 'create' || !discountId || saving) return; // Don't auto-save for new discounts or if already saving
    
    setSaving(true);
    try {
      const data = form.getValues(); // Get current form values
      
      // Prepare adjustments for submission
      const formattedAdjustments = adjustments
        .filter(adj => adj.value) // Only include adjustments with values
        .map(adj => ({
          products: Array.from(adj.products),
          categories: Array.from(adj.categories),
          adjustment: {
            type: adj.type,
            value: adj.value,
            maxAmount: adj.maxAmount
          }
        }));

      const submitData = {
        code: data.code?.trim() || undefined,
        name: data.name,
        description: data.description || '',
        archivedAt: data.archivedAt ? data.archivedAt.toISOString() : null,
        mode: data.mode,
        musts: {
          products: Array.from(mustProducts),
          categories: Array.from(mustCategories)
        },
        adjustments: formattedAdjustments,
        start: data.start ? data.start.toISOString() : null,
        expiry: data.expiry ? data.expiry.toISOString() : null,
        daysOfWeek: data.daysOfWeek,
        limits: {
          total: {
            usageLimit: data.totalUsageLimit,
            frequency: data.totalFrequencyCount && data.totalFrequencyPeriod ? {
              count: data.totalFrequencyCount,
              period: data.totalFrequencyPeriod
            } : undefined
          },
          perCustomer: data.perCustomerLimit
        }
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts/${discountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(submitData)
      });

      if (res.ok) {
        setLastSaved(new Date());
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const onError = (errors) => {
    console.log('Form validation failed:', errors);
    // Show the first error message to the user
    const firstError = Object.values(errors)[0];
    if (firstError?.message) {
      toast.error(firstError.message);
    }
  };

  const onSubmit = async (data) => {
    console.log('Form submitted with data:', data);
    console.log('Current adjustments:', adjustments);
    setLoading(true);

    try {
      // Prepare adjustments for submission
      const formattedAdjustments = adjustments
        .filter(adj => adj.value) // Only include adjustments with values
        .map(adj => ({
          products: Array.from(adj.products),
          categories: Array.from(adj.categories),
          adjustment: {
            type: adj.type,
            value: adj.value,
            maxAmount: adj.maxAmount
          }
        }));

      const submitData = {
        code: data.code?.trim() || undefined,
        name: data.name,
        description: data.description || '',
        archivedAt: data.archivedAt ? data.archivedAt.toISOString() : null,
        mode: data.mode,
        musts: {
          products: Array.from(mustProducts),
          categories: Array.from(mustCategories)
        },
        adjustments: formattedAdjustments,
        start: data.start ? data.start.toISOString() : null,
        expiry: data.expiry ? data.expiry.toISOString() : null,
        daysOfWeek: data.daysOfWeek,
        limits: {
          total: {
            usageLimit: data.totalUsageLimit,
            frequency: data.totalFrequencyCount && data.totalFrequencyPeriod ? {
              count: data.totalFrequencyCount,
              period: data.totalFrequencyPeriod
            } : undefined
          },
          perCustomer: data.perCustomerLimit
        }
      };

      const url = mode === 'edit' 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts/${discountId}` 
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts`;
      const method = mode === 'edit' ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const daysOfWeek = [
    { name: 'monday', label: 'Mon' },
    { name: 'tuesday', label: 'Tue' },
    { name: 'wednesday', label: 'Wed' },
    { name: 'thursday', label: 'Thu' },
    { name: 'friday', label: 'Fri' },
    { name: 'saturday', label: 'Sat' },
    { name: 'sunday', label: 'Sun' }
  ];

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
                     isDirty ? 'Unsaved changes' : 
                     'All changes saved'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      <Form {...form}>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
          {/* Archived Switch */}
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
                  <FormLabel className="text-sm font-normal">Archived</FormLabel>
                </FormItem>
              )}
            />
          </div>

          {/* Adjustment Details */}
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
                      <FormLabel>Adjustment type</FormLabel>
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Summer Sale" {...field} />
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
                      <LabelWithInfo info="Public code that customers can enter to apply this discount">
                        Code
                      </LabelWithInfo>
                      <FormControl>
                        <Input 
                          placeholder="e.g. SUMMER10" 
                          {...field} 
                          disabled={form.watch('mode') !== 'discount'} 
                        />
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
                        <Textarea placeholder="Internal notes" rows={3} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Must Haves */}
          <Card>
            <CardHeader>
              <CardTitle>Must Haves</CardTitle>
              <p className="text-sm text-muted-foreground">
                Customer must be purchasing these products/categories for the discount to apply.
                Leave blank to apply to all.
              </p>
            </CardHeader>
            <CardContent>
              <ProductCategorySelector
                categoriesWithProducts={categoriesWithProducts}
                selectedProducts={mustProducts}
                selectedCategories={mustCategories}
                onSelectionChange={({ products, categories }) => {
                  setMustProducts(products);
                  setMustCategories(categories);
                  form.setValue('mustProducts', Array.from(products));
                  form.setValue('mustCategories', Array.from(categories));
                }}
                placeholder="Select required products/categories"
              />
            </CardContent>
          </Card>

          {/* Adjustments */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Adjustments</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Define adjustment values for specific products/categories. 
                    Leave blank to apply to all products.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={addAdjustment}
                  className="cursor-pointer"
                >
                  <Plus className="size-4 mr-1" />
                  Add Adjustment
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {adjustments.map((adj, index) => (
                <div key={adj.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-medium">Adjustment {index + 1}</h4>
                    {adjustments.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAdjustment(adj.id)}
                        className="cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                  
                  <ProductCategorySelector
                    categoriesWithProducts={categoriesWithProducts}
                    selectedProducts={adj.products}
                    selectedCategories={adj.categories}
                    onSelectionChange={({ products, categories }) => {
                      updateAdjustment(adj.id, { products, categories });
                    }}
                    placeholder="Select products/categories (leave blank for all)"
                  />
                  
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <Select 
                        value={adj.type}
                        onValueChange={(value) => updateAdjustment(adj.id, { type: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentage</SelectItem>
                          <SelectItem value="amount">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">
                        Value {adj.type === 'percent' ? '(%)' : '($)'}
                      </label>
                      <NumberInput
                        value={adj.value}
                        onChange={(value) => updateAdjustment(adj.id, { value })}
                        min={0}
                        max={adj.type === 'percent' ? 100 : undefined}
                        step={adj.type === 'percent' ? 1 : 0.01}
                        placeholder={adj.type === 'percent' ? 'e.g. 10' : 'e.g. 5.00'}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Max $ Value</label>
                      <NumberInput
                        value={adj.maxAmount}
                        onChange={(value) => updateAdjustment(adj.id, { maxAmount: value })}
                        min={0}
                        step={0.01}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Two column layout with Days of Week spanning both rows */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left column: Start date and End date */}
                  <div className="space-y-6">
                    <FormField control={form.control} name="start" render={({ field }) => (
                      <FormItem>
                        <LabelWithInfo info="Date when this adjustment becomes active">
                          Start date
                        </LabelWithInfo>
                        <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                {field.value ? dayjs(field.value).format('DD/MM/YYYY') : <span>No start date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={(date) => {
                              field.onChange(date);
                              setStartCalendarOpen(false);
                            }} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="expiry" render={({ field }) => (
                      <FormItem>
                        <LabelWithInfo info="Date when this adjustment expires and stops being active">
                          End date
                        </LabelWithInfo>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                {field.value ? dayjs(field.value).format('DD/MM/YYYY') : <span>No end date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={(date) => {
                              field.onChange(date);
                              setCalendarOpen(false);
                            }} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )} />
                  </div>
                  
                  {/* Right column: Days of Week (spans full height) */}
                  <FormField
                    control={form.control}
                    name="daysOfWeek"
                    render={({ field }) => {
                      const allChecked = daysOfWeek.every(day => field.value?.[day.name] ?? true);
                      const someChecked = daysOfWeek.some(day => field.value?.[day.name] ?? true) && !allChecked;
                      
                      return (
                        <FormItem className="h-full flex flex-col">
                          <LabelWithInfo info="Limit when this adjustment can be applied based on the day of the week">
                            Days of Week
                          </LabelWithInfo>
                          <div className="space-y-2 mt-2">
                            <div className="grid grid-cols-4 gap-y-4">
                              {/* Row 1: All, Mon, Tue, Wed */}
                              <div className="flex flex-col items-start gap-1">
                                <div className="flex items-center gap-1">
                                  <Checkbox
                                    checked={allChecked}
                                    indeterminate={someChecked ? true : undefined}
                                    onCheckedChange={(checked) => {
                                      const newValue = {};
                                      daysOfWeek.forEach(day => {
                                        newValue[day.name] = !!checked;
                                      });
                                      field.onChange(newValue);
                                    }}
                                  />
                                  <label className="text-xs text-muted-foreground">All</label>
                                </div>
                              </div>
                              {daysOfWeek.slice(0, 3).map((day) => (
                                <div key={day.name} className="">
                                  <div className="flex items-center gap-1">
                                  <Checkbox
                                    checked={field.value?.[day.name] ?? true}
                                    onCheckedChange={(checked) => {
                                      field.onChange({
                                        ...field.value,
                                        [day.name]: checked
                                      });
                                    }}
                                  />
                                  <label className="text-xs text-muted-foreground">{day.label}</label>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Row 2: Thu, Fri, Sat, Sun */}
                              {daysOfWeek.slice(3).map((day) => (
                                <div key={day.name} className="flex flex-col items-start gap-1">
                                  <div className="flex items-center gap-1">
                                    <Checkbox
                                      checked={field.value?.[day.name] ?? true}
                                      onCheckedChange={(checked) => {
                                        field.onChange({
                                          ...field.value,
                                          [day.name]: checked
                                        });
                                      }}
                                    />
                                    <label className="text-xs text-muted-foreground">{day.label}</label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </FormItem>
                      );
                    }}
                  />
                </div>

                {/* Row 3: Usage limit and Per-customer limit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="totalUsageLimit" render={({ field }) => (
                    <FormItem>
                      <LabelWithInfo info="Maximum total uses across all customers">
                        Usage limit (total)
                      </LabelWithInfo>
                      <FormControl>
                        <NumberInput 
                          min={1} 
                          step={1} 
                          value={field.value} 
                          onChange={field.onChange}
                          placeholder="Unlimited"
                        />
                      </FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="perCustomerLimit" render={({ field }) => (
                    <FormItem>
                      <LabelWithInfo info="Lifetime limit per customer">
                        Per-customer limit
                      </LabelWithInfo>
                      <FormControl>
                        <NumberInput 
                          min={1} 
                          step={1} 
                          value={field.value} 
                          onChange={field.onChange}
                          placeholder="Unlimited"
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Row 5: Frequency + Period */}
                <div className="grid grid-cols-3 gap-2">
                  <FormField control={form.control} name="totalFrequencyCount" render={({ field }) => (
                    <FormItem>
                      <LabelWithInfo info="Limit how often this adjustment can be used within a time period">
                        Frequency
                      </LabelWithInfo>
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
                  <FormField control={form.control} name="totalFrequencyPeriod" render={({ field }) => (
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

          {/* Action Buttons */}
          {!isInSheet && mode === 'create' && (
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  <ArrowLeft className="size-4 mr-2" />
                  Back to Adjustments
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
                  'Create Adjustment'
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