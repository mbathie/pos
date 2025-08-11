'use client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { useEffect, useState } from "react";
// import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@radix-ui/react-separator';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader,TableRow } from "@/components/ui/table"
// import { Checkbox } from "@/components/ui/checkbox"
import { Button } from '@/components/ui/button'
import { Ellipsis, Check } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// import Image from 'next/image'
import ProductIcon from '@/components/icon';

export default function Page({ schedule, setSchedule }) {

  // const isIcon = !schedule.product?.thumbnail || schedule.product.thumbnail.includes("thenounproject.com");

  if (!schedule?.product?.name) return null

  return (
    <Card className='p-4'>
      <CardContent className='p-0'>

        <Table className='m-0'>
          <TableBody>

            <TableRow>
              <TableCell colSpan={4}>
                <div className="relative w-[50px] h-[50px]">
                  <ProductIcon product={schedule.product} size="md" />
                </div>
              </TableCell>
            </TableRow>

            <TableRow className="border-0">
              <TableCell className='font-semibold'>Product Name</TableCell>
              <TableCell colSpan={4}>{schedule.product.name}</TableCell>
            </TableRow>
            <TableRow className="border-0">
              <TableCell className='font-semibold'>Capacity</TableCell>
              <TableCell colSpan={4}>{schedule.product.capacity}</TableCell>
            </TableRow>
            {schedule.product.type == 'course' &&
            <TableRow className="border-0">
              <TableCell className='font-semibold'>Availability</TableCell>
              <TableCell colSpan={4}>{schedule.available}</TableCell>
            </TableRow>
            }
            <TableRow>
              <TableCell colSpan={4} className='font-semibold'>Variations</TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="align-top">
                {schedule.product.variations.map((v, vIdx) => {
                  return (
                    <div key={vIdx} className='flex flex-col'>
                        {v.prices.map((p, pIdx) => {
                          return (
                            <div key={pIdx}>
                              {p.name} ${Number(p.value).toFixed(2)}
                            </div>
                          )
                        })}
                    </div>
                  )
                })}
              </TableCell>

              <TableCell colSpan={4}>
                {schedule.product.variations.map((v, vIdx) => {
                  return (
                    <div key={vIdx} className='flex flex-col'>
                        {v.times.map((t, tIdx) => {
                          return (
                            <div key={tIdx}>
                              <div>{dayjs(t.start).format('DD/MM/YY hh:mm A')}</div>
                              <div>Repeats every: {t.repeatInterval} day</div>
                              <div>
                                Ends: {t.repeatAlways
                                  ? 'Until cancel'
                                  : (() => {
                                      const end = dayjs(t.start).add((t.repeatCnt - 1) * t.repeatInterval, 'day');
                                      return `${end.format('DD/MM/YY hh:mm A')} (${end.diff(dayjs(t.start), 'day')} days)`;
                                    })()}
                              </div>
                              <div>
                                Next Class: {(() => {
                                  const now = dayjs();
                                  let next = dayjs(t.start);
                                  const interval = t.repeatInterval;
                                  const end = t.repeatAlways ? null : dayjs(t.repeatEnd);

                                  while (next.isBefore(now)) {
                                    next = next.add(interval, 'day');
                                    if (end && next.isAfter(end)) return 'Expired';
                                  }

                                  return `${next.format('DD/MM/YY hh:mm A')} (${next.fromNow(true)})`;
                                })()}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )
                })}
              </TableCell>
            </TableRow>

            <TableRow className='border-0'>
              <TableCell className='font-semibold'>
                Classes
              </TableCell>
              {schedule.product.type == 'class' &&
              <TableCell className='font-semibold'>
                Available
              </TableCell>
              }
              <TableCell className='font-semibold'>
                Enrollment
              </TableCell>
              <TableCell className='font-semibold'>
                Status
              </TableCell>
            </TableRow>

            {schedule.classes.map((c, cIdx) => {
              return (
                <TableRow key={cIdx}>
                  <TableCell className="align-top flex flex-col">
                    <div>{dayjs(c.datetime).format('DD/MM/YY')}</div>
                    <div>{dayjs(c.datetime).format('hh:mm A')}</div>
                  </TableCell>
                  {schedule.product.type == 'class' &&
                  <TableCell className="align-top">
                    {c.available}
                  </TableCell>
                  }
                  <TableCell className='align-top'>
                    <div className='flex flex-col gap-2'>
                      {c.customers.map((cust, custIdx) => {
                        return (
                          <div key={cust._id} className='flex flex-col'>
                            <div>{cust.customer.name}</div>
                            <div>{cust.customer.phone}</div>
                            <div>{cust.customer.memberId}</div>

                          </div>
                        )
                      })}
                    </div>
                  </TableCell>
                  <TableCell className='align-top'>
                    <div className='align-top flex flex-col gap-2'>
                      {c.customers.map((cust, custIdx) => {
                        return (
                          <div key={custIdx} className='flex gap-4'>
                            <div>{cust.status}</div>
                            <div className='flex-1'/>
                            <ManageCustomer 
                              schedule={schedule}
                              scheduleId={schedule._id} 
                              customer={cust}
                              classId={c._id}
                              setSchedule={setSchedule}
                            />
                          </div>
                        )
                      })}
                    </div>
                    

                  </TableCell>

                </TableRow>
              )
            })}

          </TableBody>
        </Table>

      </CardContent>
    </Card>
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
        variant={customer.status === "checked in" ? undefined : "secondary"}
        size="icon"
        onClick={() => handleUpdateStatus(customer.status === "checked in" ? "cancel" : "checkin")}
        disabled={customer.status === "checked in"}
      >
        <Check className='size-4' />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger><Ellipsis className='size-5' /></DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Set Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleUpdateStatus("confirmed")}>Confirmed</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpdateStatus("checkin")}>Checkin</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpdateStatus("cancel")}>Cancel</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
