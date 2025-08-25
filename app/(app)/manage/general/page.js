'use client';

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader,TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

export default function Page() {
  const [generals, setGenerals] = useState([]);
  const [filteredGenerals, setFilteredGenerals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [products, setProducts] = useState([]);

  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const interval = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchGenerals = async () => {
      const res = await fetch('/api/generals');
      const data = await res.json();
      console.log(data)
      setGenerals(data);
      setFilteredGenerals(data);
      
      // Extract unique products for filter
      const uniqueProducts = [...new Set(data.map(g => g.product?.name))].filter(Boolean);
      setProducts(uniqueProducts);
    };
    fetchGenerals();
  }, []);

  // Filter generals based on search and product selection
  useEffect(() => {
    let filtered = generals;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.customer?.name?.toLowerCase().includes(query) ||
        entry.customer?.email?.toLowerCase().includes(query) ||
        entry.customer?.memberId?.toString().includes(query)
      );
    }
    
    // Apply product filter
    if (selectedProduct !== 'all') {
      filtered = filtered.filter(entry => entry.product?.name === selectedProduct);
    }
    
    setFilteredGenerals(filtered);
  }, [searchQuery, selectedProduct, generals]);

  const getStatusLabel = (entry, now) => {
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
      <div className='font-semibold mb-2'>General Entries</div>
      
      <div className="flex gap-2 items-center mb-4">
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
          <Input
            placeholder="Search by name, email, or member ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-[300px]"
          />
        </div>
        
        {/* Product Filter */}
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map(product => (
              <SelectItem key={product} value={product}>
                {product}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Results Count */}
        <Badge variant="secondary">
          {filteredGenerals.length} {filteredGenerals.length === 1 ? 'entry' : 'entries'}
        </Badge>
      </div>

      <Card className='p-0'>
        <CardContent className='p-0'>
          <Table>
            {/* <TableCaption>General Entries</TableCaption> */}
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Member #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGenerals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery || selectedProduct !== 'all' 
                      ? 'No entries found matching your filters' 
                      : 'No general entries yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredGenerals.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <div className="font-medium">{entry.customer?.name || 'Guest'}</div>
                        <div className="text-sm text-muted-foreground">{entry.customer?.email}</div>
                        {entry.customer?.phone && (
                          <div className="text-sm text-muted-foreground">{entry.customer?.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {entry.customer?.memberId || '-'}
                    </TableCell>
                    <TableCell className="align-top">
                      {entry.product?.name}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={entry.end && dayjs(entry.end).isBefore(dayjs()) ? 'destructive' : 'default'}>
                        {getStatusLabel(entry, now)}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {dayjs(entry.start).format("DD/MM/YY h:mm A")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}