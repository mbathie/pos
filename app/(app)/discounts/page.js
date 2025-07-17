'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Percent, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentDiscount, setCurrentDiscount] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    type: 'percent',
    description: '',
    expiry: null
  });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts`);
      const data = await res.json();
      console.log(data);
      // API returns a flat array, not wrapped in a discounts property
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (value) => {
    setFormData({ ...formData, type: value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Convert value to number and format expiry
    const submitData = {
      ...formData,
      value: parseFloat(formData.value),
      expiry: formData.expiry ? formData.expiry.toISOString() : null
    };

    // Validation
    if (isNaN(submitData.value) || submitData.value < 0) {
      alert('Please enter a valid positive number for value');
      return;
    }

    if (submitData.type === 'percent' && submitData.value > 100) {
      alert('Percentage value cannot exceed 100%');
      return;
    }
    
    try {
      const url = currentDiscount 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts/${currentDiscount._id}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts`;
      
      const method = currentDiscount ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      
      if (res.ok) {
        const savedDiscount = await res.json();
        
        if (currentDiscount) {
          // Update existing discount in state
          setDiscounts(prev => prev.map(discount => 
            discount._id === currentDiscount._id ? savedDiscount : discount
          ));
        } else {
          // Add new discount to state
          setDiscounts(prev => [savedDiscount, ...prev]);
        }
        
        setFormOpen(false);
        setFormData({ name: '', value: '', type: 'percent', description: '', expiry: null });
        setCurrentDiscount(null);
      } else {
        const error = await res.json();
        alert(error.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error saving discount:', error);
      alert('Failed to save discount');
    }
  };

  const handleEdit = (discount) => {
    setCurrentDiscount(discount);
    setFormData({
      name: discount.name,
      value: discount.value.toString(),
      type: discount.type,
      description: discount.description || '',
      expiry: discount.expiry ? new Date(discount.expiry) : null
    });
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!currentDiscount) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts/${currentDiscount._id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        // Remove deleted discount from state
        setDiscounts(prev => prev.filter(discount => discount._id !== currentDiscount._id));
        
        setDeleteDialogOpen(false);
        setCurrentDiscount(null);
      } else {
        const error = await res.json();
        alert(error.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error deleting discount:', error);
      alert('Failed to delete discount');
    }
  };

  const openDeleteDialog = (discount) => {
    setCurrentDiscount(discount);
    setDeleteDialogOpen(true);
  };

  const addNewDiscount = () => {
    setCurrentDiscount(null);
    setFormData({ name: '', value: '', type: 'percent', description: '', expiry: null });
    setFormOpen(true);
  };

  const formatValue = (value, type) => {
    if (type === 'percent') {
      return `${value}%`;
    } else {
      return `$${value}`;
    }
  };

  return (
    <Card className="mx-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Discounts</CardTitle>
            <CardDescription>Manage discount codes for your products and services</CardDescription>
          </div>
          <Button onClick={addNewDiscount} size="sm">
            <Plus className="size-4"/> Add Discount
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading discounts...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No discounts found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                discounts.map((discount) => {
                  return (
                    <TableRow key={discount._id}>
                      <TableCell className="font-medium">{discount.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* <TypeIcon className="size-4 text-muted-foreground" /> */}
                          {formatValue(discount.value, discount.type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={discount.type === 'percent' ? 'default' : 'secondary'}>
                          {discount.type === 'percent' ? 'Percentage' : 'Fixed Amount'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {discount.expiry ? (
                          <div className="flex items-center gap-1 text-sm">
                            {/* <CalendarIcon className="size-3" /> */}
                            {dayjs(discount.expiry).format('DD/MM/YYYY')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No expiry</span>
                        )}
                      </TableCell>
                      <TableCell>{discount.description || '-'}</TableCell>
                      <TableCell className="text-right flex gap-2 justify-end">
                        <Edit className="size-4 cursor-pointer" onClick={() => handleEdit(discount)}/>
                        <Trash2 className="size-4 cursor-pointer" onClick={() => openDeleteDialog(discount)}/>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}

        {/* Add/Edit Form Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentDiscount ? 'Edit Discount' : 'Add Discount'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFormSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
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
                <div className="grid gap-2">
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
                <div className="grid gap-2">
                  <Label htmlFor="value">
                    Value {formData.type === 'percent' ? '(%)' : '($)'}
                  </Label>
                  <Input
                    id="value"
                    name="value"
                    type="number"
                    step={formData.type === 'percent' ? '0.01' : '0.01'}
                    min="0"
                    max={formData.type === 'percent' ? '100' : undefined}
                    value={formData.value}
                    onChange={handleInputChange}
                    placeholder={formData.type === 'percent' ? 'e.g. 15' : 'e.g. 5.00'}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "justify-start text-left font-normal",
                          !formData.expiry && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expiry ? dayjs(formData.expiry).format("DD/MM/YYYY") : <span>Pick a date (optional)</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.expiry}
                        onSelect={(date) => {
                          setFormData({ ...formData, expiry: date });
                          if (date) setCalendarOpen(false); // Close popover when date is selected
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
                              setCalendarOpen(false); // Close popover when clearing date
                            }}
                            className="w-full"
                          >
                            Clear Date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
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
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the discount "{currentDiscount?.name}".
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
} 