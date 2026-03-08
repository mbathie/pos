'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, Loader2 } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import PrepaidPassDetailSheet from '@/components/prepaid-pass-detail-sheet'

dayjs.extend(relativeTime)

const ITEMS_PER_PAGE = 25

export default function PrepaidPassesPage() {
  const [passes, setPasses] = useState([])
  const [totalPasses, setTotalPasses] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' })
  const [selectedPass, setSelectedPass] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchPasses()
    }, searchQuery ? 300 : 0)
    return () => clearTimeout(delay)
  }, [searchQuery, currentPage, statusFilter, sortConfig])

  const fetchPasses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      params.append('page', currentPage.toString())
      params.append('limit', ITEMS_PER_PAGE.toString())
      params.append('sortField', sortConfig.key)
      params.append('sortDirection', sortConfig.direction)

      const res = await fetch(`/api/prepaid-passes?${params}`)
      if (res.ok) {
        const data = await res.json()
        let filtered = data.passes || []

        // Client-side sort for populated fields
        const clientSortFields = ['customer.name', 'pack.name']
        if (clientSortFields.includes(sortConfig.key)) {
          filtered = [...filtered].sort((a, b) => {
            const getVal = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj) || ''
            const va = getVal(a, sortConfig.key).toLowerCase()
            const vb = getVal(b, sortConfig.key).toLowerCase()
            if (va < vb) return sortConfig.direction === 'asc' ? -1 : 1
            if (va > vb) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
          })
        }

        setPasses(filtered)
        setTotalPasses(data.pagination?.total || 0)
      } else {
        setPasses([])
        setTotalPasses(0)
      }
    } catch (error) {
      console.error('Error fetching passes:', error)
      setPasses([])
      setTotalPasses(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
    setCurrentPage(1)
  }

  const handleHeaderKey = (e, key) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSort(key)
    }
  }

  const getSortIcon = (column) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />
  }

  const getInitials = (name) => {
    if (!name) return 'UN'
    return name.split(' ').map(w => w.charAt(0).toUpperCase()).join('').slice(0, 2)
  }

  const totalPages = Math.ceil(totalPasses / ITEMS_PER_PAGE)

  const getPageNumbers = () => {
    const pages = []
    const max = 5
    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      const start = Math.max(1, currentPage - 2)
      const end = Math.min(totalPages, start + max - 1)
      for (let i = start; i <= end; i++) pages.push(i)
    }
    return pages
  }

  return (
    <div className="mr-auto px-4 pt-2 w-full h-full flex flex-col py-4">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-semibold mb-1">Prepaid Passes</h1>
        <p className="text-sm text-muted-foreground">View and manage all customer prepaid passes</p>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, email, or code..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="depleted">Depleted</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="secondary" className="text-sm">
              {loading ? 'Loading...' : `${totalPasses} pass${totalPasses !== 1 ? 'es' : ''}`}
            </Badge>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="rounded-md border flex-1 overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
              <tr className="border-b bg-muted/50 hover:bg-muted/50">
                <th
                  scope="col"
                  aria-sort={sortConfig.key === 'customer.name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('customer.name')}
                  onKeyDown={(e) => handleHeaderKey(e, 'customer.name')}
                >
                  <div className="flex items-center">Customer{getSortIcon('customer.name')}</div>
                </th>
                <th
                  scope="col"
                  aria-sort={sortConfig.key === 'pack.name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('pack.name')}
                  onKeyDown={(e) => handleHeaderKey(e, 'pack.name')}
                >
                  <div className="flex items-center">Pack{getSortIcon('pack.name')}</div>
                </th>
                <th
                  scope="col"
                  aria-sort={sortConfig.key === 'remainingPasses' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('remainingPasses')}
                  onKeyDown={(e) => handleHeaderKey(e, 'remainingPasses')}
                >
                  <div className="flex items-center">Remaining{getSortIcon('remainingPasses')}</div>
                </th>
                <th scope="col" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Status
                </th>
                <th
                  scope="col"
                  aria-sort={sortConfig.key === 'createdAt' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  tabIndex={0}
                  onClick={() => handleSort('createdAt')}
                  onKeyDown={(e) => handleHeaderKey(e, 'createdAt')}
                >
                  <div className="flex items-center">Created{getSortIcon('createdAt')}</div>
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading && passes.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={5} className="p-4 text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : passes.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={5} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No passes found matching your search' : 'No prepaid passes found'}
                    </p>
                  </td>
                </tr>
              ) : (
                passes.map((pass) => (
                  <tr
                    key={pass._id}
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => { setSelectedPass(pass); setSheetOpen(true) }}
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          {pass.customer?.photo ? (
                            <AvatarImage src={pass.customer.photo} alt={pass.customer.name} />
                          ) : (
                            <AvatarFallback className="bg-primary/10">
                              {getInitials(pass.customer?.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <div className="font-medium">{pass.customer?.name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{pass.customer?.email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="font-medium">{pass.pack?.name || 'Unknown'}</div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="font-medium">{pass.remainingPasses}</span>
                      <span className="text-muted-foreground"> / {pass.totalPasses}</span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge variant={pass.status === 'active' ? 'default' : pass.status === 'expired' ? 'destructive' : 'secondary'}>
                        {pass.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        <div>{dayjs(pass.createdAt).format('DD/MM/YYYY')}</div>
                        <div className="text-xs text-muted-foreground">{dayjs(pass.createdAt).fromNow()}</div>
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
                  onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1) }}
                  className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {getPageNumbers().map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => { e.preventDefault(); setCurrentPage(p) }}
                    isActive={currentPage === p}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem><PaginationEllipsis /></PaginationItem>
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1) }}
                  className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Detail Sheet */}
      <PrepaidPassDetailSheet pass={selectedPass} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}
