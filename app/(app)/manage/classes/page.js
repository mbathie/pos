'use client';

import React, { useState, useEffect, useRef } from 'react';
// import { useImmer } from 'use-immer';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader,TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button";
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProductThumbnail } from '@/components/product-thumbnail';

export default function Page() {
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    product: 'all',
    type: 'all'
  });
  const router = useRouter();

  useEffect(() => {
    const fetchSchedules = async () => {
      const res = await fetch('/api/schedules');
      const data = await res.json();
      console.log(data)
      setSchedules(data);
      setFilteredSchedules(data);
      
      // Extract unique products for filter
      const uniqueProducts = [...new Map(data.map(item => 
        [item.product?._id, item.product]
      )).values()].filter(p => p);
      setProducts(uniqueProducts);
    };
    fetchSchedules();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    let filtered = [...schedules];
    
    // Filter by product
    if (filters.product !== 'all') {
      filtered = filtered.filter(s => s.product?._id === filters.product);
    }
    
    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(s => s.product?.type === filters.type);
    }
    
    setFilteredSchedules(filtered);
  }, [filters, schedules]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      product: 'all',
      type: 'all'
    });
  };

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
      <div className="flex justify-between items-center mb-4">
        <div className='font-semibold'>Classes & Courses</div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-end mb-4">
        <Select value={filters.product} onValueChange={(value) => handleFilterChange('product', value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map(product => (
              <SelectItem key={product._id} value={product._id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="class">Class</SelectItem>
            <SelectItem value="course">Course</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          onClick={clearFilters}
          className="ml-auto"
        >
          Reset
        </Button>
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
                <TableHead>Next Class</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedules.map((entry) => (
                <TableRow 
                  key={entry._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/manage/schedules/${entry._id}`)}
                >
                  {/* <TableCell className="align-top">{entry._id}</TableCell> */}

                  <TableCell>
                    <ProductThumbnail
                      src={entry.product?.thumbnail}
                      alt={entry.product?.name}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell className="align-top">{entry.product?.name}</TableCell>
                  <TableCell className="align-top">{entry.product?.type}</TableCell>
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
                    <ChevronRight className='size-5' />
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