'use client'
import { useEffect, useState } from "react";
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader,TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button } from "@/components/ui/button";
import { Clock, CircleCheck, CircleX, Filter } from "lucide-react";
dayjs.extend(relativeTime);

export default function Page({ params }) {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(dayjs());
  const [filters, setFilters] = useState({
    status: 'placed',
    dateRange: '2'
  });
  const [loading, setLoading] = useState(false);

  async function updateStatus(id, status) {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (res.ok) {
      const updatedOrder = await res.json();
      setOrders((prev) => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
    }
  }

  const statuses = {
    'placed': {
      icon: Clock,
      className: 'text-chart-4',
      badgeVariant: 'chart4'
    },
    'cancelled': {
      icon: CircleX,
      className: 'text-destructive',
      badgeVariant: 'destructive'
    },
    'completed': {
      icon: CircleCheck,
      className: 'text-primary',
      badgeVariant: 'default'
    }
  }

  async function getOrders() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/orders?hours=${filters.dateRange}`);
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getOrders();
  }, [filters.dateRange]); // Only re-fetch when date range changes

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(dayjs());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      dateRange: '24'
    });
  };

  // Frontend filtering logic
  const filteredOrders = orders.filter(order => {
    if (filters.status !== 'all' && order.status !== filters.status) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col">
      {/* Fixed Filter Section */}
      <div className="sticky top-0 z-10 p-4 bg-background">
        <div className="flex gap-4 py-4- rounded-lg-">
        <div className="flex flex-col gap-2">
          {/* <Label className="text-sm font-medium">Status</Label> */}
          <Select size="sm" value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="placed">Placed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col gap-2">
          {/* <Label className="text-sm font-medium">Time Period</Label> */}
          <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last hour</SelectItem>
              <SelectItem value="2">Last 2 hours</SelectItem>
              <SelectItem value="24">Last 24 hours</SelectItem>
              <SelectItem value="48">Last 48 hours</SelectItem>
              <SelectItem value="168">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-end">
          <Button variant="outline" onClick={clearFilters}>
            <Filter className="size-4 mr-2" />
            Clear Filters
          </Button>
        </div>
        
        <div className="flex items-end ml-auto">
          <Badge variant="secondary" className="text-sm">
            {filters.status !== 'all' ? `${filteredOrders.length}/${orders.length}` : filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        </div>
      </div>

      {/* Scrollable Orders Area */}
      <div className="overflow-y-auto px-4 py-4-">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading orders...
          </div>
        )}

        {/* Orders List */}
        {!loading && (
          <div className="flex flex-col gap-4">
        {filteredOrders?.map((o, oIdx) => {
          return (
            <Card key={o._id}>
              <CardContent>
                <div className="flex gap-4 flex-col">

                  <div className="flex gap-4">
                    <div>
                      <div className="flex flex-row items-center gap-2 text-lg- font-semibold">
                        {statuses[o.status] && (() => {
                          const { icon: StatusIcon, className, badgeVariant } = statuses[o.status];
                          return (
                            <>
                              <StatusIcon
                                className={`size-5 stroke-2 ${className}`}
                              />
                              <Badge 
                                variant={badgeVariant}
                                className="text-xs font-medium capitalize w-[90px] text-center"
                              >
                                {o.status}
                              </Badge>
                            </>
                          );
                        })()}
                        <div>Order #</div>
                        <div>{o.orderNumber || 0}</div>
                      </div>
                      <div className="flex flex-col ´text-muted-foreground text-sm">
                        {!o?.customer?.name ? (
                          <div>Guest</div>
                        ) : (
                          <>
                            <div>{o?.customer?.name}, {o?.customer?.phone}</div>
                            <div className="text-xs text-muted-foreground">{o.customer?.memberId}</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-1"/>

                    <div className="flex gap-4">
                      {o.status === 'placed' && (
                        <>
                          <Button variant="destructive" size="sm" onClick={() => updateStatus(o._id, 'cancelled')}>Cancel</Button>
                          <Button size="sm" onClick={() => updateStatus(o._id, 'completed')}>Complete</Button>
                        </>
                      )}
                      {o.status === 'completed' && (
                        <Button variant="outline" size="sm" onClick={() => updateStatus(o._id, 'placed')}>Re-open</Button>
                      )}
                    </div>

                    <div className="flex flex-row text-right">
                      <div className="flex flex-col">
                        <div className="text-lg- font-bold">{dayjs(o.createdAt).format('h:mm A')}</div>
                        <div className="text-xs text-muted-foreground">{dayjs(o.createdAt).from(now)}</div>
                      </div>
                    </div>
                  </div>

                  <Table className="table-fixed w-full text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/5 px-0">Product</TableHead>
                        <TableHead className="w-1/5">Qty</TableHead>
                        <TableHead className="w-1/5">Variation</TableHead>
                        <TableHead className="w-2/5">Mods</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className='p-0 m-0'>
                      {o.products?.map((p, pIdx) => (
                        <TableRow key={pIdx} className='*:align-top'>
                          <TableCell className='px-0'>{p.name}</TableCell>
                          <TableCell>{p.qty}</TableCell>
                          <TableCell>{p.item.variation || '-'}</TableCell>
                          <TableCell colSpan={2}>
                            <div className="flex flex-wrap gap-1">
                              {p.item?.modGroups?.length > 0 ? (
                                p.item.modGroups.map((group) =>
                                  group.mods.filter(mod => (mod.qty || 0) > 0).map((mod, modIndex) => (
                                    <Badge key={`${group._id}-${modIndex}`} variant="secondary" className="text-xs">
                                      {mod.qty > 1 && `${mod.qty}x `}{mod.name}
                                    </Badge>
                                  ))
                                )
                              ) : '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                </div>

              </CardContent>
            </Card>
          )
        })}
        </div>
      )}

        {/* No Orders State */}
        {!loading && filteredOrders.length === 0 && orders.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No orders match the selected filters.
          </div>
        )}
        {!loading && orders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No orders found for the selected time period.
          </div>
        )}
      </div>
    </div>
  );
}