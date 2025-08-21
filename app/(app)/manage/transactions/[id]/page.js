'use client'
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Banknote, CheckCircle, XCircle, Clock, Undo2 } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function TransactionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchTransaction();
    }
  }, [params.id]);

  const fetchTransaction = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/transactions/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTransaction(data);
      } else {
        console.error('Transaction not found');
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="size-4 text-primary" />;
      case 'failed':
        return <XCircle className="size-4 text-red-500" />;
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

  const getInitials = (name) => {
    if (!name) return 'UN';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  };

  const getStatusDisplayText = (status) => {
    switch (status) {
      case 'succeeded':
        return 'Completed';
      case 'subscription_active':
        return 'Active';
      case 'first_period_paid':
        return 'Setup Complete';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      default:
        return status;
    }
  };

  // Group products by type
  const groupProductsByType = (products) => {
    const grouped = {};
    products?.forEach(product => {
      const type = product.type || 'unknown';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(product);
    });
    return grouped;
  };

  const ShopProductsCard = ({ products }) => (
    <Card>
      <CardHeader>
        <CardTitle>Shop Items</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Variation</TableHead>
              <TableHead>Modifiers</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.item?.variation || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {product.item?.modGroups?.length > 0 ? (
                      product.item.modGroups.map((group) => 
                        group.mods.filter(mod => mod.selected).map((mod, modIndex) => (
                          <Badge key={`${group._id}-${modIndex}`} variant="secondary" className="text-xs">
                            {mod.name}
                            {mod.price > 0 && ` (+${formatCurrency(mod.price)})`}
                          </Badge>
                        ))
                      )
                    ) : '-'}
                  </div>
                </TableCell>
                <TableCell>{product.qty}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(product.amount?.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const ClassProductsCard = ({ products }) => (
    <Card>
      <CardHeader>
        <CardTitle>Class Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Attendees</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium align-top">{product.name}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {product.variations?.map((variation, vIndex) => 
                      variation.timesCalc?.filter(time => time.selected)?.map((time, tIndex) => (
                        <div key={`${vIndex}-${tIndex}`} className="text-sm">
                          {dayjs(time.value).format('DD/MM/YYYY h:mm A')}
                        </div>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="space-y-1">
                    {product.variations?.map((variation, vIndex) => 
                      variation.prices?.map((price, pIndex) => (
                        <div key={`${vIndex}-${pIndex}`} className="text-sm">
                          {price.qty}x {price.name}
                          {price.customers?.map((customer, cIndex) => (
                            customer.customer && (
                              <div key={cIndex} className="text-xs">
                                {customer.customer.name}
                              </div>
                            )
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right align-top">
                  {formatCurrency(product.amount?.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const CourseProductsCard = ({ products }) => (
    <Card>
      <CardHeader>
        <CardTitle>Courses</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Attendees</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  {product.variations?.[0]?.times?.[0]?.start ? (
                    <div className="text-sm">
                      {dayjs(product.variations[0].times[0].start).format('DD/MM/YYYY h:mm A')}
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {product.variations?.map((variation, vIndex) => 
                      variation.prices?.map((price, pIndex) => (
                        <div key={`${vIndex}-${pIndex}`} className="text-sm">
                          {price.qty}x {price.name}
                          {price.customers?.map((customer, cIndex) => (
                            customer.customer && (
                              <div key={cIndex} className="text-xs">
                                {customer.customer.name}
                              </div>
                            )
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(product.amount?.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const GeneralProductsCard = ({ products }) => (
    <Card>
      <CardHeader>
        <CardTitle>General Entries</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entry Pass</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Attendees</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium align-top">{product.name}</TableCell>
                <TableCell className="align-top">
                  <div className="space-y-1">
                    {product.variations?.map((variation, vIndex) => (
                      <div key={vIndex} className="text-sm">
                        {variation.name} {variation.unit}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="space-y-1">
                    {product.variations?.map((variation, vIndex) => 
                      variation.prices?.map((price, pIndex) => (
                        <div key={`${vIndex}-${pIndex}`} className="text-sm">
                          {price.qty}x {price.name}
                          {price.customers?.map((customer, cIndex) => (
                            customer.customer && (
                              <div key={cIndex} className="text-xs">
                                {customer.customer.name}
                              </div>
                            )
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right align-top">
                  {formatCurrency(product.amount?.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const MembershipProductsCard = ({ products }) => (
    <Card>
      <CardHeader>
        <CardTitle>Membership Subscriptions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membership</TableHead>
              <TableHead>Billing Period</TableHead>
              <TableHead>Subscribers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium align-top">{product.name}</TableCell>
                <TableCell className="align-top">
                  <div className="space-y-1">
                    {product.item ? (
                      // Use cart item data for billing period
                      <div className="text-sm">
                        {product.item.variation === "1" && product.item.unit === "month" ? "Monthly" :
                         product.item.variation === "1" && product.item.unit === "year" ? "Yearly" :
                         `${product.item.variation} ${product.item.unit}${parseInt(product.item.variation) > 1 ? 's' : ''}`}
                      </div>
                    ) : (
                      // Fallback: find variation with customers (qty > 0)
                      product.variations?.filter(variation => 
                        variation.prices?.some(price => 
                          price.customers?.some(customer => customer.customer)
                        )
                      ).map((variation, vIndex) => (
                        <div key={vIndex} className="text-sm">
                          {variation.name === "1" && variation.unit === "month" ? "Monthly" :
                           variation.name === "1" && variation.unit === "year" ? "Yearly" :
                           `${variation.name} ${variation.unit}${parseInt(variation.name) > 1 ? 's' : ''}`}
                        </div>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="space-y-1">
                    {product.variations?.map((variation, vIndex) => 
                      variation.prices?.map((price, pIndex) => (
                        <div key={`${vIndex}-${pIndex}`} className="text-sm">
                          {price.customers?.map((customer, cIndex) => (
                            customer.customer && (
                              <div key={cIndex}>
                                {customer.customer.name} ({price.name})
                              </div>
                            )
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant="outline" className="text-xs">
                    {transaction.status === 'subscription_active' ? 'Active' : 
                     transaction.status === 'first_period_paid' ? 'Setup Complete' : 
                     'Processing'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right align-top">
                  {formatCurrency(product.amount?.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="mx-4 mt-4">
        <div className="text-center py-8 text-muted-foreground">
          Loading transaction details...
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="mx-4 mt-4">
        <div className="text-center py-8 text-muted-foreground">
          Transaction not found
        </div>
      </div>
    );
  }

  const productGroups = groupProductsByType(transaction.cart?.products);

  return (
    <div className="mx-4 mt-4- space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-2-" />
          Back
        </Button>
        <div className="flex-1" />
          <Button variant="outline" size="sm">
           <Undo2 className="size-4 mr-2" />
           Refund
         </Button>
      </div>

      {/* Transaction Summary */}
      <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle>Transaction Summary</CardTitle>
              <div className="text-right">
              <p className="text-sm">
                  {dayjs(transaction.createdAt).format('DD/MM/YYYY h:mm A')}
              </p>
              <p className="text-xs text-muted-foreground">
                  {dayjs(transaction.createdAt).fromNow()}
              </p>
              </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="flex items-center gap-2">
                {getStatusIcon(transaction.status)}
                <Badge 
                  variant={transaction.status === 'succeeded' || transaction.status === 'subscription_active' ? 'default' : 
                         transaction.status === 'failed' ? 'destructive' : 'secondary'}
                >
                  {getStatusDisplayText(transaction.status)}
                </Badge>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <div className="flex items-center gap-2">
                {getPaymentMethodIcon(transaction.paymentMethod)}
                <span className="capitalize">{transaction.paymentMethod}</span>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Employee</p>
              <p className="font-medium">{getInitials(transaction.employee?.name)}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">
                {transaction.customer ? transaction.customer.name : 'Guest'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t text-sm">
            <div className="space-y-2 ml-auto">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(transaction.subtotal)}</span>
              </div>
              {transaction.discountAmount > 0 && (
                <div className="flex justify-between">
                <span>Discount ({transaction.discount?.name})</span>
                  <span>-{formatCurrency(transaction.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax (GST)</span>
                <span>{formatCurrency(transaction.tax)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(transaction.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Cards by Type */}
      {productGroups.shop && (
        <ShopProductsCard products={productGroups.shop} />
      )}

      {productGroups.class && (
        <ClassProductsCard products={productGroups.class} />
      )}

      {productGroups.course && (
        <CourseProductsCard products={productGroups.course} />
      )}

      {productGroups.general && (
        <GeneralProductsCard products={productGroups.general} />
      )}

      {productGroups.membership && (
        <MembershipProductsCard products={productGroups.membership} />
      )}
    </div>
  );
} 