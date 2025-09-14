'use client';

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, Filter } from "lucide-react"

export default function Page() {
  const [generals, setGenerals] = useState([]);
  const [filteredGenerals, setFilteredGenerals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [timeFilter, setTimeFilter] = useState('24');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGenerals = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/generals?hours=${timeFilter}`);
        const data = await res.json();
        setGenerals(data);
        setFilteredGenerals(data);
        
        // Extract unique products for filter
        const uniqueProducts = [...new Set(data.map(g => g.product?.name))].filter(Boolean);
        setProducts(uniqueProducts);
      } catch (error) {
        console.error('Error fetching generals:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGenerals();
  }, [timeFilter]);

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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedProduct('all');
    setTimeFilter('24');
  };

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-2">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-medium">General Entries</h1>
            <p className="text-sm text-muted-foreground">
              View general product entries and customer assignments
            </p>
          </div>
          <Badge variant="secondary">
            {filteredGenerals.length} {filteredGenerals.length === 1 ? 'entry' : 'entries'}
          </Badge>
        </div>

        {/* Filters */}
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

          {/* Time Filter */}
          <Select value={timeFilter} onValueChange={setTimeFilter}>
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

          {/* Clear Filters */}
          <Button variant="outline" onClick={clearFilters}>
            <Filter className="size-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 flex flex-col overflow-hidden mx-4 mb-4">
        <div className="flex-1 flex flex-col overflow-hidden bg-card rounded-lg border">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10 border-b font-medium">
                <tr>
                  <th className="px-6 py-4 text-left text-sm text-muted-foreground">Member</th>
                  <th className="px-6 py-4 text-left text-sm text-muted-foreground">Member #</th>
                  <th className="px-6 py-4 text-left text-sm text-muted-foreground">Product</th>
                  <th className="px-6 py-4 text-left text-sm text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredGenerals.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      {loading ? 'Loading entries...' : (
                        searchQuery || selectedProduct !== 'all' 
                          ? 'No entries found matching your filters' 
                          : 'No general entries yet'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredGenerals.map((entry) => (
                    <tr key={entry._id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="text-foreground">{entry.customer?.name || 'Walk-in'}</div>
                          {entry.customer?.email && (
                            <div className="text-sm text-muted-foreground">{entry.customer?.email}</div>
                          )}
                          {entry.customer?.phone && (
                            <div className="text-sm text-muted-foreground">{entry.customer?.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {entry.customer?.memberId || '-'}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {entry.product?.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <div>{dayjs(entry.start).format("MMM DD, YYYY")}</div>
                          <div className="text-sm">{dayjs(entry.start).format("h:mm A")}</div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}