'use client'
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { useGlobals } from '@/lib/globals';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, Building2 } from "lucide-react";
import { AddCompanyDialog } from '@/components/add-company-dialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const ITEMS_PER_PAGE = 25;

export default function CompaniesPage() {
  const router = useRouter();
  const { employee } = useGlobals();
  const [companies, setCompanies] = useState([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'asc',
  });

  // Fetch companies when search, page, or sort changes
  useEffect(() => {
    if (!employee?._id) {
      return;
    }

    const delayedSearch = setTimeout(() => {
      fetchCompanies();
    }, searchQuery ? 300 : 0);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, currentPage, sortConfig, employee?._id]);

  const fetchCompanies = async () => {
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

      const response = await fetch(`/api/companies?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
        setTotalCompanies(data.total || 0);
      } else if (response.status === 401) {
        console.log('User not authenticated, layout will handle redirect');
        return;
      } else {
        console.error('Failed to fetch companies:', response.status, response.statusText);
        setCompanies([]);
        setTotalCompanies(0);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
      setTotalCompanies(0);
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

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleCompanyAdded = () => {
    fetchCompanies(); // Refresh list
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalCompanies / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalCompanies);

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
    <div className="mr-auto px-4 pt-2 w-full h-full flex flex-col py-4">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-semibold mb-1">Companies</h1>
        <p className="text-sm text-muted-foreground">
          Manage companies and organizations for group purchases
        </p>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Add button */}
          <div className="flex items-center gap-2 ml-auto">
            <AddCompanyDialog onCompanyAdded={handleCompanyAdded} />
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
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12"></th>
                <th
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Company Name
                    {getSortIcon('name')}
                  </div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  ABN
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Contact Name
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Contact Email
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Contact Phone
                </th>
                <th
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center">
                    Created
                    {getSortIcon('createdAt')}
                  </div>
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading && companies.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Loading companies...
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {searchQuery ? 'No companies found matching your search' : 'No companies yet. Add your first company to get started.'}
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr
                    key={company._id}
                    className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/manage/companies/${company._id}`)}
                  >
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center justify-center">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle font-medium">{company.name}</td>
                    <td className="px-4 py-4 align-middle text-muted-foreground">{company.abn || '-'}</td>
                    <td className="px-4 py-4 align-middle">{company.contactName}</td>
                    <td className="px-4 py-4 align-middle text-muted-foreground">{company.contactEmail}</td>
                    <td className="px-4 py-4 align-middle text-muted-foreground">{company.contactPhone || '-'}</td>
                    <td className="px-4 py-4 align-middle text-muted-foreground">
                      {dayjs(company.createdAt).fromNow()}
                    </td>
                    <td className="px-4 py-4 align-middle text-right">
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
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex} to {endIndex} of {totalCompanies} companies
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {getPageNumbers().map((pageNum) => (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => setCurrentPage(pageNum)}
                    isActive={currentPage === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
