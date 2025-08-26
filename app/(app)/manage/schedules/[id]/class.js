'use client'
import React from 'react';
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { useEffect, useState } from "react";
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader,TableRow } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Ellipsis, Check, Clock, CheckCircle, XCircle, User, CalendarIcon, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import ProductIcon from '@/components/icon';
import { format } from "date-fns"

export default function Page({ schedule, setSchedule }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [calendarOpen, setCalendarOpen] = useState(false);

  if (!schedule || !schedule.product) return null

  // Filter classes based on selected filters (for both classes and courses)
  const filteredClasses = schedule.classes?.filter(cls => {
        // Date filter
        if (selectedDate) {
          const classDate = dayjs(cls.datetime).format('YYYY-MM-DD');
          const filterDate = dayjs(selectedDate).format('YYYY-MM-DD');
          if (classDate !== filterDate) return false;
        }

        // Search filter (customer name or member ID)
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const hasMatchingCustomer = cls.customers?.some(cust => 
            cust.customer?.name?.toLowerCase().includes(query) ||
            cust.customer?.memberId?.toString().includes(query)
          );
          if (!hasMatchingCustomer) return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
          const hasMatchingStatus = cls.customers?.some(cust => 
            cust.status === statusFilter
          );
          if (!hasMatchingStatus) return false;
        }

        return true;
      }) || [];

  const clearFilters = () => {
    setSelectedDate(null);
    setSearchQuery('');
    setStatusFilter('all');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="size-4 text-chart-2" />;
      case 'checked in':
        return <CheckCircle className="size-4 text-primary" />;
      case 'cancelled':
        return <XCircle className="size-4 text-destructive" />;
      default:
        return <Clock className="size-4 text-muted-foreground" />;
    }
  };

  const getInitials = (name) => {
    if (!name) return 'UN';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Product Info Card */}
      <Card className='p-4'>
        <CardContent className='p-0'>
          <div className="flex items-start gap-4">
            <div className="relative w-[50px] h-[50px]">
              <ProductIcon product={schedule.product} size="md" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-semibold">{schedule.product.name}</h2>
                <div className="text-sm text-muted-foreground-">
                  Class Size {schedule.product.capacity}
                  {schedule.product.type === 'course' && (
                    <span className="ml-4">Available {schedule.available}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Course Schedule Details - only for courses */}
          {schedule.product.type === 'course' && schedule.product.schedule && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="mb-2">Course Schedule</h3>
              <div className='space-y-'>
                {/* Date Range */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>
                    {schedule.product.schedule.startDate && 
                      dayjs(schedule.product.schedule.startDate).format('MMM D, YYYY')}
                    {' - '}
                    {schedule.product.schedule.endDate && 
                      dayjs(schedule.product.schedule.endDate).format('MMM D, YYYY')}
                  </span>
                </div>
                
                {/* Days of Week */}
                {schedule.product.schedule.daysOfWeek && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Days:</span>
                    <span>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                        .filter((_, idx) => schedule.product.schedule.daysOfWeek[idx])
                        .join(', ')}
                    </span>
                  </div>
                )}
                
                {/* Time Slots */}
                {schedule.product.schedule.times?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Time Slots:</span>
                    <div className="flex gap-2">
                      {schedule.product.schedule.times.map((timeSlot, idx) => (
                        <Badge key={idx} variant="secondary">
                          {timeSlot.time} {timeSlot.label && `(${timeSlot.label})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing */}
          {schedule.product.prices?.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="mb-2">Pricing</h3>
              <div className='flex gap-6'>
                {schedule.product.prices?.map((price, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span>{price.name}:</span>
                    <span>${Number(price.value).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 items-end">
        {/* Calendar Filter - for both classes and courses */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setCalendarOpen(false);
              }}
              modifiers={{
                today: new Date()
              }}
              modifiersStyles={{
                today: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  borderRadius: '6px'
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Search Box */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
          <Input
            placeholder="Search by name or member ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="checked in">Checked In</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {(selectedDate || searchQuery || statusFilter !== 'all') && (
          <Button variant="outline" onClick={clearFilters}>
            Clear
          </Button>
        )}

        {/* Results Count */}
        <Badge variant="secondary" className="ml-auto">
          {filteredClasses.length} class{filteredClasses.length !== 1 ? 'es' : ''}
        </Badge>
      </div>

      {/* Classes Table */}
      <Card className='p-0'>
        <CardContent className='p-0'>
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50">Customer</TableHead>
                <TableHead className="bg-muted/50">Phone</TableHead>
                <TableHead className="bg-muted/50">Member ID</TableHead>
                <TableHead className="bg-muted/50">Status</TableHead>
                <TableHead className="bg-muted/50"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                  {!filteredClasses || filteredClasses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {(selectedDate || searchQuery || statusFilter !== 'all') 
                            ? 'No classes found matching your filters' 
                            : 'No classes scheduled'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClasses.map((cls, clsIdx) => {
                        const classTime = dayjs(cls.datetime);
                        const isExpired = classTime.isBefore(dayjs());
                        const isToday = classTime.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
                        
                        return (
                          <React.Fragment key={`class-${clsIdx}`}>
                            {/* Class Header Row */}
                            <TableRow className={isToday ? "bg-primary/50 text-primary-foreground" : "bg-background"}>
                              <TableCell colSpan={5} className="font-semibold-">
                                <div className="flex items-center justify-between-">
                                  <div className="flex items-center gap-2">
                                    <span>{classTime.format('ddd')}</span>
                                    <span>{classTime.format('DD/MM/YYYY')}</span>
                                    <span>{classTime.format('h:mm A')}</span>
                                    {cls.label && <Badge variant={isToday ? "secondary" : "secondary"} className={isToday ? "bg-primary-foreground text-primary" : ""}>{cls.label}</Badge>}
                                    <Badge variant={isExpired ? "destructive" : isToday ? "secondary" : "outline"} className={isToday && !isExpired ? "bg-primary-foreground text-primary" : ""}>
                                      {isExpired ? 'Completed' : classTime.fromNow()}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm ml-2">
                                    <Badge variant={isToday ? "secondary" : "primary"} className={isToday ? "bg-primary-foreground text-primary" : ""}>
                                      Available {cls.available}/{schedule.product.capacity}
                                    </Badge>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                            
                            {/* Customer Rows */}
                            {cls.customers?.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-sm">
                                  No enrollments yet
                                </TableCell>
                              </TableRow>
                            ) : (
                              cls.customers?.map((cust, custIdx) => (
                              <TableRow 
                                key={`${clsIdx}-${custIdx}`}
                                className="hover:bg-muted/50"
                              >
                                <TableCell className="w-1/5">
                                  <div className="flex items-center gap-2">
                                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                                      {getInitials(cust.customer?.name)}
                                    </div>
                                    <span>{cust.customer?.name || 'Unknown'}</span>
                                  </div>
                                </TableCell>
                                
                                <TableCell className="w-1/5">
                                  {cust.customer?.phone || '-'}
                                </TableCell>
                                
                                <TableCell className="w-1/5">
                                  {cust.customer?.memberId || '-'}
                                </TableCell>
                                
                                <TableCell className="w-1/6">
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(cust.status)}
                                    <span className="capitalize">{cust.status}</span>
                                  </div>
                                </TableCell>
                                
                                <TableCell className="w-1/4">
                                  <div className="flex justify-end gap-2">
                                    <ManageCustomer 
                                      schedule={schedule}
                                      scheduleId={schedule._id} 
                                      customer={cust}
                                      classId={cls._id}
                                      setSchedule={setSchedule}
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ManageCustomer({ schedule, customer, classId, scheduleId, setSchedule }) {

  const handleUpdateStatus = async (newStatus) => {
    console.log('Updating status to:', newStatus);
    console.log('Current schedule before update:', schedule);
    
    const res = await fetch(`/api/schedules/${scheduleId}/classes/${classId}/customers/${customer._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) {
      console.error('Failed to update status');
      return;
    }

    const updated = await res.json();
    console.log('Updated schedule from API:', updated);
    setSchedule(updated);
  };

  return (
    <div className="flex gap-2">
      <Button 
        variant={customer.status === "checked in" ? "default" : "secondary"}
        size="sm"
        onClick={() => handleUpdateStatus(customer.status === "checked in" ? "confirmed" : "checkin")}
      >
        <Check className='size-4' />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Ellipsis className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleUpdateStatus("confirmed")}>
            <CheckCircle className="size-4 mr-2 text-chart-2" />
            Confirmed
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpdateStatus("checkin")}>
            <CheckCircle className="size-4 mr-2 text-primary" />
            Check In
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpdateStatus("cancel")}>
            <XCircle className="size-4 mr-2 text-destructive" />
            Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}