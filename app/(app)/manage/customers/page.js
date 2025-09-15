'use client'
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { useGlobals } from '@/lib/globals';
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
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, User, Mail, Phone, IdCard, Check, CreditCard, MoreHorizontal, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CustomerAvatar } from '@/components/customer-avatar';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const ITEMS_PER_PAGE = 25;

export default function CustomersPage() {
  const router = useRouter();
  const { employee } = useGlobals();
  const [customers, setCustomers] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc', // 'asc' or 'desc'
  });

  // Fetch customers when search, page, or sort changes
  useEffect(() => {
    // Don't fetch if user is not authenticated
    if (!employee?._id) {
      return;
    }

    const delayedSearch = setTimeout(() => {
      fetchCustomers();
    }, searchQuery ? 300 : 0); // Debounce search by 300ms

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, currentPage, sortConfig, employee?._id]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      params.append('sortField', sortConfig.key);
      params.append('sortDirection', sortConfig.direction);

      const response = await fetch(`/api/customers?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
        setTotalCustomers(data.total || 0);
      } else if (response.status === 401) {
        // User is not authenticated, let the layout handle the redirect
        console.log('User not authenticated, layout will handle redirect');
        return;
      } else {
        console.error('Failed to fetch customers:', response.status, response.statusText);
        setCustomers([]);
        setTotalCustomers(0);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
      setTotalCustomers(0);
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

  const formatPhone = (phone) => {
    if (!phone) return '';
    // Format phone number as (xxx) xxx-xxxx
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalCustomers / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalCustomers);

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


  // Show loading while authentication is being checked
  if (!employee?._id) {
    return (
      <div className="h-[calc(100vh-65px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mr-auto px-4 pt-2 w-full h-full flex flex-col py-4">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-semibold mb-1">Customers Management</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all customers
        </p>
      </div>
      
      {/* Controls */}
      <div className="flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Results count */}
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="secondary" className="text-sm">
              {loading ? 'Loading...' : `${totalCustomers} customer${totalCustomers !== 1 ? 's' : ''}`}
            </Badge>
          </div>
        </div>
      </div>

      {/* Table Container - Scrollable */}
      <div className="flex-1 flex flex-col relative">
        {/* Table */}
        <div className="rounded-md border flex-1 overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
              <tr className="border-b bg-muted/50 hover:bg-muted/50">
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Name
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center">
                    Contact
                    {getSortIcon('email')}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('memberId')}
                >
                  <div className="flex items-center">
                    Member ID
                    {getSortIcon('memberId')}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('dependents')}
                >
                  <div className="flex items-center">
                    Dependents
                    {getSortIcon('dependents')}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center">
                    Account
                    {getSortIcon('createdAt')}
                  </div>
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading && customers.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={6} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">Loading customers...</p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={6} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No customers found matching your criteria' : 'No customers found'}
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr 
                    key={customer._id} 
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={(e) => {
                      // Don't navigate if clicking on actions menu
                      if (!e.target.closest('[data-actions]')) {
                        router.push(`/manage/customers/${customer._id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <CustomerAvatar customer={customer} size="sm" />
                        <div className="flex flex-col min-w-0">
                          <div className="font-medium">
                            {customer.name || 'Unnamed Customer'}
                          </div>
                          {customer.waiver?.agree && (
                            <Badge variant="outline" className="text-xs w-fit text-primary border-primary">
                              <Check className="size-3"/> Waiver
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        {customer.email && (
                          <div>
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="text-sm text-muted-foreground">
                            {formatPhone(customer.phone)}
                          </div>
                        )}
                        {!customer.email && !customer.phone && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-middle">
                      <div className="font-mono">
                        {customer.memberId || '-'}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {customer.dependents?.length || 0}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        <div>
                          {dayjs(customer.createdAt).format('DD/MM/YYYY')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dayjs(customer.createdAt).fromNow()}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 text-right align-middle">
                      <div className="flex items-center justify-end gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
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