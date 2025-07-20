'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus } from 'lucide-react';
import dayjs from 'dayjs';

export default function DiscountsPage() {
  const router = useRouter();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentDiscount, setCurrentDiscount] = useState(null);

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

  const handleEdit = (discount) => {
    router.push(`/manage/discounts/${discount._id}/edit`);
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
          <Button onClick={() => router.push('/manage/discounts/create')} size="sm">
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
                <TableHead>Products</TableHead>
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
                        <Badge variant="outline">
                          {discount.products?.length || 0} product{(discount.products?.length || 0) !== 1 ? 's' : ''}
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