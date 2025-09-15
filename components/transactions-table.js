'use client'
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { CreditCard, Banknote, MoreHorizontal } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function TransactionsTable({ 
  customerId = null, 
  showFilters = true,
  className = "",
  data = null,
  loading: externalLoading = false
}) {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Use external data if provided, otherwise fetch internally
  const finalTransactions = data || transactions;
  const finalLoading = data ? externalLoading : loading;

  // Calculate pagination
  const totalPages = Math.ceil(finalTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = finalTransactions.slice(startIndex, endIndex);

  // Fetch transactions on component mount (only if no external data provided)
  useEffect(() => {
    if (!data) {
      fetchTransactions();
    }
  }, [customerId, data]);

  // Reset to first page when transactions change
  useEffect(() => {
    setCurrentPage(1);
  }, [finalTransactions.length]);

  const fetchTransactions = async () => {
    if (data) return; // Don't fetch if external data is provided
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // If customerId is provided, filter by customer
      if (customerId) {
        params.append('customerId', customerId);
      }

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

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'succeeded':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
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
    <div className={`flex flex-col ${className}`}>
      {/* Table Container - Scrollable with proper structure */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="rounded-md border flex-1 overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
              <tr className="border-b bg-muted/50 hover:bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Date & Time
                </th>
                {!customerId && (
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Customer
                  </th>
                )}
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Total
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Payment
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Status
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
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {finalLoading && finalTransactions.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={customerId ? 8 : 9} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">Loading transactions...</p>
                  </td>
                </tr>
              ) : finalTransactions.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={customerId ? 8 : 9} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">
                      {customerId 
                        ? "No transactions found for this customer." 
                        : "No transactions found."
                      }
                    </p>
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={customerId ? 8 : 9} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">No transactions found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <tr 
                    key={transaction._id} 
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={(e) => {
                      // Don't navigate if clicking on the dropdown menu
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
                    
                    {!customerId && (
                      <td className="px-4 py-3 align-middle">
                        {transaction.customer ? transaction.customer.name : 'Walk-in'}
                      </td>
                    )}
                    
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
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/manage/transactions/${transaction._id}`);
                            }}
                          >
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle send receipt
                            }}
                          >
                            Send receipt
                          </DropdownMenuItem>
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
      </div>

      {/* Pagination - Outside the table container */}
      {finalTransactions.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-4 gap-4">
          <div className="text-sm text-muted-foreground text-nowrap">
            Showing {startIndex + 1} to {Math.min(endIndex, finalTransactions.length)} of {finalTransactions.length} transactions
          </div>

          <Pagination>
            <PaginationContent>
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
  );
}