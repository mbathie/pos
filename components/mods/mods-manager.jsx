'use client';

// Extracted from app/(app)/products/mods/page.js to allow reuse
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
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, Edit2, Trash2, MoreVertical, DollarSign, Loader2, Info, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

function SortableMod({ mod, onEdit, onDelete, onSetDefault }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod._id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className={cn(
      "inline-flex items-center gap-2 p-2 rounded-lg border",
      mod.isDefault ? "bg-primary text-primary-foreground" : "bg-background",
      isDragging && "shadow-lg"
    )}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className={cn("h-4 w-4", mod.isDefault ? "text-primary-foreground/70" : "text-muted-foreground")} />
      </div>
      <Button variant="ghost" className={cn("p-0 h-auto font-medium hover:bg-transparent", mod.isDefault && "text-primary-foreground hover:text-primary-foreground")} onClick={() => onEdit(mod)}>
        {mod.name}
        {mod.price > 0 && (<span className={cn("ml-2", mod.isDefault ? "text-primary-foreground/70" : "text-muted-foreground")}>${mod.price.toFixed(2)}</span>)}
      </Button>
      {mod.allowMultiple === false && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={mod.isDefault ? "secondary" : "outline"} className="text-xs px-1.5 py-0">1</Badge>
            </TooltipTrigger>
            <TooltipContent><p>Single quantity only</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("h-6 w-6 p-0", mod.isDefault && "text-primary-foreground hover:text-primary-foreground hover:bg-primary/80")}><MoreVertical className="h-3 w-3" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(mod)}><Edit2 className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSetDefault(mod)}><Check className="h-4 w-4 mr-2" />{mod.isDefault ? 'Remove default' : 'Set as default'}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(mod)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SortableModGroupCard({ modGroup, onModsReorder, onModEdit, onModDelete, onModSetDefault, onModAdd, onGroupEdit, onGroupDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: modGroup._id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <ModGroupCard modGroup={modGroup} onModsReorder={onModsReorder} onModEdit={onModEdit} onModDelete={onModDelete} onModSetDefault={onModSetDefault} onModAdd={onModAdd} onGroupEdit={onGroupEdit} onGroupDelete={onGroupDelete} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  );
}

function ModGroupCard({ modGroup, onModsReorder, onModEdit, onModDelete, onModSetDefault, onModAdd, onGroupEdit, onGroupDelete, dragHandleProps, isDragging }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const arr = Array.isArray(modGroup.mods) ? modGroup.mods : [];
    if (active.id !== over.id) {
      const oldIndex = arr.findIndex((m) => m._id === active.id);
      const newIndex = arr.findIndex((m) => m._id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onModsReorder(modGroup._id, arrayMove(arr, oldIndex, newIndex));
      }
    }
  };
  const mods = Array.isArray(modGroup.mods) ? modGroup.mods : [];
  return (
    <Card className={cn("relative", isDragging && "shadow-lg")}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4 text-muted-foreground" /></div>
            <div className="space-y-2">
              <CardTitle className="text">{modGroup.name}</CardTitle>
              <div className="flex gap-2">{modGroup.allowMultiple && (<Badge variant="secondary">Multiple</Badge>)}{modGroup.required && (<Badge variant="secondary">Required</Badge>)}</div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onGroupEdit(modGroup)}><Edit2 className="h-4 w-4 mr-2" />Edit Group</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGroupDelete(modGroup)}><Trash2 className="h-4 w-4 mr-2" />Delete Group</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={mods.map(m => m._id)} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-2">
              {mods.map((mod) => (
                <SortableMod key={mod._id} mod={mod} onEdit={onModEdit} onDelete={onModDelete} onSetDefault={onModSetDefault} />
              ))}
              <Button variant="" className="inline-flex items-center h-10" onClick={() => onModAdd(modGroup)}>
                <Plus className="size-4" />
                Mod
              </Button>
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}

export default function ModsManager() {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [modGroups, setModGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modDialogOpen, setModDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [selectedGroupForMod, setSelectedGroupForMod] = useState(null);
  const [editingMod, setEditingMod] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modForm, setModForm] = useState({ name: '', price: 0, isDefault: false, allowMultiple: true });
  const [groupForm, setGroupForm] = useState({ name: '', allowMultiple: false, required: false });

  const fetchModGroups = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/modgroups?includeMods=true`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setModGroups(data.modGroups || []);
      }
    } catch (error) {
      console.error('Error fetching mod groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModGroups(); }, []);

  const handleModsReorder = async (groupId, newMods) => {
    setModGroups(prev => prev.map(g => g._id === groupId ? { ...g, mods: newMods } : g));
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/mods`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mods: newMods.map((m, idx) => ({ _id: m._id, order: idx })) }) });
    } catch (e) { console.error('Error reordering mods:', e); }
  };

  const handleGroupsReorder = async ({ active, over }) => {
    if (!over || active.id === over.id) return; const oldIndex = modGroups.findIndex(g => g._id === active.id); const newIndex = modGroups.findIndex(g => g._id === over.id); const reordered = arrayMove(modGroups, oldIndex, newIndex); setModGroups(reordered); try { await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/modgroups`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groups: reordered.map((g, idx) => ({ _id: g._id, order: idx })) }) }); } catch (e) { console.error('Error reordering groups:', e); }
  };

  const handleModEdit = (mod) => { setEditingMod(mod); setModForm({ name: mod.name, price: mod.price || 0, isDefault: !!mod.isDefault, allowMultiple: mod.allowMultiple !== false }); setModDialogOpen(true); };
  const handleModAdd = (group) => { setEditingMod(null); setSelectedGroupForMod(group); setModForm({ name: '', price: 0, isDefault: false, allowMultiple: group.allowMultiple || false }); setModDialogOpen(true); };
  const handleModSave = async () => { try { setSaving(true); if (editingMod) { const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/mods/${editingMod._id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(modForm) }); if (res.ok) { await fetchModGroups(); setModDialogOpen(false); } } else if (selectedGroupForMod) { const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/mods`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...modForm, modGroup: selectedGroupForMod._id }) }); if (res.ok) { await fetchModGroups(); setModDialogOpen(false); } } } catch (e) { console.error('Error saving mod:', e); } finally { setSaving(false); } };
  const handleModDelete = (mod) => { setItemToDelete({ type: 'mod', item: mod }); setDeleteDialogOpen(true); };
  const handleModSetDefault = async (mod) => { try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/mods/${mod._id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDefault: !mod.isDefault }) }); if (res.ok) { await fetchModGroups(); } } catch (e) { console.error('Error setting default:', e); } };

  const handleGroupAdd = () => { setEditingGroup(null); setGroupForm({ name: '', allowMultiple: false, required: false }); setGroupDialogOpen(true); };
  const handleGroupEdit = (group) => { setEditingGroup(group); setGroupForm({ name: group.name, allowMultiple: group.allowMultiple || false, required: group.required || false }); setGroupDialogOpen(true); };
  const handleGroupSave = async () => { try { setSaving(true); if (editingGroup) { const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/modgroups/${editingGroup._id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groupForm) }); if (res.ok) { await fetchModGroups(); setGroupDialogOpen(false); } } else { const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/modgroups`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groupForm) }); if (res.ok) { await fetchModGroups(); setGroupDialogOpen(false); } } } catch (e) { console.error('Error saving group:', e); } finally { setSaving(false); } };
  const handleGroupDelete = (group) => { setItemToDelete({ type: 'group', item: group }); setDeleteDialogOpen(true); };
  const handleDeleteConfirm = async () => { if (!itemToDelete) return; try { setSaving(true); if (itemToDelete.type === 'mod') { await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/mods/${itemToDelete.item._id}`, { method: 'DELETE', credentials: 'include' }); } else if (itemToDelete.type === 'group') { await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/modgroups/${itemToDelete.item._id}`, { method: 'DELETE', credentials: 'include' }); } await fetchModGroups(); setDeleteDialogOpen(false); setItemToDelete(null); } catch (e) { console.error('Error deleting:', e); } finally { setSaving(false); } };

  if (loading) return (<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold">Product Modifications</h1>
        </div>
        <Button onClick={handleGroupAdd}><Plus size="sm" className="h-4 w-4" />Add Group</Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupsReorder}>
        <SortableContext items={modGroups.map(g => g._id)} strategy={rectSortingStrategy}>
          <div className="space-y-4">
            {modGroups.map((group) => (
              <SortableModGroupCard key={group._id} modGroup={group} onModsReorder={handleModsReorder} onModEdit={handleModEdit} onModDelete={handleModDelete} onModSetDefault={handleModSetDefault} onModAdd={handleModAdd} onGroupEdit={handleGroupEdit} onGroupDelete={handleGroupDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {modGroups.length === 0 && (
        <Card className="col-span-full"><CardContent className="text-center py-12"><p className="text-muted-foreground mb-4">No modification groups yet</p><Button onClick={handleGroupAdd}><Plus className="h-4 w-4 mr-2" />Create Your First Group</Button></CardContent></Card>
      )}

      {/* Mod Dialog */}
      <Dialog open={modDialogOpen} onOpenChange={setModDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMod ? 'Edit Modification' : 'Add Modification'}</DialogTitle>
            <DialogDescription>{editingMod ? 'Update the modification details' : `Add a new modification to ${selectedGroupForMod?.name}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="mod-name">Name</Label><Input id="mod-name" value={modForm.name} onChange={(e) => setModForm({ ...modForm, name: e.target.value })} placeholder="e.g., Oat Milk, Extra Shot" /></div>
            <div className="space-y-2"><Label htmlFor="mod-price">Price</Label><div className="relative"><DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" /><NumberInput id="mod-price" value={modForm.price === 0 ? null : modForm.price} onChange={(value) => setModForm({ ...modForm, price: value ?? 0 })} className="pl-9" placeholder="0.00" min={0} step={0.01} formatOptions={{ minimumFractionDigits: 0, maximumFractionDigits: 2 }} /></div></div>
            <div className="flex items-center space-x-2">
              <Switch id="mod-default" checked={modForm.isDefault} onCheckedChange={(checked) => setModForm({ ...modForm, isDefault: checked })} />
              <Label htmlFor="mod-default">Set as default</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                  <TooltipContent><p className="max-w-xs">This option will be pre-selected when the product is added to cart</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="mod-allow-multiple" checked={modForm.allowMultiple} onCheckedChange={(checked) => setModForm({ ...modForm, allowMultiple: checked })} />
              <Label htmlFor="mod-allow-multiple">Allow multiple</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                  <TooltipContent><p className="max-w-xs">When enabled, customers can add more than one of this option. When disabled, it shows as a simple checkbox.</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setModDialogOpen(false)}>Cancel</Button><Button onClick={handleModSave} disabled={!modForm.name || saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingMod ? 'Update' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGroup ? 'Edit Group' : 'Add Modification Group'}</DialogTitle><DialogDescription>{editingGroup ? 'Update the group settings' : 'Create a new modification group for products'}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="group-name">Group Name</Label><Input id="group-name" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="e.g., Milk, Syrups, Size" /></div>
            <div className="flex items-center space-x-2"><Switch id="group-multiple" checked={groupForm.allowMultiple} onCheckedChange={(checked) => setGroupForm({ ...groupForm, allowMultiple: checked })} /><Label htmlFor="group-multiple">Allow multiple selections</Label></div>
            <div className="flex items-center space-x-2"><Switch id="group-required" checked={groupForm.required} onCheckedChange={(checked) => setGroupForm({ ...groupForm, required: checked })} /><Label htmlFor="group-required">Required selection</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancel</Button><Button onClick={handleGroupSave} disabled={!groupForm.name || saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingGroup ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>{itemToDelete?.type === 'group' ? `This will delete the "${itemToDelete.item.name}" group and all its modifications. This action cannot be undone.` : `This will delete the "${itemToDelete?.item.name}" modification. This action cannot be undone.`}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
