'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, Plus, MoreHorizontal, Percent, DollarSign, Calendar } from 'lucide-react';
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
    <div className="container mx-auto px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold mb-1">Discounts</h1>
            <p className="text-sm text-muted-foreground">Manage discount codes for your products and services</p>
          </div>
          <Button onClick={() => router.push('/manage/discounts/create')} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2"/> Add Discount
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b bg-muted/50 hover:bg-muted/50">
                <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Name
                </th>
                <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Value
                </th>
                <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Products
                </th>
                <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Expiry
                </th>
                <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Description
                </th>
                <th scope="col" className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                <tr className="border-b">
                  <td colSpan={6} className="p-4">
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-8 w-32" />
                          <Skeleton className="h-8 w-20" />
                          <Skeleton className="h-8 w-24" />
                          <Skeleton className="h-8 w-28" />
                          <Skeleton className="h-8 flex-1" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : discounts.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={6} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">No discounts found. Add one to get started.</p>
                  </td>
                </tr>
              ) : (
                discounts.map((discount) => (
                  <tr key={discount._id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium align-middle">
                      {discount.name}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        {discount.type === 'percent' ? (
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        )}
                        {formatValue(discount.value, discount.type)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge variant="secondary">
                        {discount.products?.length || 0} product{(discount.products?.length || 0) !== 1 ? 's' : ''}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {discount.expiry ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{dayjs(discount.expiry).format('DD/MM/YYYY')}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No expiry</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-muted-foreground">
                        {discount.description || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="cursor-pointer h-8 w-8" 
                            aria-label="Discount actions" 
                            title="Discount actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="cursor-pointer" 
                            onClick={() => handleEdit(discount)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit discount
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="cursor-pointer" 
                            onClick={() => openDeleteDialog(discount)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete discount
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>

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
    </div>
  );
} 