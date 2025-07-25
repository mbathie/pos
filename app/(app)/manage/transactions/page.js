'use client'
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button";
import { Filter, CreditCard, Banknote, CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [now, setNow] = useState(dayjs());
  const [filters, setFilters] = useState({
    status: 'all',
    paymentMethod: 'all',
    dateRange: '24'
  });
  const [loading, setLoading] = useState(false);

  // Update current time every minute for relative time display
  useEffect(() => {
    const interval = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch transactions when filters change
  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.paymentMethod !== 'all') params.append('paymentMethod', filters.paymentMethod);
      if (filters.dateRange) params.append('hours', filters.dateRange);

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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      paymentMethod: 'all',
      dateRange: '24'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="size-4 text-primary" />;
      case 'failed':
        return <XCircle className="size-4 text-destructive" />;
      case 'pending':
        return <Clock className="size-4 text-yellow-500" />;
      default:
        return <Clock className="size-4 text-gray-500" />;
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'card':
        return <CreditCard className="size-4" />;
      case 'cash':
        return <Banknote className="size-4" />;
      default:
        return <CreditCard className="size-4" />;
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
      .join('');
  };

  return (
    <div className="mx-4">
      
      {/* Filters */}
      <div className="flex gap-2 items-end mb-4">
        <div className="flex flex-col gap-2">
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col gap-2">
          <Select value={filters.paymentMethod} onValueChange={(value) => handleFilterChange('paymentMethod', value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col gap-2">
          <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last hour</SelectItem>
              <SelectItem value="2">Last 2 hours</SelectItem>
              <SelectItem value="24">Last 24 hours</SelectItem>
              <SelectItem value="48">Last 48 hours</SelectItem>
              <SelectItem value="168">Last 7 days</SelectItem>
              <SelectItem value="720">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline" onClick={clearFilters}>
          {/* <Filter className="size-4" /> */}
          Reset
        </Button>

        <Badge variant="secondary" className="text-sm mt-1 ml-auto">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </Badge>
      </div>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0 m-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading transactions...
            </div>
          ) : (
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0   z-10">
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No transactions found for the selected filters.
                    </TableCell>
                  </TableRow>
                    ) : (
                      transactions.map((transaction) => (
                        <TableRow 
                          key={transaction._id} 
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => router.push(`/manage/transactions/${transaction._id}`)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <div>
                                {dayjs(transaction.createdAt).format('DD/MM/YYYY')}
                              </div>
                              <div className="text-sm">
                                {dayjs(transaction.createdAt).format('h:mm A')}
                              </div>
                              <div className="text-xs">
                                {dayjs(transaction.createdAt).from(now)}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="align-top">
                            <div className="flex flex-col">
                              <div className="">
                                {formatCurrency(transaction.total)}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="align-top">
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(transaction.paymentMethod)}
                              <span className="capitalize">{transaction.paymentMethod}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="align-top">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(transaction.status)}
                              {/* <Badge 
                                variant={transaction.status === 'succeeded' ? 'default' : 
                                       transaction.status === 'failed' ? 'destructive' : 'secondary'}
                              >
                                {transaction.status}
                              </Badge> */}
                            </div>
                          </TableCell>
                          
                          <TableCell className="align-top">
                            {transaction.discount ? (
                              <div className="flex flex-col">
                                <div className="">
                                  {transaction.discount.name}
                                </div>
                                <div className="text-xs">
                                  -{formatCurrency(transaction.discountAmount)}
                                </div>
                              </div>
                            ) : (
                              <span></span>
                            )}
                          </TableCell>
                          
                          <TableCell className="align-top">
                            <div className="font-medium">
                              {getInitials(transaction.employee?.name)}
                            </div>
                          </TableCell>
                          
                          <TableCell className="align-top">
                            {transaction.customer ? (
                              <div className="flex flex-col">
                                <div className="font-medium">
                                  {transaction.customer.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {transaction.customer.phone}
                                </div>
                              </div>
                            ) : (
                              <span></span>
                            )}
                          </TableCell>
                          
                          <TableCell className="align-top">
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 