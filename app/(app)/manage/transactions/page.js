'use client'
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  CreditCard, 
  Banknote, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  Mail
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResendReceiptDialog } from "@/components/resend-receipt-dialog";
import { toast } from 'sonner';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    paymentMethod: 'all',
    dateRange: '24'
  });
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [resendReceiptDialog, setResendReceiptDialog] = useState({ open: false, transaction: null });

  // Fetch transactions when filters change
  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.paymentMethod !== 'all') params.append('paymentMethod', filters.paymentMethod);
      if (filters.dateRange) params.append('hours', filters.dateRange);

      const response = await fetch(`/api/transactions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      paymentMethod: 'all',
      dateRange: '24'
    });
    setSearchQuery('');
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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
    let filtered = transactions;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item._id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customer?.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue, bValue;
        
        switch(sortConfig.key) {
          case 'createdAt':
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
          case 'customer':
            aValue = a.customer?.name || 'Walk-in';
            bValue = b.customer?.name || 'Walk-in';
            break;
          case 'total':
            aValue = a.total;
            bValue = b.total;
            break;
          case 'paymentMethod':
            aValue = a.paymentMethod;
            bValue = b.paymentMethod;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          default:
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [transactions, searchQuery, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = processedData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, itemsPerPage]);

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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-secondary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'succeeded': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
  };

  const getInitials = (name) => {
    if (!name) return 'UN';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  return (
    <div className="px-4 pt-2 w-full h-full flex flex-col py-4">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-semibold mb-1">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all transactions
        </p>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last hour</SelectItem>
              <SelectItem value="2">Last 2 hours</SelectItem>
              <SelectItem value="24">Last 24 hours</SelectItem>
              <SelectItem value="48">Last 48 hours</SelectItem>
              <SelectItem value="168">Last 7 days</SelectItem>
              <SelectItem value="720">Last 30 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          <Button variant="outline" onClick={clearFilters} className="cursor-pointer">
            Clear
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
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center">
                    Date & Time
                    {getSortIcon('createdAt')}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('customer')}
                >
                  <div className="flex items-center">
                    Customer
                    {getSortIcon('customer')}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center">
                    Total
                    {getSortIcon('total')}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('paymentMethod')}
                >
                  <div className="flex items-center">
                    Payment
                    {getSortIcon('paymentMethod')}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Discount
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Location
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Empl.
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading && transactions.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={9} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">Loading transactions...</p>
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={9} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">No transactions found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                currentData.map((transaction) => (
                  <tr 
                    key={transaction._id} 
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={(e) => {
                      // Don't navigate if clicking on the dropdown menu button or its content
                      if (!e.target.closest('[role="button"]') && !e.target.closest('[role="menu"]')) {
                        router.push(`/manage/transactions/${transaction._id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3 align-middle">
                      <div>
                        <div className="font-medium">
                          {dayjs(transaction.createdAt).format('MMM DD, YYYY')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {dayjs(transaction.createdAt).format('h:mm A')}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {transaction.customer ? transaction.customer.name : 'Walk-in'}
                    </td>
                    <td className="px-4 py-3 align-middle font-medium">
                      {formatCurrency(transaction.total)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(transaction.paymentMethod)}
                        <span className="capitalize">{transaction.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge variant={getStatusBadgeVariant(transaction.status)} className="capitalize">
                        {transaction.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {transaction.adjustments?.discounts?.total > 0 ? (
                        <div>
                          <div className="text-sm">{transaction.adjustments.discounts.items[0]?.name || 'Discount'}</div>
                          <div className="text-sm text-muted-foreground">
                            -{formatCurrency(transaction.adjustments.discounts.total)}
                          </div>
                        </div>
                      ) : (
                        <></>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {transaction.location?.name || '-'}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-secondary text-xs">
                          {getInitials(transaction.employee?.name)}
                        </AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => router.push(`/manage/transactions/${transaction._id}`)}
                          >
                            View details
                          </DropdownMenuItem>
                          {transaction.customer?.email ? (
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={async (e) => {
                                e.stopPropagation();
                                // Directly send the receipt without dialog
                                try {
                                  const response = await fetch('/api/send-receipt', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      email: transaction.customer.email,
                                      transactionId: transaction._id
                                    })
                                  });
                                  
                                  if (response.ok) {
                                    toast.success('Send sent', {
                                      description: `Receipt has been sent to ${transaction.customer.email}`
                                    });
                                  } else {
                                    const data = await response.json();
                                    toast.error('Failed to send receipt', {
                                      description: data.error || 'An error occurred'
                                    });
                                  }
                                } catch (error) {
                                  console.error('Error sending receipt:', error);
                                  toast.error('Failed to send receipt');
                                }
                              }}
                            >
                              Send receipt
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setResendReceiptDialog({ open: true, transaction });
                              }}
                            >
                              Send receipt
                            </DropdownMenuItem>
                          )}
                          {transaction.status === 'succeeded' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="cursor-pointer">
                                Refund transaction
                              </DropdownMenuItem>
                            </>
                          )}
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
            {processedData.length > 0 
              ? `Showing ${startIndex + 1} to ${Math.min(endIndex, processedData.length)} of ${processedData.length} transactions`
              : 'No transactions to display'
            }
          </div>

          {totalPages > 1 && (
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
          )}
        </div>
      </div>
      
      {/* Resend Receipt Dialog - only for transactions without email */}
      <ResendReceiptDialog
        open={resendReceiptDialog.open}
        onOpenChange={(open) => setResendReceiptDialog({ open, transaction: open ? resendReceiptDialog.transaction : null })}
        transaction={resendReceiptDialog.transaction}
      />
    </div>
  );
}