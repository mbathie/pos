'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Plus } from 'lucide-react';

export default function AccountingPage() {
  const [accountingCodes, setAccountingCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    tax: false
  });

  useEffect(() => {
    fetchAccountingCodes();
  }, []);

  const fetchAccountingCodes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/accounting`);
      const data = await res.json();
      setAccountingCodes(data.accounting || []);
    } catch (error) {
      console.error('Error fetching accounting codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCheckboxChange = (checked) => {
    console.log('Checkbox changed to:', checked);
    setFormData({ ...formData, tax: checked });
    console.log('Updated form data:', { ...formData, tax: checked });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Debug: Log the form data being submitted
    console.log('Form data being submitted:', formData);
    
    try {
      const url = currentCode 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/accounting/${currentCode._id}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/accounting`;
      
      const method = currentCode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setFormOpen(false);
        setFormData({ name: '', code: '', description: '', tax: false });
        setCurrentCode(null);
        fetchAccountingCodes();
      } else {
        const error = await res.json();
        alert(error.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error saving accounting code:', error);
      alert('Failed to save accounting code');
    }
  };

  const handleEdit = (code) => {
    setCurrentCode(code);
    setFormData({
      name: code.name,
      code: code.code,
      description: code.description || '',
      tax: code.tax || false
    });
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!currentCode) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/accounting/${currentCode._id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setDeleteDialogOpen(false);
        setCurrentCode(null);
        fetchAccountingCodes();
      } else {
        const error = await res.json();
        alert(error.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error deleting accounting code:', error);
      alert('Failed to delete accounting code');
    }
  };

  const openDeleteDialog = (code) => {
    setCurrentCode(code);
    setDeleteDialogOpen(true);
  };

  const addNewCode = () => {
    setCurrentCode(null);
    setFormData({ name: '', code: '', description: '', tax: false });
    setFormOpen(true);
  };

  const toggleTax = async (code) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/accounting/${code._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: code.name,
          code: code.code,
          description: code.description,
          tax: !code.tax
        })
      });
      
      if (res.ok) {
        // Update the local state instead of re-fetching all records
        setAccountingCodes(prevCodes => 
          prevCodes.map(c => 
            c._id === code._id 
              ? { ...c, tax: !c.tax }
              : c
          )
        );
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update tax setting');
      }
    } catch (error) {
      console.error('Error updating tax setting:', error);
      alert('Failed to update tax setting');
    }
  };

  return (
    <Card className="mx-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Accounting Codes</CardTitle>
            <CardDescription>Manage accounting codes for your products</CardDescription>
          </div>
          <Button onClick={addNewCode}>
            <Plus className="mr-2 h-4 w-4" /> Add Code
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading accounting codes...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Inc Tax</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountingCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No accounting codes found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                accountingCodes.map((code) => (
                  <TableRow key={code._id}>
                    <TableCell>{code.name}</TableCell>
                    <TableCell>{code.code}</TableCell>
                    <TableCell>{code.description || '-'}</TableCell>
                    <TableCell>
                      <Checkbox 
                        checked={code.tax || false} 
                        onCheckedChange={() => toggleTax(code)} 
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(code)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(code)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {/* Add/Edit Form Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentCode ? 'Edit Accounting Code' : 'Add Accounting Code'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFormSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tax"
                    checked={formData.tax}
                    onCheckedChange={handleCheckboxChange}
                  />
                  <Label htmlFor="tax">Includes Tax</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the accounting code "{currentCode?.name}".
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
} 