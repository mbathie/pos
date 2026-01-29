'use client'

import { useEffect, useState, Suspense, Fragment } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Mail,
  Pencil,
  Phone,
  Receipt,
  Users,
  CheckCircle,
  ChevronRight,
  Search,
  XCircle
} from 'lucide-react'
import BookingEditSheet from './BookingEditSheet'
import { ActionButton } from '@/components/ui/action-button'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ProductThumbnail } from '@/components/product-thumbnail'

dayjs.extend(relativeTime)

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0.00'
  return `$${parseFloat(amount).toFixed(2)}`
}

// List view component for all bookings
function BookingsList() {
  const router = useRouter()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('upcoming')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchBookings()
  }, [filter])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/bookings/list?filter=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setBookings(data)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBookings = bookings.filter(booking => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      booking.companyName?.toLowerCase().includes(query) ||
      booking.product?.name?.toLowerCase().includes(query)
    )
  })

  const invoiceStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default">Paid</Badge>
      case 'open':
        return <Badge variant="secondary">Unpaid</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'void':
        return <Badge variant="destructive">Void</Badge>
      default:
        return <Badge variant="outline">{status || 'N/A'}</Badge>
    }
  }

  const handleRowClick = (booking) => {
    const params = new URLSearchParams()
    params.set('scheduleId', booking.scheduleId)
    params.set('datetime', new Date(booking.datetime).toISOString())
    router.push(`/manage/bookings?${params.toString()}`)
  }

  return (
    <div className="mr-auto px-4 pt-2 w-full h-full flex flex-col py-4">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-semibold mb-1">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all class and course bookings
        </p>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter */}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 flex flex-col relative">
        <div className="rounded-md border flex-1 overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
              <tr className="border-b bg-muted/50 hover:bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12"></th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Product</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Company / Customer</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date & Time</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Participants</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Total</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-12"></th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                <tr className="border-b">
                  <td colSpan={8} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">Loading bookings...</p>
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={8} className="p-4 text-center py-8">
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No bookings found matching your search' : 'No bookings found'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking, idx) => (
                  <tr
                    key={`${booking.scheduleId}-${booking.datetime}-${idx}`}
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleRowClick(booking)}
                  >
                    <td className="px-4 py-3 align-middle">
                      <ProductThumbnail
                        src={booking.product?.thumbnail}
                        alt={booking.product?.name}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        <span className="font-medium">{booking.product?.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{booking.product?.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        {booking.company && <Building2 className="h-4 w-4 text-muted-foreground" />}
                        <span>{booking.companyName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        <span>{dayjs(booking.datetime).format('ddd, MMM D, YYYY')}</span>
                        <span className="text-xs text-muted-foreground">
                          {dayjs(booking.datetime).format('h:mm A')}
                          {booking.label && ` - ${booking.label}`}
                          <span className="ml-1">({dayjs(booking.datetime).fromNow()})</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {booking.participantCount}
                          {booking.capacity && <span className="text-muted-foreground"> / {booking.capacity}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {invoiceStatusBadge(booking.invoiceStatus)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        <span>{formatCurrency(booking.total)}</span>
                        {booking.invoiceAmountDue > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Due: {formatCurrency(booking.invoiceAmountDue)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function BookingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editSheetOpen, setEditSheetOpen] = useState(false)

  const scheduleId = searchParams.get('scheduleId')
  const datetime = searchParams.get('datetime')

  // If no params provided, show the list view
  const showListView = !scheduleId && !datetime

  const fetchBooking = async () => {
    if (!scheduleId || !datetime) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/bookings?scheduleId=${scheduleId}&datetime=${encodeURIComponent(datetime)}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch booking')
      }
      const data = await res.json()
      setBooking(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!showListView) {
      fetchBooking()
    }
  }, [scheduleId, datetime, showListView])

  // Show list view if no params
  if (showListView) {
    return <BookingsList />
  }

  if (loading) {
    return (
      <div className="mx-4 mt-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-4 mt-4 space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="cursor-pointer"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!booking) return null

  const invoiceStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default">Paid</Badge>
      case 'open':
        return <Badge variant="secondary">Unpaid</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'void':
        return <Badge variant="destructive">Void</Badge>
      default:
        return <Badge variant="outline">{status || 'N/A'}</Badge>
    }
  }

  const openPaymentPage = async () => {
    const transactionId = booking.transactions?.[0]?._id
    if (!transactionId) {
      toast.error('No transaction found')
      return
    }

    try {
      const response = await fetch(`/api/transactions/${transactionId}/payment-link`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        window.open(data.paymentUrl, '_blank')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to open payment page')
      }
    } catch (error) {
      console.error('Error opening payment page:', error)
      toast.error('Failed to open payment page')
    }
  }

  return (
    <div className="mx-4 mt-4 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="cursor-pointer"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-xl font-semibold">
            {booking.companyPayment?.companyName || booking.company?.name || 'Booking Details'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {booking.schedule?.product?.name}
          </p>
        </div>
      </div>

      {/* Main Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Booking Details Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Booking Details
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setEditSheetOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <ActionButton
                  size="sm"
                  variant="destructive"
                  className="cursor-pointer"
                  requireAreYouSure
                  areYouSureDescription="This will cancel the booking, void any unpaid invoices, remove orders from the bump queue, and free up the time slot. This action cannot be undone."
                  action={async () => {
                    try {
                      const response = await fetch('/api/bookings', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          scheduleId: booking.scheduleId,
                          datetime: booking.datetime
                        })
                      })

                      const data = await response.json()

                      if (!response.ok) {
                        return { error: true, message: data.error || 'Failed to cancel booking' }
                      }

                      toast.success('Booking cancelled successfully')
                      router.push('/manage/bookings')
                      return { error: false }
                    } catch (error) {
                      console.error('Error cancelling booking:', error)
                      return { error: true, message: 'Failed to cancel booking' }
                    }
                  }}
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Booking
                </ActionButton>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <div className="text-right">
                  <span className="font-medium">
                    {dayjs(booking.datetime).format('dddd, MMMM D, YYYY')}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    ({dayjs(booking.datetime).fromNow()})
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">
                  {dayjs(booking.datetime).format('h:mm A')}
                </span>
              </div>
              {booking.duration && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{booking.duration} min</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Participants</span>
                <span className="font-medium">
                  {booking.totalQty}
                  {booking.schedule?.capacity && (
                    <span className="text-muted-foreground font-normal"> / {booking.schedule.capacity}</span>
                  )}
                </span>
              </div>
              {booking.label && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Label</span>
                  <span className="font-medium">{booking.label}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company/Contact Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {booking.company ? 'Company' : 'Contact'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">
                  {booking.companyPayment?.companyName || booking.company?.name || 'N/A'}
                </span>
              </div>
              {booking.companyPayment?.contactName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <span className="font-medium">{booking.companyPayment.contactName}</span>
                </div>
              )}
              {booking.companyPayment?.contactEmail && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Email</span>
                  <a
                    href={`mailto:${booking.companyPayment.contactEmail}`}
                    className="font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" />
                    {booking.companyPayment.contactEmail}
                  </a>
                </div>
              )}
              {booking.company?.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Phone</span>
                  <a
                    href={`tel:${booking.company.phone}`}
                    className="font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    {booking.company.phone}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment & Invoice Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" />
            Payment & Invoice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total</span>
              <span>{formatCurrency(booking.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid</span>
              <span>{formatCurrency(booking.totalAmount - booking.totalAmountDue)}</span>
            </div>
            <div className="flex justify-between">
              <span>Remaining Balance</span>
              <span>{formatCurrency(booking.totalAmountDue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Invoice Status</span>
              {invoiceStatusBadge(booking.invoiceStatus)}
            </div>
            {booking.invoiceUrl && (
              <div className="flex gap-2 pt-2">
                <a
                  href={booking.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  View Invoice <ExternalLink className="h-3 w-3" />
                </a>
                {booking.totalAmountDue > 0 && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <button
                      onClick={openPaymentPage}
                      className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="h-3 w-3" /> Payment Page
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Booking Summary Card (like Kids Party) */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{booking.schedule?.product?.name || 'Booking'}</span>
            <span className="text-sm font-normal text-muted-foreground">
              Qty: {booking.totalQty}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(booking.totalAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-semibold">
              <span>Total</span>
              <span>{formatCurrency(booking.totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Items Table */}
      {booking.products && booking.products.length > 0 && (
        <Card className="ml-4">
          <CardHeader>
            <CardTitle>Booking Items</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Variation</TableHead>
                  <TableHead>Modifiers</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {booking.products.map((product, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.variation || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.mods && product.mods.length > 0 ? (
                          product.mods.map((mod, modIdx) => (
                            <Badge key={modIdx} variant="secondary" className="text-xs">
                              {mod.qty > 1 && `${mod.qty}x `}{mod.name}
                              {mod.price > 0 && ` (+${formatCurrency(mod.price)})`}
                            </Badge>
                          ))
                        ) : '-'}
                      </div>
                    </TableCell>
                    <TableCell>{product.qty || 1}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.amount?.subtotal || product.amount?.total || 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(product.amount?.total || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Participants Card */}
      <Card className="ml-4">
        <CardHeader>
          <CardTitle>Participants</CardTitle>
          <CardDescription className="space-y-1">
            <div>
              {booking.totalQty} participant{booking.totalQty !== 1 ? 's' : ''} booked
              {booking.schedule?.capacity && (
                <> (Capacity: {booking.schedule.capacity})</>
              )}
            </div>
            {booking.transactions?.[0]?._id && (
              <button
                className="flex items-center gap-1 text-primary hover:underline cursor-pointer"
                onClick={() => {
                  const waiverUrl = `${window.location.origin}/schedule/${booking.transactions[0]._id}/waiver`
                  navigator.clipboard.writeText(waiverUrl)
                  toast.success('Waiver link copied to clipboard')
                }}
              >
                Waiver link
                <Copy className="h-3 w-3" />
              </button>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {booking.participants && booking.participants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {booking.participants.map((participant, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      {participant.customer?.name || participant.customer?.firstName || participant.customer?.lastName
                        ? (participant.customer.name || `${participant.customer.firstName || ''} ${participant.customer.lastName || ''}`.trim())
                        : '-'}
                    </TableCell>
                    <TableCell>{participant.customer?.email || '-'}</TableCell>
                    <TableCell>
                      {participant.customer?.dob
                        ? `${dayjs(participant.customer.dob).format('DD/MM/YYYY')} (${dayjs().diff(dayjs(participant.customer.dob), 'year')} yrs)`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {participant.status === 'checked in' ? (
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <CheckCircle className="h-4 w-4" />
                          <span>Checked In</span>
                        </div>
                      ) : participant.status === 'confirmed' ? (
                        <div className="flex items-center justify-center gap-2 text-cyan-500">
                          <CheckCircle className="h-4 w-4" />
                          <span>Confirmed</span>
                        </div>
                      ) : participant.status === 'pending_waiver' ? (
                        <div className="flex items-center justify-center gap-2 text-warning">
                          <Clock className="h-4 w-4" />
                          <span>Pending Waiver</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{participant.status || '-'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No participants found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions Card */}
      {booking.transactions && booking.transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {booking.transactions.map((transaction) => {
                  // Get original total before any adjustments
                  const hasAdjustments = transaction.bookingAdjustments?.length > 0
                  const originalTotal = hasAdjustments
                    ? transaction.bookingAdjustments[0].previousTotal
                    : transaction.total

                  return (
                    <Fragment key={transaction._id}>
                      <TableRow>
                        <TableCell>
                          {dayjs(transaction.createdAt).format('DD/MM/YYYY h:mm A')}
                        </TableCell>
                        <TableCell>{formatCurrency(originalTotal)}</TableCell>
                        <TableCell>
                          {formatCurrency(transaction.invoiceAmountDue || 0)}
                        </TableCell>
                        <TableCell>{invoiceStatusBadge(transaction.invoiceStatus)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => router.push(`/manage/transactions/${transaction._id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                      {hasAdjustments && transaction.bookingAdjustments.map((adj, adjIndex) => (
                        <TableRow key={`${transaction._id}-adj-${adjIndex}`}>
                          <TableCell colSpan={2}>
                            {adj.type === 'qty_increase' ? 'Added' : 'Removed'} participant ({adj.previousQty} → {adj.newQty}) - {dayjs(adj.date).format('DD/MM/YY')}
                          </TableCell>
                          <TableCell>
                            {adj.amount >= 0 ? '+' : ''}{formatCurrency(adj.amount)}
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Booking Sheet */}
      <BookingEditSheet
        open={editSheetOpen}
        setOpen={setEditSheetOpen}
        booking={booking}
        onUpdate={(newDatetime) => {
          // Update URL with new datetime if changed
          if (newDatetime !== datetime) {
            const params = new URLSearchParams(searchParams)
            params.set('datetime', newDatetime)
            router.replace(`/manage/bookings?${params.toString()}`)
          }
          // Always refetch to get updated data (qty changes, etc.)
          fetchBooking()
        }}
      />
    </div>
  )
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="mx-4 mt-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    }>
      <BookingContent />
    </Suspense>
  )
}
