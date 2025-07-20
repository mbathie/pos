'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

export default function DiscountForm({ mode = 'create', discountId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(mode === 'edit');
  const [categoriesWithProducts, setCategoriesWithProducts] = useState([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    type: 'percent',
    description: '',
    expiry: null
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
        console.log('Loaded discount:', discount);
        console.log('Discount products:', discount.products);
        setFormData({
          name: discount.name,
          value: discount.value.toString(),
          type: discount.type,
          description: discount.description || '',
          expiry: discount.expiry ? new Date(discount.expiry) : null
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (value) => {
    setFormData({ ...formData, type: value });
  };

  const handleProductToggle = (productId, checked) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Convert value to number and format expiry
    const submitData = {
      ...formData,
      value: parseFloat(formData.value),
      expiry: formData.expiry ? formData.expiry.toISOString() : null,
      products: Array.from(selectedProducts)
    };

    // Validation
    if (isNaN(submitData.value) || submitData.value < 0) {
      alert('Please enter a valid positive number for value');
      setLoading(false);
      return;
    }

    if (submitData.type === 'percent' && submitData.value > 100) {
      alert('Percentage value cannot exceed 100%');
      setLoading(false);
      return;
    }

    try {
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

      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Discount Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Discount Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Student Discount"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={handleSelectChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="amount">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">
                  Value {formData.type === 'percent' ? '(%)' : '($)'}
                </Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.type === 'percent' ? '100' : undefined}
                  value={formData.value}
                  onChange={handleInputChange}
                  placeholder={formData.type === 'percent' ? 'e.g. 15' : 'e.g. 5.00'}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !formData.expiry && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expiry ? dayjs(formData.expiry).format("DD/MM/YYYY") : "Never expires"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.expiry}
                      onSelect={(date) => {
                        setFormData({ ...formData, expiry: date });
                        if (date) setCalendarOpen(false);
                      }}
                      initialFocus
                      disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
                    />
                    {formData.expiry && (
                      <div className="p-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormData({ ...formData, expiry: null });
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
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Optional description"
                rows={3}
              />
            </div>
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
            <div className="space-y-4">
              {categoriesWithProducts.map((category) => (
                <div key={category._id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isCategorySelected(category)}
                      onCheckedChange={(checked) => handleCategoryToggle(category, checked)}
                      className={isCategoryPartiallySelected(category) ? "data-[state=checked]:bg-orange-500" : ""}
                    />
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                  </div>

                  {category.products?.length > 0 && (
                    <div className="ml-4 space-y-1">
                      {category.products.map((product) => (
                        <div key={product._id} className="flex items-center gap-2 py-2">
                          <Checkbox
                            checked={selectedProducts.has(product._id)}
                            onCheckedChange={(checked) => handleProductToggle(product._id, checked)}
                          />
                          <span className="font-medium">{product.name}</span>
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
    </div>
  );
} 