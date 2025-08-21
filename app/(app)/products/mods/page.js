'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  GripVertical, 
  Edit2, 
  Trash2, 
  MoreVertical, 
  DollarSign,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// Sortable Mod Item Component
function SortableMod({ mod, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mod._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "inline-flex items-center gap-2 p-2 rounded-lg bg-background border",
        isDragging && "shadow-lg"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <Button
        variant="ghost"
        className="p-0 h-auto font-medium hover:bg-transparent"
        onClick={() => onEdit(mod)}
      >
        {mod.name}
        {mod.price > 0 && (
          <span className="ml-2 text-muted-foreground">
            ${mod.price.toFixed(2)}
          </span>
        )}
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(mod)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDelete(mod)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ModGroup Card Component
function ModGroupCard({ modGroup, onModsReorder, onModEdit, onModDelete, onModAdd, onGroupEdit, onGroupDelete }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = modGroup.mods.findIndex((mod) => mod._id === active.id);
      const newIndex = modGroup.mods.findIndex((mod) => mod._id === over.id);
      
      onModsReorder(modGroup._id, arrayMove(modGroup.mods, oldIndex, newIndex));
    }
  };

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text">{modGroup.name}</CardTitle>
            <div className="flex gap-2">
              {modGroup.allowMultiple && (
                <Badge variant="secondary">Multiple</Badge>
              )}
              {modGroup.required && (
                <Badge variant="secondary">Required</Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onGroupEdit(modGroup)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Group
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onGroupDelete(modGroup)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={modGroup.mods.map(m => m._id)}
            strategy={rectSortingStrategy}
          >
            <div className="flex flex-wrap gap-2">
              {modGroup.mods.map((mod) => (
                <SortableMod
                  key={mod._id}
                  mod={mod}
                  onEdit={onModEdit}
                  onDelete={onModDelete}
                />
              ))}
              <Button
                variant=""
                className="inline-flex items-center h-10"
                onClick={() => onModAdd(modGroup)}
              >
                <Plus className="size-4" />
                Mod
              </Button>
            </div>
          </SortableContext>
        </DndContext>
        {modGroup.mods && modGroup.mods.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            No modifications yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ModsPage() {
  const [modGroups, setModGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [modDialogOpen, setModDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Form states
  const [editingMod, setEditingMod] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroupForMod, setSelectedGroupForMod] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [modForm, setModForm] = useState({
    name: '',
    price: 0,
    isDefault: false
  });
  
  const [groupForm, setGroupForm] = useState({
    name: '',
    allowMultiple: false,
    required: false
  });

  useEffect(() => {
    fetchModGroups();
  }, []);

  const fetchModGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/modgroups?includeMods=true`);
      const data = await res.json();
      setModGroups(data.modGroups || []);
    } catch (error) {
      console.error('Error fetching mod groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModsReorder = async (groupId, reorderedMods) => {
    // Update local state immediately
    setModGroups(prev => prev.map(group => 
      group._id === groupId 
        ? { ...group, mods: reorderedMods.map((mod, idx) => ({ ...mod, order: idx })) }
        : group
    ));

    // Save to backend
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/mods`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mods: reorderedMods.map((mod, idx) => ({
            _id: mod._id,
            order: idx
          }))
        })
      });
    } catch (error) {
      console.error('Error saving mod order:', error);
      // Revert on error
      fetchModGroups();
    }
  };

  const handleModAdd = (group) => {
    setSelectedGroupForMod(group);
    setEditingMod(null);
    setModForm({ name: '', price: 0, isDefault: false });
    setModDialogOpen(true);
  };

  const handleModEdit = (mod) => {
    setEditingMod(mod);
    setModForm({
      name: mod.name,
      price: mod.price || 0,
      isDefault: mod.isDefault || false
    });
    setModDialogOpen(true);
  };

  const handleModSave = async () => {
    try {
      setSaving(true);
      
      if (editingMod) {
        // Update existing mod
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/mods/${editingMod._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modForm)
        });
        
        if (res.ok) {
          await fetchModGroups();
          setModDialogOpen(false);
        }
      } else {
        // Create new mod
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/mods`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...modForm,
            modGroup: selectedGroupForMod._id
          })
        });
        
        if (res.ok) {
          await fetchModGroups();
          setModDialogOpen(false);
        }
      }
    } catch (error) {
      console.error('Error saving mod:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleModDelete = (mod) => {
    setItemToDelete({ type: 'mod', item: mod });
    setDeleteDialogOpen(true);
  };

  const handleGroupAdd = () => {
    setEditingGroup(null);
    setGroupForm({ name: '', allowMultiple: false, required: false });
    setGroupDialogOpen(true);
  };

  const handleGroupEdit = (group) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      allowMultiple: group.allowMultiple || false,
      required: group.required || false
    });
    setGroupDialogOpen(true);
  };

  const handleGroupSave = async () => {
    try {
      setSaving(true);
      
      if (editingGroup) {
        // Update existing group
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/modgroups/${editingGroup._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(groupForm)
        });
        
        if (res.ok) {
          await fetchModGroups();
          setGroupDialogOpen(false);
        }
      } else {
        // Create new group
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/modgroups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(groupForm)
        });
        
        if (res.ok) {
          await fetchModGroups();
          setGroupDialogOpen(false);
        }
      }
    } catch (error) {
      console.error('Error saving group:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleGroupDelete = (group) => {
    setItemToDelete({ type: 'group', item: group });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      setSaving(true);
      
      if (itemToDelete.type === 'mod') {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/mods/${itemToDelete.item._id}`, {
          method: 'DELETE'
        });
      } else if (itemToDelete.type === 'group') {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/modgroups/${itemToDelete.item._id}`, {
          method: 'DELETE'
        });
      }
      
      await fetchModGroups();
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold">Product Modifications</h1>
          {/* <p className="text-muted-foreground">Manage modification for use in retail / shop products</p> */}
        </div>
        <Button onClick={handleGroupAdd}>
          <Plus size="sm" className="h-4 w-4" />
          Add Group
        </Button>
      </div>

      <div className="space-y-4">
        {modGroups.map((group) => (
          <ModGroupCard
            key={group._id}
            modGroup={group}
            onModsReorder={handleModsReorder}
            onModEdit={handleModEdit}
            onModDelete={handleModDelete}
            onModAdd={handleModAdd}
            onGroupEdit={handleGroupEdit}
            onGroupDelete={handleGroupDelete}
          />
        ))}
        
        {modGroups.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">No modification groups yet</p>
              <Button onClick={handleGroupAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mod Dialog */}
      <Dialog open={modDialogOpen} onOpenChange={setModDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMod ? 'Edit Modification' : 'Add Modification'}
            </DialogTitle>
            <DialogDescription>
              {editingMod 
                ? 'Update the modification details' 
                : `Add a new modification to ${selectedGroupForMod?.name}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mod-name">Name</Label>
              <Input
                id="mod-name"
                value={modForm.name}
                onChange={(e) => setModForm({ ...modForm, name: e.target.value })}
                placeholder="e.g., Oat Milk, Extra Shot"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mod-price">Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mod-price"
                  type="text"
                  value={modForm.price === 0 ? '' : modForm.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value === '0') {
                      setModForm({ ...modForm, price: 0 });
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        setModForm({ ...modForm, price: numValue });
                      }
                    }
                  }}
                  className="pl-9"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="mod-default"
                checked={modForm.isDefault}
                onCheckedChange={(checked) => setModForm({ ...modForm, isDefault: checked })}
              />
              <Label htmlFor="mod-default">Set as default option</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleModSave} disabled={!modForm.name || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingMod ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit Group' : 'Add Modification Group'}
            </DialogTitle>
            <DialogDescription>
              {editingGroup 
                ? 'Update the group settings' 
                : 'Create a new modification group for products'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="e.g., Milk, Syrups, Size"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="group-multiple"
                checked={groupForm.allowMultiple}
                onCheckedChange={(checked) => setGroupForm({ ...groupForm, allowMultiple: checked })}
              />
              <Label htmlFor="group-multiple">Allow multiple selections</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="group-required"
                checked={groupForm.required}
                onCheckedChange={(checked) => setGroupForm({ ...groupForm, required: checked })}
              />
              <Label htmlFor="group-required">Required selection</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGroupSave} disabled={!groupForm.name || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingGroup ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'group' 
                ? `This will delete the "${itemToDelete.item.name}" group and all its modifications. This action cannot be undone.`
                : `This will delete the "${itemToDelete?.item.name}" modification. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}