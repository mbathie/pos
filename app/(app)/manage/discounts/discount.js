'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

// Zod validation schema
const discountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  type: z.enum(["percent", "amount"], {
    required_error: "Please select a discount type",
  }),
  value: z.string()
    .min(1, "Value is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Value must be a positive number"),
  description: z.string().optional(),
  expiry: z.date().optional().nullable(),
  products: z.array(z.string()).min(0, "Select at least one product").optional(),
}).refine((data) => {
  // Cross-field validation: percentage value cannot exceed 100%
  if (data.type === "percent" && Number(data.value) > 100) {
    return false;
  }
  return true;
}, {
  message: "Percentage value cannot exceed 100%",
  path: ["value"], // This will show the error on the value field
});

export default function DiscountForm({ mode = 'create', discountId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(mode === 'edit');
  const [categoriesWithProducts, setCategoriesWithProducts] = useState([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());

  const form = useForm({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      name: '',
      value: '',
      type: 'percent',
      description: '',
      expiry: null,
      products: [],
    },
  });

  useEffect(() => {
    if (mode === 'edit' && discountId) {
      fetchDiscountAndProducts();
    } else {
      fetchCategoriesAndProducts();
    }
  }, [mode, discountId]);

  const fetchDiscountAndProducts = async () => {
    try {
      // Fetch the discount
      const discountRes = await fetch(`/api/discounts/${discountId}`);
      if (discountRes.ok) {
        const discount = await discountRes.json();
        // Update form with fetched discount data
        form.reset({
          name: discount.name,
          value: discount.value.toString(),
          type: discount.type,
          description: discount.description || '',
          expiry: discount.expiry ? new Date(discount.expiry) : null,
          products: discount.products || [],
        });
        setSelectedProducts(new Set(discount.products || []));
      }

      // Fetch all categories with their products
      const categoriesRes = await fetch('/api/categories?includeProducts=true');
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
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
      // Fetch all categories with their products
      const categoriesRes = await fetch('/api/categories?includeProducts=true');
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategoriesWithProducts(categoriesData.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories and products:', error);
    } finally {
      setFetching(false);
    }
  };



  const handleProductToggle = (productId, checked) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
    // Update form with new products array
    form.setValue('products', Array.from(newSelected));
  };

  const handleCategoryToggle = (category, checked) => {
    const newSelected = new Set(selectedProducts);
    category.products?.forEach(product => {
      if (checked) {
        newSelected.add(product._id);
      } else {
        newSelected.delete(product._id);
      }
    });
    setSelectedProducts(newSelected);
    // Update form with new products array
    form.setValue('products', Array.from(newSelected));
  };

  const isCategorySelected = (category) => {
    if (!category.products?.length) return false;
    return category.products.every(product => selectedProducts.has(product._id));
  };

  const isCategoryPartiallySelected = (category) => {
    if (!category.products?.length) return false;
    const selectedCount = category.products.filter(product => selectedProducts.has(product._id)).length;
    return selectedCount > 0 && selectedCount < category.products.length;
  };

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      // Prepare submission data
      const submitData = {
        name: data.name,
        type: data.type,
        value: parseFloat(data.value),
        description: data.description || '',
        expiry: data.expiry ? data.expiry.toISOString() : null,
        products: Array.from(selectedProducts)
      };

      const url = mode === 'edit' ? `/api/discounts/${discountId}` : '/api/discounts';
      const method = mode === 'edit' ? 'PUT' : 'POST';
      
      console.log('Submitting discount data:', submitData);
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (res.ok) {
        const savedDiscount = await res.json();
        console.log('Saved discount:', savedDiscount);
        router.push('/manage/discounts');
      } else {
        const error = await res.json();
        console.error('Save error:', error);
        // You could use toast notifications here instead of alert
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
      <div className="mx-4 mt-4">
        <div className="text-center py-8">Loading discount...</div>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          Back to Discounts
        </Button>
        <h1 className="text-2xl font-bold">
          {mode === 'edit' ? 'Edit Discount' : 'Create New Discount'}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Discount Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Discount Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <FormItem className="relative">
                      <FormLabel className={fieldState.error ? "text-destructive" : ""}>Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Student Discount" 
                          className={fieldState.error ? "border-destructive focus:border-destructive" : ""}
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field, fieldState }) => (
                    <FormItem className="relative">
                      <FormLabel className={fieldState.error ? "text-destructive" : ""}>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={fieldState.error ? "border-destructive focus:border-destructive" : ""}>
                            <SelectValue placeholder="Select discount type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percent">Percentage</SelectItem>
                          <SelectItem value="amount">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field, fieldState }) => (
                    <FormItem className="relative">
                      <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                        Value {form.watch('type') === 'percent' ? '(%)' : '($)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={form.watch('type') === 'percent' ? '100' : undefined}
                          placeholder={form.watch('type') === 'percent' ? 'e.g. 15' : 'e.g. 5.00'}
                          className={fieldState.error ? "border-destructive focus:border-destructive" : ""}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiry"
                  render={({ field, fieldState }) => (
                    <FormItem className="relative">
                      <FormLabel className={fieldState.error ? "text-destructive" : ""}>Expiry Date</FormLabel>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal",
                                !field.value && "text-muted-foreground",
                                fieldState.error && "border-destructive focus:border-destructive"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? dayjs(field.value).format("DD/MM/YYYY") : "Never expires"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              if (date) setCalendarOpen(false);
                            }}
                            initialFocus
                            disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
                          />
                          {field.value && (
                            <div className="p-3 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  field.onChange(null);
                                  setCalendarOpen(false);
                                }}
                                className="w-full"
                              >
                                Clear Date (Never Expires)
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field, fieldState }) => (
                  <FormItem className="relative">
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description"
                        rows={3}
                        className={fieldState.error ? "border-destructive focus:border-destructive" : ""}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

        {/* Product Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select which products this discount should automatically apply to during checkout.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoriesWithProducts.map((category) => (
                <div key={category._id} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isCategorySelected(category)}
                      onCheckedChange={(checked) => handleCategoryToggle(category, checked)}
                      className={isCategoryPartiallySelected(category) ? "data-[state=checked]:bg-orange-500" : ""}
                    />
                    <h3 className="">{category.name}</h3>
                  </div>

                  {category.products?.length > 0 && (
                    <div className="ml-4 space-y-1">
                      {category.products.map((product) => (
                        <div key={product._id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedProducts.has(product._id)}
                            onCheckedChange={(checked) => handleProductToggle(product._id, checked)}
                          />
                          <span className="">{product.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {categoriesWithProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No products found. Add some products first.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 
              (mode === 'edit' ? 'Saving...' : 'Creating...') : 
              (mode === 'edit' ? 'Save Changes' : 'Create Discount')
            }
          </Button>
        </div>
        </form>
      </Form>
    </div>
  );
} 