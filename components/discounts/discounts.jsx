'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Edit, Trash2, Plus, MoreHorizontal, Percent, DollarSign, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import DiscountEditSheet from './discount-edit-sheet';

const ITEMS_PER_PAGE = 10;

export default function Discounts({ 
  isPanel = false, 
  // Use panelLook to force the chevron/right UI + clickable row styling
  panelLook = false,
  onSelect = null,
  onRowClick = null,
  selectedDiscounts = [],
  multiSelect = false,
  showHeader = true,
  showActions = true,
  compact = false 
}) {
  const router = useRouter();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentDiscount, setCurrentDiscount] = useState(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  
  // New state for pagination and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [archivedFilter, setArchivedFilter] = useState('active');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts`);
      const data = await res.json();
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (discount) => {
    if (isPanel) {
      // In panel mode, open edit sheet
      setEditingDiscount(discount);
      setEditSheetOpen(true);
    } else {
      // In standalone mode, navigate to edit page
      router.push(`/manage/adjustments/${discount._id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (!currentDiscount) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts/${currentDiscount._id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
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

  const handleRowClick = (discount, e) => {
    // Prevent row click when clicking on specific action buttons
    if (e && e.target.closest('button')) {
      return;
    }
    // If a custom row click handler is provided, use it
    if (onRowClick) {
      onRowClick(discount);
      return;
    }

    if (isPanel) {
      // In panel mode, open edit sheet when clicking the row
      handleEdit(discount);
    } else if (onSelect) {
      // If there's an onSelect handler, use it
      onSelect(discount, 'select');
    }
  };

  const isSelected = (discount) => {
    return selectedDiscounts.some(d => d._id === discount._id);
  };

  const formatValue = (value, type) => {
    if (type === 'percent') {
      return `${value}%`;
    } else {
      return `$${value}`;
    }
  };

  // Utility functions for table functionality
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (column) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const isActive = (discount) => {
    const now = new Date();
    const start = discount.start ? new Date(discount.start) : null;
    const expiry = discount.expiry ? new Date(discount.expiry) : null;
    
    // If no dates are set, it's considered indefinite/active
    if (!start && !expiry) return true;
    
    // Check if current date is within the range
    if (start && now < start) return false;
    if (expiry && now > expiry) return false;
    
    return true;
  };

  const isArchived = (discount) => {
    return discount.archivedAt !== null && discount.archivedAt !== undefined;
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = discounts;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(discount =>
        discount.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (discount.code && discount.code.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply archived filter
    if (archivedFilter === 'active') {
      filtered = filtered.filter(discount => !isArchived(discount));
    } else if (archivedFilter === 'archived') {
      filtered = filtered.filter(discount => isArchived(discount));
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Special handling for different data types
        if (sortConfig.key === 'active') {
          aValue = isActive(a);
          bValue = isActive(b);
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [discounts, searchQuery, archivedFilter, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentData = processedData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, archivedFilter]);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className={isPanel ? "" : "container mx-auto px-4 max-w-7xl h-full flex flex-col py-4"}>
      {/* Header */}
      {showHeader && (
        <div className="mb-4- flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-semibold mb-1">Adjustments</h1>
              <p className="text-sm text-muted-foreground">
                {isPanel && onSelect 
                  ? "Select adjustments to apply" 
                  : "Manage discounts and surcharges"}
              </p>
            </div>
            {!isPanel && (
              <Button onClick={() => router.push('/manage/adjustments/create')} className="cursor-pointer">
                <Plus className="h-4 w-4 mr-2"/> Add Adjustment
              </Button>
            )}
          </div>

          {/* Controls */}
          {!isPanel && (
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search adjustments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Archived Filter */}
              <Select value={archivedFilter} onValueChange={setArchivedFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Adjustments</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="archived">Archived Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Results count */}
              <div className="flex items-center gap-2 ml-auto">
                <Badge variant="secondary" className="text-sm">
                  {loading ? 'Loading...' : `${processedData.length} adjustment${processedData.length !== 1 ? 's' : ''}`}
                </Badge>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table Container - Scrollable */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="rounded-md border flex-1 overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
              <tr className="border-b bg-muted/50 hover:bg-muted/50">
                <th 
                  scope="col"
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Name
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('code')}
                >
                  <div className="flex items-center">
                    Code
                    {getSortIcon('code')}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center">
                    Value
                    {getSortIcon('value')}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('mode')}
                >
                  <div className="flex items-center">
                    Type
                    {getSortIcon('mode')}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('active')}
                >
                  <div className="flex items-center">
                    Active
                    {getSortIcon('active')}
                  </div>
                </th>
                {showActions && (
                  <th scope="col" className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                    Actions
                  </th>
                )}
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
                          <Skeleton className="h-8 w-16" />
                          {showActions && <Skeleton className="h-8 w-8" />}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={6} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">
                      {searchQuery || archivedFilter !== 'all' 
                        ? 'No adjustments found matching your criteria' 
                        : 'No adjustments found. Add one to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                currentData.map((discount) => (
                  <tr 
                    key={discount._id} 
                    className={`border-b hover:bg-muted/50 ${(isPanel || panelLook) ? 'cursor-pointer' : ''} ${isSelected(discount) ? 'bg-muted/30' : ''}`}
                    onClick={(e) => handleRowClick(discount, e)}
                  >
                    <td className="px-4 py-3 font-medium align-middle">
                      {discount.name}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-muted-foreground">
                        {discount.code || '-'}
                      </span>
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
                      <Badge variant={discount.mode === 'discount' ? 'default' : 'secondary'} className="capitalize">
                        {discount.mode}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge variant={isActive(discount) ? 'default' : 'secondary'}>
                        {isActive(discount) ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {showActions && (
                      <td className="px-4 py-3 text-right align-middle">
                        {(isPanel || panelLook) ? (
                          // In panel mode, show a chevron icon
                          <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
                        ) : (
                          // In standalone mode, show the dropdown menu
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="cursor-pointer h-8 w-8" 
                                aria-label="Adjustment actions" 
                                title="Adjustment actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(discount);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit adjustment
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteDialog(discount);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete adjustment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isPanel && totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-4 flex-shrink-0">
            <div className="text-sm text-muted-foreground text-nowrap">
              {startIndex + 1} to {Math.min(endIndex, processedData.length)} of {processedData.length}
            </div>

            <Pagination>
              <PaginationContent className="ml-auto">
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {getPageNumbers().map((page, index) => (
                  <PaginationItem key={index}>
                    {page === 'ellipsis' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
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

      {/* Edit Discount Sheet (only in panel mode) */}
      {isPanel && (
        <DiscountEditSheet
          isOpen={editSheetOpen}
          onClose={() => {
            setEditSheetOpen(false);
            setEditingDiscount(null);
          }}
          discount={editingDiscount}
          onSuccess={(savedDiscount) => {
            // Update the discount in the list
            setDiscounts(prev => prev.map(d => 
              d._id === savedDiscount._id ? savedDiscount : d
            ));
            // Refresh the discounts list
            fetchDiscounts();
          }}
        />
      )}
    </div>
  );
}
