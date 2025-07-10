'use client';

import React, { useState, useEffect, useRef } from 'react';
// import { useImmer } from 'use-immer';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader,TableRow } from "@/components/ui/table"
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProductIcon from '@/components/icon';

export default function Page() {
  const [casuals, setCasuals] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchCasuals = async () => {
      const res = await fetch('/api/schedules');
      const data = await res.json();
      console.log(data)
      setCasuals(data);
    };
    fetchCasuals();
  }, []);

  const getStatusLabel = (entry) => {
    const now = dayjs();
    const end = entry.end ? dayjs(entry.end) : null;
    const isExpired = end && end.isBefore(now);

    if (isExpired) return 'Expired';

    if (end) {
      const totalSeconds = end.diff(now, 'second');
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `Active ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return 'Active';
  };

  return (
    <div className='flex flex-col px-4'>
      <div className="flex">
        <div className='font-semibold mb-2'>Classes & Courses</div>
      </div>

      <Card className='p-0'>
        <CardContent className='p-0'>
          <Table>
            {/* <TableCaption>Casual Entries</TableCaption> */}
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Next Class</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {casuals.map((entry) => (
                <TableRow key={entry._id}>
                  {/* <TableCell className="align-top">{entry._id}</TableCell> */}

                  <TableCell>
                    <div className="relative size-6">
                      <ProductIcon size="sm" product={entry.product} />
                    </div>
                  </TableCell>
                  <TableCell className="align-top">{entry.product?.name}</TableCell>
                  <TableCell className="align-top">{entry.product?.type}</TableCell>
                  <TableCell className="align-top">
                    {entry.product?.type === 'course' ? (
                      `${entry.available}/${entry.capacity}`
                    ) : (
                      (() => {
                        const mostRecent = entry.classes?.reduce((latest, curr) => {
                          return !latest || dayjs(curr.datetime).isAfter(dayjs(latest.datetime)) ? curr : latest;
                        }, null);
                        return mostRecent ? `${mostRecent.available}/${entry.capacity}` : '-';
                      })()
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {(() => {
                      const now = dayjs();
                      const upcoming = entry.classes
                        ?.filter(c => dayjs(c.datetime).isAfter(now))
                        .sort((a, b) => dayjs(a.datetime).diff(dayjs(b.datetime)));

                      return upcoming?.length
                        ? `${dayjs(upcoming[0].datetime).format('DD/MM/YY hh:mm A')} (${dayjs(upcoming[0].datetime).fromNow(true).replace(' hours', 'h').replace(' hour', 'h').replace(' minutes', 'm').replace(' minute', 'm')})`
                        : '-';
                    })()}
                  </TableCell>
                  <TableCell>
                    <ChevronRight
                      className='size-5 cursor-pointer'
                      onClick={() => {
                        const path = `/manage/schedules/${entry._id}`;
                        router.push(path);
                      }}
                    />
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}