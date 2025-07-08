'use client';

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader,TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function Page() {
  const [casuals, setCasuals] = useState([]);

  useEffect(() => {
    const fetchCasuals = async () => {
      const res = await fetch('/api/casuals');
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
        <div className='font-semibold mb-2'>Casual Entries</div>
      </div>

      <Card className='p-0'>
        <CardContent className='p-0'>
          <Table>
            {/* <TableCaption>Casual Entries</TableCaption> */}
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Member #</TableHead>
                <TableHead>From / To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Product</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {casuals.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell className="align-top flex flex-col">
                    <div>{entry.customer?.name}</div>
                    <div>{entry.customer?.email}</div>
                    <div>{entry.customer?.phone}</div>
                  </TableCell>
                  <TableCell className="align-top">{entry.customer?.memberId}</TableCell>
                  <TableCell>
                    <div>
                      <div>{dayjs(entry.start).format("DD/MM/YY hh:mm A")}</div>
                      <div>{entry.end ? dayjs(entry.end).format("DD/MM/YY hh:mm A") : '-'}</div>
                      <div>{entry.hours ?? '-'}h</div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top flex">
                    <Badge variant={entry.end && dayjs(entry.end).isBefore(dayjs()) ? 'destructive' : 'default'}>
                      {getStatusLabel(entry)}
                    </Badge>

                  </TableCell>
                  <TableCell className="align-top">{entry.product.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}