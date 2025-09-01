'use client'
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, MoreHorizontal, User, CreditCard, Calendar, DollarSign } from "lucide-react";
import { TypographyLarge } from '@/components/ui/typography';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const ITEMS_PER_PAGE = 25;

export default function MembershipsPage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState([]);
  const [totalMemberships, setTotalMemberships] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('active'); // Default to active memberships
  const [sortConfig, setSortConfig] = useState({
    key: 'nextBillingDate',
    direction: 'asc', // Show next to bill first
  });

  // Fetch memberships when search, page, status, or sort changes
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchMemberships();
    }, searchQuery ? 300 : 0); // Debounce search by 300ms

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, currentPage, statusFilter, sortConfig]);

  const fetchMemberships = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        // For now, we'll need to implement search on the backend
        // params.append('search', searchQuery.trim());
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      // Note: We'll need to update the API to support sorting
      // params.append('sortField', sort.field);
      // params.append('sortDirection', sort.direction);

      const response = await fetch(`/api/memberships?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Filter on client side for search until backend supports it
        let filteredMemberships = data.memberships || [];
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filteredMemberships = filteredMemberships.filter(membership => 
            membership.customer?.name?.toLowerCase().includes(query) ||
            membership.customer?.email?.toLowerCase().includes(query) ||
            membership.customer?.phone?.includes(query) ||
            membership.product?.name?.toLowerCase().includes(query)
          );
        }
        setMemberships(filteredMemberships);
        setTotalMemberships(data.pagination?.total || 0);
      } else {
        console.error('Failed to fetch memberships');
        setMemberships([]);
        setTotalMemberships(0);
      }
    } catch (error) {
      console.error('Error fetching memberships:', error);
      setMemberships([]);
      setTotalMemberships(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (column) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const clearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const getInitials = (name) => {
    if (!name) return 'UN';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    // Format phone number as (xxx) xxx-xxxx
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount); // Amount is already in dollars
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'canceled':
        return 'secondary';
      case 'past_due':
        return 'destructive';
      case 'trialing':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalMemberships / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalMemberships);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };


  return (
    <div className="container mr-auto px-4 pt-2 w-full h-full flex flex-col py-4">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-semibold mb-1">Memberships Management</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all customer memberships
        </p>
      </div>
      
      {/* Controls */}
      <div className="flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search memberships..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Status Filter */}
          <Select value={statusFilter || 'all'} onValueChange={(value) => {
            setStatusFilter(value === 'all' ? '' : value);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>

          {/* Results count */}
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="secondary" className="text-sm">
              {loading ? 'Loading...' : `${totalMemberships} membership${totalMemberships !== 1 ? 's' : ''}`}
            </Badge>
          </div>
        </div>
      </div>

      {/* Table Container - Scrollable */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Table */}
        <div className="rounded-md border flex-1 overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
              <tr className="border-b bg-muted/50 hover:bg-muted/50">
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('customer.name')}
                >
                  <div className="flex items-center">
                    Member
                    {getSortIcon('customer.name')}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('product.name')}
                >
                  <div className="flex items-center">
                    Membership
                    {getSortIcon('product.name')}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center">
                    Value
                    {getSortIcon('amount')}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('nextBillingDate')}
                >
                  <div className="flex items-center">
                    Next Billing
                    {getSortIcon('nextBillingDate')}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('subscriptionStartDate')}
                >
                  <div className="flex items-center">
                    Started
                    {getSortIcon('subscriptionStartDate')}
                  </div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Status
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading && memberships.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={7} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">Loading memberships...</p>
                  </td>
                </tr>
              ) : memberships.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={7} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No memberships found matching your criteria' : 'No memberships found'}
                    </p>
                  </td>
                </tr>
              ) : (
                memberships.map((membership) => (
                  <tr 
                    key={membership._id} 
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={(e) => {
                      // Don't navigate if clicking on actions menu
                      if (!e.target.closest('[data-actions]')) {
                        router.push(`/manage/customers/${membership.customer?._id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
                          {getInitials(membership.dependent?.name || membership.customer?.name)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="font-medium">
                            {membership.dependent?.name || membership.customer?.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {membership.customer?.email || '-'}
                          </div>
                          {membership.customer?.phone && (
                            <div className="text-xs text-muted-foreground">
                              {formatPhone(membership.customer?.phone)}
                            </div>
                          )}
                          {membership.dependent && (
                            <div className="text-xs text-muted-foreground">
                              Guardian: {membership.customer?.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        <div className="font-medium">
                          {membership.product?.name || membership.transaction?.cart?.products?.[0]?.name || 'Membership'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const item = membership.transaction?.cart?.products?.[0]?.item;
                            const priceName = item?.price?.name || membership.priceName;
                            const unit = item?.unit || membership.unit;
                            return (
                              <>
                                {priceName ? `${priceName} • ` : ''}
                                {unit === 'month' ? 'Monthly' : unit === 'year' ? 'Annually' : unit}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-middle">
                      <div className="font-medium">
                        {formatCurrency(
                          membership.transaction?.cart?.products?.[0]?.item?.price?.value || 
                          membership.transaction?.cart?.products?.[0]?.amount?.subtotal ||
                          membership.amount
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        <div>
                          {membership.nextBillingDate 
                            ? dayjs(membership.nextBillingDate).format('DD/MM/YYYY')
                            : '-'
                          }
                        </div>
                        {membership.nextBillingDate && (
                          <div className="text-xs text-muted-foreground">
                            {dayjs(membership.nextBillingDate).fromNow()}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        <div>
                          {dayjs(membership.subscriptionStartDate).format('DD/MM/YYYY')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dayjs(membership.subscriptionStartDate).fromNow()}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-middle">
                      <Badge variant={getStatusBadgeVariant(membership.status)}>
                        {membership.status}
                      </Badge>
                    </td>
                    
                    <td className="px-4 py-3 text-right align-middle" data-actions>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => router.push(`/manage/customers/${membership.customer?._id}`)}
                            className="cursor-pointer"
                          >
                            View Customer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="cursor-pointer">
                            View Details
                          </DropdownMenuItem>
                          {membership.status === 'active' && (
                            <DropdownMenuItem className="cursor-pointer">
                              Cancel Membership
                            </DropdownMenuItem>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center flex-shrink-0">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {getPageNumbers().map((page) => (
                <PaginationItem key={page}>
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
                </PaginationItem>
              ))}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                  }}
                  className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}