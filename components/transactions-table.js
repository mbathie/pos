'use client'
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { Badge } from "@/components/ui/badge"
import { CreditCard, Banknote, CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function TransactionsTable({ 
  customerId = null, 
  showFilters = true,
  className = "",
  maxHeight = "h-[calc(100vh-65px)]",
  data = null,
  loading: externalLoading = false
}) {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [now, setNow] = useState(dayjs());
  const [loading, setLoading] = useState(false);

  // Use external data if provided, otherwise fetch internally
  const finalTransactions = data || transactions;
  const finalLoading = data ? externalLoading : loading;

  // Update current time every minute for relative time display
  useEffect(() => {
    const interval = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch transactions on component mount (only if no external data provided)
  useEffect(() => {
    if (!data) {
      fetchTransactions();
    }
  }, [customerId, data]);

  const fetchTransactions = async () => {
    if (data) return; // Don't fetch if external data is provided
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // If customerId is provided, filter by customer
      if (customerId) {
        params.append('customerId', customerId);
      }

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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="size-4 text-primary" />;
      case 'failed':
        return <XCircle className="size-4 text-destructive" />;
      case 'pending':
        return <Clock className="size-4 text-yellow-500" />;
      default:
        return <Clock className="size-4 text-primary" />;
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
    <Card className={`p-0 m-0 flex-1 flex flex-col overflow-hidden ${className}`}>
      <CardContent className="p-0 m-0 flex-1 flex flex-col overflow-hidden">
        {finalLoading && finalTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground flex-1 flex items-center justify-center">
            Loading transactions...
          </div>
        ) : (
          <div className="flex-1 min-h-0 relative">
            <Table className="table-fixed w-full">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="bg-muted w-1/6">Date & Time</TableHead>
                  <TableHead className="bg-muted w-1/8">Total</TableHead>
                  <TableHead className="bg-muted w-1/8">Payment</TableHead>
                  <TableHead className="bg-muted w-1/12">Status</TableHead>
                  <TableHead className="bg-muted w-1/6">Discount</TableHead>
                  <TableHead className="bg-muted w-1/12">Employee</TableHead>
                  {!customerId && <TableHead className="bg-muted w-1/6">Customer</TableHead>}
                  <TableHead className="bg-muted w-16"></TableHead>
                </TableRow>
              </TableHeader>
            </Table>
            
            <div className="absolute inset-0 top-12 overflow-y-auto">
              <Table className="table-fixed w-full">
                <TableBody>
                  {finalTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={customerId ? 7 : 8} className="text-center py-8 text-muted-foreground">
                        {customerId 
                          ? "No transactions found for this customer." 
                          : "No transactions found."
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    finalTransactions.map((transaction) => (
                      <TableRow 
                        key={transaction._id} 
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => router.push(`/manage/transactions/${transaction._id}`)}
                      >
                        <TableCell className="align-top w-1/6">
                          <div className="flex flex-col">
                            <div>
                              {dayjs(transaction.createdAt).format('DD/MM/YYYY')}
                            </div>
                            <div className="text-sm">
                              {dayjs(transaction.createdAt).format('h:mm A')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {dayjs(transaction.createdAt).from(now)}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell className="align-top w-1/8">
                          <div className="font-medium">
                            {formatCurrency(transaction.total)}
                          </div>
                        </TableCell>
                        
                        <TableCell className="align-top w-1/8">
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(transaction.paymentMethod)}
                            <span className="capitalize">{transaction.paymentMethod}</span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="align-top w-1/12">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(transaction.status)}
                          </div>
                        </TableCell>
                        
                        <TableCell className="align-top w-1/6">
                          {transaction.discount ? (
                            <div className="flex flex-col">
                              <div className="text-sm">
                                {transaction.discount.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                -{formatCurrency(transaction.discountAmount)}
                              </div>
                            </div>
                          ) : (
                            <span></span>
                          )}
                        </TableCell>
                        
                        <TableCell className="align-top w-1/12">
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                            {getInitials(transaction.employee?.name)}
                          </div>
                        </TableCell>
                        
                        {!customerId && (
                          <TableCell className="align-top w-1/6">
                            {transaction.customer ? (
                              <div className="flex flex-col">
                                <div className="font-medium text-sm">
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
                        )}
                        
                        <TableCell className="align-top w-full flex justify-end">
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
  );
}