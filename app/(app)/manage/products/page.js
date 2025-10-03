'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, X, ChevronsUpDown, Edit, Warehouse, Image, Tag } from 'lucide-react';
import colors from '@/lib/tailwind-colors';
import AccountingSelect from '@/app/(app)/products/shop/accounting-select';

export default function ManageProductsPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all',
    search: '',
    publish: 'all',
  });
  const [sort, setSort] = useState({
    field: null,
    direction: 'asc', // 'asc' or 'desc'
  });
  const [editDialog, setEditDialog] = useState({
    open: false,
    product: null,
  });
  const [editForm, setEditForm] = useState({
    name: '',
    qty: '',
    par: '',
    accounting: null,
  });
  const [receiveDialog, setReceiveDialog] = useState({
    open: false,
    product: null,
  });
  const [receiveForm, setReceiveForm] = useState({
    quantity: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setAllProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      search: '',
      publish: 'all',
    });
  };

  const updateBumpStatus = async (productId, bumpValue) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product: { bump: bumpValue } }),
      });

      if (res.ok) {
        // Update the local state
        setAllProducts(prev => 
          prev.map(product => 
            product._id === productId 
              ? { ...product, bump: bumpValue }
              : product
          )
        );
        console.log('Bump status updated successfully');
      } else {
        console.error('Failed to update bump status');
        // You could add a toast notification here for error feedback
      }
    } catch (error) {
      console.error('Error updating bump status:', error);
    }
  };

  const updatePublishStatus = async (productId, publishValue) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product: { publish: publishValue } }),
      });

      if (res.ok) {
        // Update the local state
        setAllProducts(prev => 
          prev.map(product => 
            product._id === productId 
              ? { ...product, publish: publishValue }
              : product
          )
        );
        console.log('Publish status updated successfully');
      } else {
        console.error('Failed to update publish status');
      }
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
  };

  const handleSort = (field) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const openEditDialog = (product) => {
    setEditForm({
      name: product.name || '',
      qty: product.qty || '',
      par: product.par || '',
      accounting: product.accounting || null,
    });
    setEditDialog({
      open: true,
      product: product,
    });
  };

  const closeEditDialog = () => {
    setEditDialog({
      open: false,
      product: null,
    });
    setEditForm({
      name: '',
      qty: '',
      par: '',
      accounting: null,
    });
  };

  const saveEditChanges = async () => {
    try {
      const res = await fetch(`/api/products/${editDialog.product._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          product: { 
            name: editForm.name,
            qty: parseInt(editForm.qty) || 0,
            par: parseInt(editForm.par) || 0,
            accounting: editForm.accounting?._id || editForm.accounting,
          } 
        }),
      });

      if (res.ok) {
        const { product: updatedProduct } = await res.json();
        // Update the local state with the fully populated product data
        setAllProducts(prev => 
          prev.map(product => 
            product._id === editDialog.product._id 
              ? { ...product, ...updatedProduct }
              : product
          )
        );
        closeEditDialog();
        console.log('Product updated successfully');
      } else {
        console.error('Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const openReceiveDialog = (product) => {
    setReceiveForm({
      quantity: '',
    });
    setReceiveDialog({
      open: true,
      product: product,
    });
  };

  const closeReceiveDialog = () => {
    setReceiveDialog({
      open: false,
      product: null,
    });
    setReceiveForm({
      quantity: '',
    });
  };

  const saveReceiveChanges = async () => {
    try {
      const quantityToAdd = parseInt(receiveForm.quantity) || 0;
      if (quantityToAdd <= 0) {
        alert('Please enter a valid quantity greater than 0');
        return;
      }

      const currentQty = receiveDialog.product.qty || 0;
      const newQty = currentQty + quantityToAdd;

      const res = await fetch(`/api/products/${receiveDialog.product._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          product: { 
            qty: newQty,
          } 
        }),
      });

      if (res.ok) {
        const { product: updatedProduct } = await res.json();
        // Update the local state with the new quantity
        setAllProducts(prev => 
          prev.map(product => 
            product._id === receiveDialog.product._id 
              ? { ...product, qty: newQty }
              : product
          )
        );
        closeReceiveDialog();
        console.log('Stock received successfully');
      } else {
        console.error('Failed to receive stock');
      }
    } catch (error) {
      console.error('Error receiving stock:', error);
    }
  };

  // Filter and sort products locally
  const filteredProducts = allProducts
    .filter(product => {
      const matchesCategory = filters.category === 'all' || product.category?._id === filters.category;
      const matchesSearch = !filters.search || 
        product.name.toLowerCase().includes(filters.search.toLowerCase());
      const matchesPublish = filters.publish === 'all' || 
        (filters.publish === 'published' && product.publish !== false) ||
        (filters.publish === 'unpublished' && product.publish === false);
      return matchesCategory && matchesSearch && matchesPublish;
    })
    .sort((a, b) => {
      if (!sort.field) return 0;
      
      let aValue, bValue;
      
      switch (sort.field) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'category':
          aValue = a.category?.name?.toLowerCase() || '';
          bValue = b.category?.name?.toLowerCase() || '';
          break;
        case 'accounting':
          aValue = a.accounting?.name?.toLowerCase() || '';
          bValue = b.accounting?.name?.toLowerCase() || '';
          break;
        case 'folder':
          aValue = a.folder?.name?.toLowerCase() || '';
          bValue = b.folder?.name?.toLowerCase() || '';
          break;
        case 'menu':
          aValue = a.category?.menu?.toLowerCase() || '';
          bValue = b.category?.menu?.toLowerCase() || '';
          break;
        case 'bump':
          aValue = a.bump === true ? 1 : 0;
          bValue = b.bump === true ? 1 : 0;
          break;
        case 'publish':
          aValue = a.publish !== false ? 1 : 0;
          bValue = b.publish !== false ? 1 : 0;
          break;
        case 'qty':
          aValue = a.qty || 0;
          bValue = b.qty || 0;
          break;
        case 'par':
          aValue = a.par || 0;
          bValue = b.par || 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const hasActiveFilters = (filters.category && filters.category !== 'all') || filters.search || (filters.publish && filters.publish !== 'all');

  return (
    <div className="mx-auto px-4 max-w-7xl h-screen flex flex-col py-4">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-medium mb-1">Products Management</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all products with inventory tracking and accounting codes
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-end mb-4 flex-shrink-0">
        <div className="max-w-xs">
          <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category._id} value={category._id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-w-xs">
          <Select value={filters.publish} onValueChange={(value) => handleFilterChange('publish', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="unpublished">Unpublished</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
            <Input
              placeholder="Product name"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
            Reset
          </Button>
        )}

        <Badge variant="secondary" className="text-sm ml-auto">
          {loading ? 'Loading...' : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`}
        </Badge>
      </div>

      {/* Products Table */}
      {loading && allProducts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground flex-1 flex items-center justify-center">
          Loading products...
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative overflow-hidden rounded-lg border">
          <div className="h-full overflow-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="sticky top-0 z-10 bg-muted/50 border-b">
                <tr>
                  <th 
                    className="h-12 px-4 text-left align-middle text-muted-foreground cursor-pointer hover:bg-muted w-1/4"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </th>
                  <th 
                    className="h-12 px-4 text-left align-middle text-muted-foreground cursor-pointer hover:bg-muted w-1/6"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center">
                      Category
                      <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </th>
                  <th 
                    className="h-12 px-4 text-left align-middle text-muted-foreground cursor-pointer hover:bg-muted w-1/6"
                    onClick={() => handleSort('accounting')}
                  >
                    <div className="flex items-center">
                      Acct. Code
                      <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </th>
                  <th 
                    className="h-12 px-4 text-left align-middle text-muted-foreground cursor-pointer hover:bg-muted w-1/6"
                    onClick={() => handleSort('folder')}
                  >
                    <div className="flex items-center">
                      Folder
                      <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </th>
                  <th 
                    className="h-12 px-4 text-center align-middle text-muted-foreground cursor-pointer hover:bg-muted w-16"
                    onClick={() => handleSort('qty')}
                  >
                    <div className="flex items-center justify-center">
                      Qty
                      <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </th>
                  <th 
                    className="h-12 px-4 text-center align-middle text-muted-foreground cursor-pointer hover:bg-muted w-16"
                    onClick={() => handleSort('par')}
                  >
                    <div className="flex items-center justify-center">
                      Par
                      <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </th>
                  <th 
                    className="h-12 px-4 text-center align-middle text-muted-foreground cursor-pointer hover:bg-muted w-16"
                    onClick={() => handleSort('bump')}
                  >
                    <div className="flex items-center justify-center">
                      Bump
                      <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </th>
                    <th 
                      className="h-12 px-4 text-center align-middle text-muted-foreground cursor-pointer hover:bg-muted w-20"
                      onClick={() => handleSort('publish')}
                    >
                      <div className="flex items-center justify-center">
                        Publish
                        <ChevronsUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </th>
                    <th className="h-12 px-4 text-right align-middle text-muted-foreground w-24">
                      
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                        <td colSpan={9} className="text-center py-8 text-muted-foreground">
                          {hasActiveFilters ? 'No products match your filters.' : 
                           allProducts.length === 0 ? 'No products found.' : 'No products match your filters.'}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr key={product._id} className="hover:bg-muted/50 border-b">
                          <td className="px-4 py-3 align-middle w-1/4">
                            <div className="flex items-center gap-2">
                              {product.thumbnail ? (
                                <img 
                                  src={product.thumbnail} 
                                  alt={product.name} 
                                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                  <Tag className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <span>{product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div className="flex items-center gap-2">
                              {product.category?.thumbnail ? (
                                <img
                                  src={product.category.thumbnail}
                                  alt={product.category?.name}
                                  className="w-8 h-8 rounded object-cover invert flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                  <Tag className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <span>{product.category?.name || ''}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle w-1/6">
                            {product.accounting ? (
                              <div className="flex flex-col">
                                <span>{product.accounting.name}</span>
                                <span className="text-xs text-muted-foreground">({product.accounting.code})</span>
                              </div>
                            ) : (
                              <span></span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle w-1/6">
                            {product.folder ? (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="size-4 rounded-sm border flex-shrink-0"
                                  style={{ backgroundColor: product.folder.color ? colors?.[product.folder.color.split('-')[0]]?.[product.folder.color.split('-')[1]] : '#e5e7eb' }}
                                />
                                <Badge variant="outline" className="text-xs">
                                  {product.folder.name}
                                </Badge>
                              </div>
                            ) : (
                              <span></span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle text-center w-16">
                            <span className={
                              product.qty !== null && 
                              product.qty !== undefined && 
                              product.par !== null && 
                              product.par !== undefined && 
                              product.qty <= product.par && 
                              product.qty > 0
                                ? 'text-destructive' 
                                : ''
                            }>
                              {product.qty || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-center w-16">
                            {product.par || 0}
                          </td>
                          <td className="px-4 py-3 align-middle text-center w-16">
                            <Checkbox
                              checked={product.bump === true}
                              onCheckedChange={(checked) => {
                                updateBumpStatus(product._id, checked);
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 align-middle text-center w-20">
                            <Checkbox
                              checked={product.publish !== false}
                              onCheckedChange={(checked) => {
                                updatePublishStatus(product._id, checked);
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 align-middle text-right w-24">
                            <div className="flex gap-2 justify-end pr-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openReceiveDialog(product)}
                                className="cursor-pointer size-4 p-0"
                                title="Receive Stock"
                              >
                                <Warehouse className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(product)}
                                className="cursor-pointer size-4 p-0"
                                title="Edit Product"
                              >
                                <Edit className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

      {/* Edit Product Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => {
        if (!open) closeEditDialog();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                {editDialog.product?.thumbnail ? (
                  <img 
                    src={editDialog.product.thumbnail} 
                    alt={editDialog.product.name} 
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                Edit Product
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  value={editForm.qty}
                  onChange={(e) => setEditForm(prev => ({ ...prev, qty: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="par">Par Level</Label>
                <Input
                  id="par"
                  type="number"
                  min="0"
                  value={editForm.par}
                  onChange={(e) => setEditForm(prev => ({ ...prev, par: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Accounting Code</Label>
              <AccountingSelect
                value={editForm.accounting}
                onChange={(value) => setEditForm(prev => ({ ...prev, accounting: value }))}
                className="text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
              <Button onClick={saveEditChanges}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receive Stock Dialog */}
      <Dialog open={receiveDialog.open} onOpenChange={(open) => {
        if (!open) closeReceiveDialog();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receive Stock - {receiveDialog.product?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Stock: {receiveDialog.product?.qty || 0}</Label>
              <Label htmlFor="receive-quantity">Quantity to Receive</Label>
              <Input
                id="receive-quantity"
                type="number"
                min="1"
                value={receiveForm.quantity}
                onChange={(e) => setReceiveForm(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity to add"
                className="text-sm"
              />
              {receiveForm.quantity && (
                <p className="text-sm text-muted-foreground">
                  New total: {(receiveDialog.product?.qty || 0) + (parseInt(receiveForm.quantity) || 0)}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeReceiveDialog}>
                Cancel
              </Button>
              <Button onClick={saveReceiveChanges}>
                Receive Stock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 