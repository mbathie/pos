'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Loader2, QrCode, Edit, Users, Clock, UserCircle, CheckCircle, Search, XCircle } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export default function CheckinsPage() {
  const router = useRouter()
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterMethod, setFilterMethod] = useState('all')
  const [filterDate, setFilterDate] = useState('today')
  const [filterSuccess, setFilterSuccess] = useState('success')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    totalToday: 0,
    qrCode: 0,
    manual: 0,
    classCheckins: 0,
    membershipCheckins: 0
  })
  const itemsPerPage = 100

  // Fetch checkins when filters change
  useEffect(() => {
    fetchCheckins()
  }, [filterDate, filterMethod, filterSuccess, currentPage, searchTerm])

  const fetchCheckins = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('dateFilter', filterDate)
      params.append('page', currentPage.toString())
      params.append('limit', itemsPerPage.toString())
      if (searchTerm) params.append('search', searchTerm)
      if (filterMethod !== 'all') params.append('method', filterMethod)
      if (filterSuccess !== 'all') params.append('success', filterSuccess)
      
      const res = await fetch(`/api/checkins?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        setCheckins(data.checkins || [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.totalCount || 0)
        setStats(data.stats || {
          totalToday: 0,
          qrCode: 0,
          manual: 0,
          classCheckins: 0,
          membershipCheckins: 0
        })
      } else {
        console.error('Failed to fetch checkins:', data.error)
      }
    } catch (error) {
      console.error('Error fetching checkins:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle search with debounce - reset to page 1 when searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const getMethodIcon = (method) => {
    switch (method) {
      case 'qr-code':
        return <QrCode className="size-4" />
      case 'manual':
        return <Edit className="size-4" />
      case 'staff':
        return <Users className="size-4" />
      default:
        return <Edit className="size-4" />
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'checked-in':
        return <CheckCircle className="size-4 text-primary" />
      case 'late':
        return <Clock className="size-4 text-yellow-500" />
      case 'early':
        return <Clock className="size-4 text-blue-500" />
      case 'no-show':
        return <Clock className="size-4 text-destructive" />
      default:
        return <CheckCircle className="size-4 text-primary" />
    }
  }

  const clearFilters = () => {
    setFilterMethod('all')
    setFilterDate('today')
    setFilterSuccess('success')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const getInitials = (name) => {
    if (!name) return 'UN'
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }

  if (loading && checkins.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-4 h-[calc(100vh-65px)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-lg font-semibold">Check-ins</h1>
        <div className="text-muted-foreground">
          Manage and view all customer check-ins
        </div>
      </div>

      {/* Stats Boxes - Compact divs in a single row */}
      <div className="grid grid-cols-5 gap-2 mb-3 flex-shrink-0">
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="text-xs text-muted-foreground">Total Today</div>
          <div className="text-base sm:text-lg font-semibold">{stats.totalToday}</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="text-xs text-muted-foreground">QR Code</div>
          <div className="text-base sm:text-lg font-semibold">{stats.qrCode}</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="text-xs text-muted-foreground">Manual</div>
          <div className="text-base sm:text-lg font-semibold">{stats.manual}</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="text-xs text-muted-foreground">Classes</div>
          <div className="text-base sm:text-lg font-semibold">{stats.classCheckins}</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="text-xs text-muted-foreground">Memberships</div>
          <div className="text-base sm:text-lg font-semibold">{stats.membershipCheckins}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-2 items-end mb-4 flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, email, phone, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        
        <Select value={filterSuccess} onValueChange={setFilterSuccess}>
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterMethod} onValueChange={setFilterMethod}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="qr-code">QR Code</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterDate} onValueChange={setFilterDate}>
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={clearFilters}>
          Reset
        </Button>

        <Badge variant="secondary" className="text-sm mt-1 ml-auto">
          {loading ? 'Loading...' : `${totalCount} total • Page ${currentPage} of ${totalPages}`}
        </Badge>
      </div>

      {/* Table with sticky header using Card wrapper like transactions */}
      <Card className="p-0 m-0 flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 m-0 flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 relative">
            {/* Header Table - Fixed */}
            <Table className="table-fixed w-full">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="bg-muted w-1/6">Time</TableHead>
                  <TableHead className="bg-muted w-1/4">Customer</TableHead>
                  <TableHead className="bg-muted w-1/6">Product</TableHead>
                  <TableHead className="bg-muted w-1/6">Class Time</TableHead>
                  <TableHead className="bg-muted w-1/8">Method</TableHead>
                  <TableHead className="bg-muted w-1/8">Status</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
            
            {/* Body Table - Scrollable */}
            <div className="absolute inset-0 top-12 overflow-y-auto">
              <Table className="table-fixed w-full">
                <TableBody>
                  {checkins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No check-ins found
                      </TableCell>
                    </TableRow>
                  ) : (
                    checkins.map((checkin) => (
                      <TableRow key={checkin._id}>
                        <TableCell className="w-1/6">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {dayjs(checkin.createdAt).format('h:mm A')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {dayjs(checkin.createdAt).fromNow()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="w-1/4">
                          <div
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => checkin.customer?._id && router.push(`/manage/customers/${checkin.customer._id}`)}
                          >
                            {checkin.customer?.photo ? (
                              <img
                                src={checkin.customer.photo}
                                alt={checkin.customer.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {getInitials(checkin.customer?.name)}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{checkin.customer?.name || 'Unknown'}</div>
                              {checkin.customer?.memberId && (
                                <div className="text-xs text-muted-foreground">
                                  {checkin.customer.memberId}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-1/6">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">{checkin.product?.name || 'Unknown'}</span>
                            <Badge 
                              variant={checkin.schedule ? "outline" : "secondary"} 
                              className="w-fit text-xs"
                            >
                              {checkin.schedule ? 'Class' : 'Membership'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="w-1/6">
                          {checkin.schedule && checkin.class?.datetime ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {dayjs(checkin.class.datetime).format('MMM D, h:mm A')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="w-1/8">
                          <div className="flex items-center gap-2">
                            {getMethodIcon(checkin.method)}
                            <span className="capitalize text-sm">
                              {checkin.method === 'qr-code' ? 'QR Code' : checkin.method}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="w-1/8">
                          {checkin.success?.status === false ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="destructive" className="w-fit">
                                Failed
                              </Badge>
                              {checkin.success?.reason && (
                                <span className="text-xs text-muted-foreground">
                                  {checkin.success.reason.replace(/-/g, ' ')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="default" className="w-fit capitalize">
                              {checkin.status.replace('-', ' ')}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 flex-shrink-0">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {/* Show page numbers */}
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}