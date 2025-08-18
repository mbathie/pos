import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import colors from 'tailwindcss/colors';

export function FolderSelect({ product, pIdx, setFolder, onManageFolders, refreshTrigger }) {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(product?.folder?._id || '');

  useEffect(() => {
    fetchFolders();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  const fetchFolders = async () => {
    try {
      // API requires a search parameter, use empty string to get all
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders?search=`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setFolders(data);
      }
    } catch (err) {
      console.error('Error fetching folders:', err);
    }
  };

  const handleFolderChange = (folderId) => {
    const folder = folders.find(f => f._id === folderId);
    if (folder) {
      setSelectedFolder(folderId);
      setFolder({ folder, pIdx });
    }
  };

  return (
    <div className="flex gap-2">
      <Select value={selectedFolder} onValueChange={handleFolderChange}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select folder...">
            {selectedFolder && folders.find(f => f._id === selectedFolder) && (
              <div className="flex items-center gap-2">
                <div
                  style={{ 
                    backgroundColor: colors?.[folders.find(f => f._id === selectedFolder)?.color?.split('-')[0]]?.[folders.find(f => f._id === selectedFolder)?.color?.split('-')[1]] 
                  }}
                  className="w-4 h-4 rounded-sm border"
                />
                <span>{folders.find(f => f._id === selectedFolder)?.name}</span>
              </div>
            )}
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
        size="icon"
        variant="outline"
        onClick={onManageFolders}
        title="Manage folders"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}