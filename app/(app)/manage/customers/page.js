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
import { Search, ChevronsUpDown, ChevronRight, User, Mail, Phone, IdCard, Check } from "lucide-react";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const ITEMS_PER_PAGE = 25;

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState({
    field: 'createdAt',
    direction: 'desc', // 'asc' or 'desc'
  });

  // Fetch customers when search, page, or sort changes
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchCustomers();
    }, searchQuery ? 300 : 0); // Debounce search by 300ms

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, currentPage, sort]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      params.append('sortField', sort.field);
      params.append('sortDirection', sort.direction);

      const response = await fetch(`/api/customers?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
        setTotalCustomers(data.total || 0);
      } else {
        console.error('Failed to fetch customers');
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
    <div className="mx-4 h-[calc(100vh-65px)] flex flex-col">
      
      {/* Search and Stats */}
      <div className="flex gap-2 items-center mb-4 flex-shrink-0">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
            <Input
              placeholder="Search by name, email, phone, or member ID..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        {searchQuery && (
          <Button variant="outline" onClick={clearSearch}>
            Clear
          </Button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="secondary" className="text-sm">
            {loading ? 'Loading...' : `${totalCustomers} customer${totalCustomers !== 1 ? 's' : ''}`}
          </Badge>
          {totalCustomers > 0 && !loading && (
            <span className="text-sm text-muted-foreground">
              Showing {startIndex}-{endIndex}
            </span>
          )}
        </div>
      </div>

      {/* Table Card */}
      <Card className="p-0 m-0 flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 m-0 flex-1 flex flex-col overflow-hidden">
          {loading && customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex-1 flex items-center justify-center">
              Loading customers...
            </div>
          ) : (
            <div className="flex-1 min-h-0 relative">
              <Table className="table-fixed w-full">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <SortableHeader field="name" className="rounded-tl-lg w-1/4">
                      <User className="size-4 mr-1" />
                      Name
                    </SortableHeader>
                    <SortableHeader field="email" className="w-1/5">
                      <Mail className="size-4 mr-1" />
                      Email
                    </SortableHeader>
                    <SortableHeader field="phone" className="w-1/6">
                      <Phone className="size-4 mr-1" />
                      Phone
                    </SortableHeader>
                    <SortableHeader field="memberId" className="w-1/6">
                      <IdCard className="size-4 mr-1" />
                      Member ID
                    </SortableHeader>
                    <SortableHeader field="createdAt" className="w-1/5">
                      Joined
                    </SortableHeader>
                    <TableHead className="bg-muted rounded-tr-lg w-16">
                      
                    </TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              
              <div className="absolute inset-0 top-12 overflow-y-auto">
                <Table className="table-fixed w-full">
                  <TableBody>
                    {customers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? 'No customers found matching your search.' : 'No customers found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      customers.map((customer) => (
                        <TableRow 
                          key={customer._id} 
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => router.push(`/manage/customers/${customer._id}`)}
                        >
                          <TableCell className="align-top w-1/4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                                {getInitials(customer.name)}
                              </div>
                              <div className="flex flex-col">
                                <div className="font-medium">
                                  {customer.name || 'Unnamed Customer'}
                                </div>
                                {customer.waiver?.agree && (
                                  <Badge variant="outline" className="text-xs w-fit">
                                    <Check size={4}/> Waiver
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="align-top w-1/5">
                            <div className="text-sm">
                              {customer.email || '-'}
                            </div>
                          </TableCell>
                          
                          <TableCell className="w-1/6 align-top">
                            <div className="text-sm">
                              {formatPhone(customer.phone) || '-'}
                            </div>
                          </TableCell>
                          
                          <TableCell className="align-top w-1/6">
                            <div className="text-sm font-mono">
                              {customer.memberId || '-'}
                            </div>
                          </TableCell>
                          
                          <TableCell className="w-1/5">
                            <div className="flex flex-col text-sm">
                              <div>
                                {dayjs(customer.createdAt).format('DD/MM/YYYY')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {dayjs(customer.createdAt).fromNow()}
                              </div>
                            </div>
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