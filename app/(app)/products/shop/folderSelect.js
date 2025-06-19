import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import Colors from '@/components/colors'

export function FolderSelect({ product, pIdx, setFolder }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [newFolder, setNewFolder] = useState({ name: '', color: '' });
  const [ folders, setFolders ] = useState([])

  useEffect(() => {
    const fetchFolders = async () => {
      if (inputValue.trim().length < 2) {
        setFolders([]);
        return;
      }

      try {
        const res = await fetch(`/api/folders?search=${encodeURIComponent(inputValue)}`);
        const data = await res.json();
        if (res.ok) {
          setFolders(data);
        } else {
          console.error('Failed to fetch folders:', data);
        }
      } catch (err) {
        console.error('Error fetching folders:', err);
      }
    };

    fetchFolders();
  }, [inputValue]);

  const handleSelect = (folder) => {
    setValue(folder.name);
    setFolder({folder, pIdx});
    setOpen(false);
    setInputValue('');
    setFolders([]);
  };

  const handleCreateFolder = async () => {
    const res = await fetch('/api/folders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolder.name, colour: newFolder.color }),
    });
    const data = await res.json();
    if (res.ok) {
      setFolder({ folder: data.folder, pIdx });
      setNewFolder(newFolder);
      setOpen(false);
      setInputValue('');
      setFolders([]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[320px] justify-between"
        >
          {product?.folder?.name || 'Select folder...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command>
          <CommandInput
            placeholder="Search folders..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              <div
                className="cursor-pointer px-4 -mt-2 -mb-2 w-full flex flex-col gap-1 items-start"
              >

                <div className='text-sm font-semibold'>New Folder</div>
                <div className='flex gap-2 w-full'>
                  <Input
                    className="w-full"
                    value={newFolder.name}
                    placeholder="new folder name"
                    onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                  />
                  <Button onClick={handleCreateFolder} disabled={newFolder.name.trim().length < 3}>
                    Create
                  </Button>
                </div>

                <div className='text-sm font-semibold'>Folder Color</div>
                <div className='rounded-lg max-h-24 overflow-scroll'>
                  <Colors
                    initColor={newFolder.color}
                    onChange={(color) => setNewFolder({ ...newFolder, color })}
                  />
                </div>

              </div>
            </CommandEmpty>
            <CommandGroup>
              {folders.map((folder) => (
                <CommandItem
                  key={folder._id}
                  value={folder.name}
                  onSelect={() => handleSelect(folder)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === folder.name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div
                    className="size-6 rounded-sm"
                    style={{ backgroundColor: folder.color }}
                  />
                  {folder.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}