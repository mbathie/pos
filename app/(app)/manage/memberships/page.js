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
import { Search, ChevronsUpDown, ChevronRight, User, Mail, Phone, IdCard, CreditCard, Calendar, DollarSign } from "lucide-react";
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
  const [sort, setSort] = useState({
    field: 'nextBillingDate',
    direction: 'asc', // Show next to bill first
  });

  // Fetch memberships when search, page, status, or sort changes
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchMemberships();
    }, searchQuery ? 300 : 0); // Debounce search by 300ms

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, currentPage, statusFilter, sort]);

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

  const handleSort = (field) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1); // Reset to first page when sorting
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

  const SortableHeader = ({ field, children, className = "" }) => (
    <TableHead 
      className={`cursor-pointer bg-muted hover:bg-muted/80 ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ChevronsUpDown className="size-4" />
      </div>
    </TableHead>
  );

  return (
    <div className="px-4 h-[calc(100vh-65px)] flex flex-col">
      <TypographyLarge>Memberships</TypographyLarge>
      
      {/* Search, Filters and Stats */}
      <div className="flex gap-2 items-center mb-4 flex-shrink-0">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
            <Input
              placeholder="Search by name, email, phone, or membership..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        {/* Status Filter Buttons */}
        <div className="flex gap-2">
          <Button 
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter('active');
              setCurrentPage(1);
            }}
          >
            Active
          </Button>
          <Button 
            variant={statusFilter === 'canceled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter('canceled');
              setCurrentPage(1);
            }}
          >
            Canceled
          </Button>
          <Button 
            variant={statusFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setCurrentPage(1);
            }}
          >
            All
          </Button>
        </div>
        
        {searchQuery && (
          <Button variant="outline" onClick={clearSearch}>
            Clear
          </Button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="secondary" className="text-sm">
            {loading ? 'Loading...' : `${totalMemberships} membership${totalMemberships !== 1 ? 's' : ''}`}
          </Badge>
          {totalMemberships > 0 && !loading && (
            <span className="text-sm text-muted-foreground">
              Showing {startIndex}-{endIndex}
            </span>
          )}
        </div>
      </div>

      {/* Table Card */}
      <Card className="p-0 m-0 flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 m-0 flex-1 flex flex-col overflow-hidden">
          {loading && memberships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex-1 flex items-center justify-center">
              Loading memberships...
            </div>
          ) : (
            <div className="flex-1 min-h-0 relative">
              <Table className="table-fixed w-full">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <SortableHeader field="customer.name" className="rounded-tl-lg w-1/4">
                      <User className="size-4 mr-1" />
                      Member
                    </SortableHeader>
                    <SortableHeader field="product.name" className="w-1/6">
                      <CreditCard className="size-4 mr-1" />
                      Membership
                    </SortableHeader>
                    <SortableHeader field="amount" className="w-1/8">
                      <DollarSign className="size-4 mr-1" />
                      Value
                    </SortableHeader>
                    <SortableHeader field="nextBillingDate" className="w-1/6">
                      <Calendar className="size-4 mr-1" />
                      Next Billing
                    </SortableHeader>
                    <SortableHeader field="subscriptionStartDate" className="w-1/6">
                      Started
                    </SortableHeader>
                    <TableHead className="bg-muted w-1/8">
                      Status
                    </TableHead>
                    <TableHead className="bg-muted rounded-tr-lg w-16">
                      
                    </TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              
              <div className="absolute inset-0 top-12 overflow-y-auto">
                <Table className="table-fixed w-full">
                  <TableBody>
                    {memberships.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? 'No memberships found matching your search.' : 'No memberships found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      memberships.map((membership) => (
                        <TableRow 
                          key={membership._id} 
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => router.push(`/manage/customers/${membership.customer?._id}`)}
                        >
                          <TableCell className="align-top w-1/4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                                {getInitials(membership.customer?.name)}
                              </div>
                              <div className="flex flex-col">
                                <div className="font-medium">
                                  {membership.customer?.name || 'Unknown'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {membership.customer?.email || '-'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="align-top w-1/6">
                            <div className="flex flex-col">
                              <div className="text-sm font-medium">
                                {membership.product?.name || membership.transaction?.cart?.products?.[0]?.name || 'Membership'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {/* Get price name and unit from transaction cart */}
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
                          </TableCell>
                          
                          <TableCell className="w-1/8 align-top">
                            <div className="text-sm font-medium text-left ml-1">
                              {/* Get amount from transaction cart */}
                              {formatCurrency(
                                membership.transaction?.cart?.products?.[0]?.item?.price?.value || 
                                membership.transaction?.cart?.products?.[0]?.amount?.subtotal ||
                                membership.amount
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell className="align-top w-1/6">
                            <div className="flex flex-col text-sm">
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
                          </TableCell>
                          
                          <TableCell className="w-1/6">
                            <div className="flex flex-col text-sm">
                              <div>
                                {dayjs(membership.subscriptionStartDate).format('DD/MM/YYYY')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {dayjs(membership.subscriptionStartDate).fromNow()}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="w-1/8">
                            <Badge variant={getStatusBadgeVariant(membership.status)}>
                              {membership.status}
                            </Badge>
                          </TableCell>
                          
                          <TableCell className="w-16">
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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