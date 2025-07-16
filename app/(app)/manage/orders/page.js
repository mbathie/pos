'use client'
import colors from 'tailwindcss/colors';
import { useEffect, useState } from "react";
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader,TableRow } from "@/components/ui/table"
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button } from "@/components/ui/button";
import { Circle, CircleCheck, CircleX } from "lucide-react";
dayjs.extend(relativeTime);

export default function Page({ params }) {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(dayjs());

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
      icon: Circle,
      color: 'yellow-500'
    },
    'cancelled': {
      icon: CircleX,
      color: 'red-500'
    },
    'completed': {
      icon: CircleCheck,
      color: 'green-500'
    }
  }

  useEffect(() => {
    async function getOrders() {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/orders?hours=24`);
      const data = await res.json();
      setOrders(data);
    }
    getOrders();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(dayjs());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-4">

      <div className="flex flex-col gap-4">
        {orders?.map((o, oIdx) => {
          return (
            <Card key={o._id}>
              <CardContent>
                <div className="flex gap-4 flex-col">

                  <div className="flex gap-4">
                    <div>
                      <div className="flex flex-row items-center gap-2 text-lg font-bold">
                        {statuses[o.status] && (() => {
                          const { icon: StatusIcon, color } = statuses[o.status];
                          return (
                            <StatusIcon
                              className="size-5 stroke-4"
                              style={{
                                color: colors[color.split('-')[0]][color.split('-')[1]]
                              }}
                            />
                          );
                        })()}
                        <div>Order #</div>
                        <div>{o.orderNumber || 0}</div>
                      </div>
                      <div className="flex flex-col text-xs text-muted-foreground">
                        <div>{o?.customer?.name}, {o?.customer?.phone}</div>
                        <div className="text-xs text-muted-foreground">{o.customer?.memberId}</div>
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
                        <div className="text-lg font-bold">{dayjs(o.createdAt).format('h:mm A')}</div>
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
                        <TableHead className="w-1/5">Mods</TableHead>
                        <TableHead className="w-1/5"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className='p-0 m-0'>
                      {o.products?.map((p, pIdx) => (
                        <TableRow key={pIdx} className='*:align-top'>
                          <TableCell className='px-0'>{p.name}</TableCell>
                          <TableCell>{p.qty}</TableCell>
                          <TableCell>{p.item.variation || '-'}</TableCell>
                          <TableCell>
                            {Array.isArray(p.item?.modCats)
                              ? p.item.modCats.map((modCat, mIdx) => (
                                  <div key={mIdx}>{modCat.name}</div>
                                ))
                              : null}
                          </TableCell>
                          <TableCell>
                            {Array.isArray(p.item?.modCats)
                              ? p.item.modCats.map((modCat, mIdx) => (
                                  <div key={mIdx}>
                                    {modCat.mods?.filter(mod => mod.selected).map((mod, i) => (
                                      <div key={i}>{mod.name}</div>
                                    ))}
                                  </div>
                                ))
                              : null}
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

    </div>
    // <div className="px-4">
    //   <Card className='p-0'>
    //     <CardContent className='p-0'>
    //       <Table>
    //         <TableHeader>
    //           <TableRow>
    //             <TableHead>Order #</TableHead>
    //             <TableHead>Time</TableHead>
    //             <TableHead>Customer</TableHead>
    //             <TableHead>Products</TableHead>
    //             <TableHead></TableHead>
    //           </TableRow>
    //         </TableHeader>
    //         <TableBody>
    //           {Array.isArray(orders) && orders.map((order) => (
    //             <TableRow key={order._id}>
    //               <TableCell>{order.orderNumber}</TableCell>
    //               <TableCell>
    //                 <div>{dayjs(order.createdAt).format('h:mm A')}</div>
    //                 <div className="text-xs text-muted-foreground">{dayjs(order.createdAt).fromNow()}</div>
    //               </TableCell>
    //               <TableCell className="align-top">
    //                 <div>{order.customer?.name}</div>
    //                 <div className="text-xs text-muted-foreground">{order.customer?.memberId}</div>
    //               </TableCell>
    //               <TableCell></TableCell>
    //               <TableCell></TableCell>
    //             </TableRow>
    //           ))}
    //         </TableBody>
    //       </Table>
    //     </CardContent>
    //   </Card>


    // </div>
  );
}