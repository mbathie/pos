'use client'
import React, { useState, useMemo } from 'react';
// Removed unused Card and Table component imports
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Download, Filter, MoreHorizontal, Package, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Sample data - using deterministic values to avoid hydration mismatch
const generateSampleData = () => {
  const statuses = ['active', 'pending', 'completed', 'cancelled'];
  const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Sports'];
  
  // Simple pseudo-random number generator with seed
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  return Array.from({ length: 150 }, (_, i) => {
    // Add longer content for some rows to demonstrate wrapping
    const shouldWrap = i % 5 === 0 || i % 7 === 0;
    const hasAvatar = i % 3 === 0; // Every 3rd customer has an avatar
    const hasIcon = i % 4 === 0; // Every 4th product has an icon
    
    const customerName = shouldWrap && i % 5 === 0 
      ? `Customer ${i + 1} `
      : `Customer ${i + 1}`;
    const productName = shouldWrap && i % 7 === 0
      ? `Product ${String.fromCharCode(65 + (i % 26))}${i % 10}`
      : `Product ${String.fromCharCode(65 + (i % 26))}${i % 10}`;
    
    return {
      id: `ORD-${String(i + 1).padStart(4, '0')}`,
      customer: customerName,
      product: productName,
      category: categories[i % categories.length],
      amount: Math.floor(seededRandom(i * 2) * 10000) / 100,
      quantity: Math.floor(seededRandom(i * 3) * 20) + 1,
      status: statuses[i % statuses.length],
      date: new Date(Date.now() - Math.floor(seededRandom(i * 4) * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      hasAvatar: hasAvatar,
      avatarUrl: hasAvatar && i % 6 === 0 ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}` : null,
      hasIcon: hasIcon,
    };
  });
};

export default function SampleTablePage() {
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Initialize data only on client side to avoid hydration issues
  React.useEffect(() => {
    setData(generateSampleData());
  }, []);

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleHeaderKey = (e, key) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(key);
    }
  };

  // Get sort icon
  const getSortIcon = (column) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchQuery, statusFilter, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = processedData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, itemsPerPage]);

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

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-7xl h-screen flex flex-col py-4">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-semibold mb-1">Orders Management</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all customer orders with advanced filtering and sorting
        </p>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Items per page */}
            <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Button */}
            <Button variant="outline" className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
        </div>
      </div>

      {/* Table Container - Scrollable */}
      <div className="flex-1 flex flex-col min-h-0 top-0 relative">
        {/* Table */}
        <div className="rounded-md border flex-1 overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
              <tr className="border-b bg-muted/50 hover:bg-muted/50">
                <th 
                  scope="col"
                  aria-sort={sortConfig.key==='id' ? (sortConfig.direction==='asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('id')}
                  onKeyDown={(e) => handleHeaderKey(e, 'id')}
                >
                  <div className="flex items-center">
                    Order ID
                    {getSortIcon('id')}
                  </div>
                </th>
                <th 
                  scope="col"
                  aria-sort={sortConfig.key==='customer' ? (sortConfig.direction==='asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('customer')}
                  onKeyDown={(e) => handleHeaderKey(e, 'customer')}
                >
                  <div className="flex items-center">
                    Customer
                    {getSortIcon('customer')}
                  </div>
                </th>
                <th 
                  scope="col"
                  aria-sort={sortConfig.key==='product' ? (sortConfig.direction==='asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('product')}
                  onKeyDown={(e) => handleHeaderKey(e, 'product')}
                >
                  <div className="flex items-center">
                    Product
                    {getSortIcon('product')}
                  </div>
                </th>
                <th 
                  scope="col"
                  aria-sort={sortConfig.key==='category' ? (sortConfig.direction==='asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('category')}
                  onKeyDown={(e) => handleHeaderKey(e, 'category')}
                >
                  <div className="flex items-center">
                    Category
                    {getSortIcon('category')}
                  </div>
                </th>
                <th 
                  scope="col"
                  aria-sort={sortConfig.key==='quantity' ? (sortConfig.direction==='asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('quantity')}
                  onKeyDown={(e) => handleHeaderKey(e, 'quantity')}
                >
                  <div className="flex items-center">
                    Qty
                    {getSortIcon('quantity')}
                  </div>
                </th>
                <th 
                  scope="col"
                  aria-sort={sortConfig.key==='amount' ? (sortConfig.direction==='asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('amount')}
                  onKeyDown={(e) => handleHeaderKey(e, 'amount')}
                >
                  <div className="flex items-center">
                    Amount
                    {getSortIcon('amount')}
                  </div>
                </th>
                <th 
                  scope="col"
                  aria-sort={sortConfig.key==='date' ? (sortConfig.direction==='asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('date')}
                  onKeyDown={(e) => handleHeaderKey(e, 'date')}
                >
                  <div className="flex items-center">
                    Date
                    {getSortIcon('date')}
                  </div>
                </th>
                <th 
                  scope="col"
                  aria-sort={sortConfig.key==='status' ? (sortConfig.direction==='asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('status')}
                  onKeyDown={(e) => handleHeaderKey(e, 'status')}
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
                <th scope="col" className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
                {data.length === 0 ? (
                  <tr className="border-b">
                    <td colSpan={9} className="p-4 text-center py-8">
                      <p className="text-muted-foreground">Loading data...</p>
                    </td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr className="border-b">
                    <td colSpan={9} className="p-4 text-center py-8">
                      <p className="text-muted-foreground">No orders found matching your criteria</p>
                    </td>
                  </tr>
                ) : (
                  currentData.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium align-middle">
                        <div className="flex items-center gap-2">
                          {item.hasAvatar ? (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              {item.avatarUrl ? (
                                <AvatarImage src={item.avatarUrl} alt={item.customer} />
                              ) : (
                                <AvatarFallback className="bg-primary/10">
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              )}
                            </Avatar>
                          ) : item.hasIcon ? (
                            <div className="h-8 w-8 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 flex-shrink-0"></div>
                          )}
                          <span className="font-medium">{item.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="max-w-xs">
                          <span className="break-words">{item.customer}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="max-w-xs">
                          <span className="break-words">{item.product}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">{item.category}</td>
                      <td className="px-4 py-3 align-middle">{item.quantity}</td>
                      <td className="px-4 py-3 align-middle">${item.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 align-middle">{item.date}</td>
                      <td className="px-4 py-3 align-middle">
                        <Badge variant={getStatusBadgeVariant(item.status)} className="capitalize">
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer h-8 w-8" aria-label="Row actions" title="Row actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">View details</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Edit order</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Download invoice</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">
                              Cancel order
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

        {/* Pagination and Info - Fixed at bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-4 flex-shrink-0">
            <div className="text-sm text-muted-foreground text-nowrap">
              {startIndex + 1} to {Math.min(endIndex, processedData.length)}
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
      </div>
    </div>
  );
}
