import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Colors from '@/components/colors';
import colors from 'tailwindcss/colors';

export function FolderManagementSheet({ open, onOpenChange, onFolderUpdated, onFolderDeleted, initialFolder }) {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('emerald-400');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFolders();
      // Set the initial folder if provided
      if (initialFolder && initialFolder._id) {
        setSelectedFolder(initialFolder);
        setFolderName(initialFolder.name);
        setFolderColor(initialFolder.color || 'emerald-400');
        setIsCreatingNew(false);
      }
    }
  }, [open, initialFolder]);

  useEffect(() => {
    if (selectedFolder) {
      setFolderName(selectedFolder.name);
      setFolderColor(selectedFolder.color || 'emerald-400');
      setIsCreatingNew(false);
      setShowDeleteConfirm(false); // Reset delete confirmation when selecting different folder
    }
  }, [selectedFolder]);

  const fetchFolders = async () => {
    try {
      // Get all folders
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders?search=`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setFolders(data);
      }
    } catch (err) {
      console.error('Error fetching folders:', err);
    }
  };

  const handleNewFolder = () => {
    setSelectedFolder(null);
    setFolderName('');
    setFolderColor('emerald-400');
    setIsCreatingNew(true);
  };

  const handleSaveFolder = async () => {
    const isUpdate = selectedFolder && !isCreatingNew;
    const url = isUpdate
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders/${selectedFolder._id}`
      : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders`;

    const res = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ 
        name: folderName, 
        color: folderColor 
      }),
    });

    const data = await res.json();

    if (res.ok) {
      // Call the callback with the updated/created folder and whether it was a new folder
      if (onFolderUpdated) {
        onFolderUpdated(data.folder, !isUpdate); // Pass true if it was a new folder
      }
      // Reset form
      setSelectedFolder(null);
      setFolderName('');
      setFolderColor('emerald-400');
      setIsCreatingNew(false);
      // Close the sheet
      onOpenChange(false);
    } else {
      console.error('Failed to save folder:', data);
    }
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders/${selectedFolder._id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (res.ok) {
      // Notify parent that folder was deleted
      if (onFolderDeleted) {
        onFolderDeleted(selectedFolder._id);
      }
      await fetchFolders();
      setSelectedFolder(null);
      setFolderName('');
      setFolderColor('emerald-400');
      setIsCreatingNew(false);
      setShowDeleteConfirm(false);
      // Close the sheet after successful deletion
      onOpenChange(false);
    }
  };


  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setShowDeleteConfirm(false); // Reset delete confirmation when closing
      }
      onOpenChange(isOpen);
    }}>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader className='p-4'>
          <SheetTitle>Manage Folders</SheetTitle>
          <SheetDescription>
            Create and manage product folders with custom colors
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col gap-4 p-4 pt-0">
          {/* Folder list */}
          <div className="flex flex-col gap-2">
            <Label>Select Folder</Label>
            <div className="flex gap-4">
              <Select 
              value={selectedFolder?._id || ''} 
              onValueChange={(value) => {
                const folder = folders.find(f => f._id === value);
                setSelectedFolder(folder);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isCreatingNew ? "Creating new folder..." : "Select folder"}>
                  {selectedFolder && (
                    <div className="flex items-center gap-2">
                      <div
                        style={{ 
                          backgroundColor: colors?.[selectedFolder.color?.split('-')[0]]?.[selectedFolder.color?.split('-')[1]] 
                        }}
                        className="w-4 h-4 rounded-sm border"
                      />
                      <span>{selectedFolder.name}</span>
                    </div>
                  )}
                  {isCreatingNew && <span className="text-muted-foreground">Creating new folder...</span>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {folders.map((folder) => (
                  <SelectItem key={folder._id} value={folder._id}>
                    <div className="flex items-center gap-2">
                      <div
                        style={{ 
                          backgroundColor: colors?.[folder.color?.split('-')[0]]?.[folder.color?.split('-')[1]] 
                        }}
                        className="w-4 h-4 rounded-sm border"
                      />
                      <span>{folder.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={handleNewFolder}
            >
              <Plus />
            </Button>
            </div>
          </div>

          {/* Folder details form */}
          {(selectedFolder || isCreatingNew) && (
            <>
              <div className="flex flex-col gap-2">
                <Label>Folder Name</Label>
                <Input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Enter folder name"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Colour</Label>
                <div className="border rounded-lg p-3- max-h-48 max-w-72 overflow-y-auto">
                  <Colors
                    initColor={folderColor}
                    onChange={(color) => setFolderColor(color)}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    style={{ 
                      backgroundColor: colors?.[folderColor?.split('-')[0]]?.[folderColor?.split('-')[1]] 
                    }}
                    className="w-8 h-8 rounded-md border"
                  />
                  {/* <span className="text-sm text-muted-foreground">Selected: {folderColor}</span> */}
                </div>
              </div>

            </>
          )}
        </div>
        
        <SheetFooter className="p-4 pt-0 flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <Button
              className="cursor-pointer"
              onClick={handleSaveFolder}
              disabled={(!selectedFolder && !isCreatingNew) || (folderName.trim().length < 3)}
            >
              Save changes
            </Button>
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
          <Button
            className="cursor-pointer"
            variant={showDeleteConfirm ? "destructive" : "outline"}
            onClick={handleDeleteFolder}
            disabled={!selectedFolder || isCreatingNew}
          >
            {showDeleteConfirm ? "Are you sure?" : "Delete Folder"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}