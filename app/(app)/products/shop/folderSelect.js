import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import Colors from '@/components/colors'
import colors from 'tailwindcss/colors';

export function FolderSelect({ product, pIdx, setFolder }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [ _folder, _setFolder ] = useState({ name: '', color: '' });
  const [ folders, setFolders ] = useState([])

  useEffect(() => {
    const init = async () => {
      if (product.folder)
        _setFolder(product.folder)
      else
        _setFolder({color: 'emerald-400', name: ''})
    }
    init()
  },[])

  useEffect(() => {
    const fetchFolders = async () => {
      if (inputValue.trim().length < 2) {
        setFolders([]);
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders?search=${encodeURIComponent(inputValue)}`);
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

  const handleSaveFolder = async () => {
    const isUpdate = !!_folder._id;
    const url = isUpdate
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders/${_folder._id}`
      : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders`;

    const res = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ..._folder }),
    });

    const data = await res.json();

    if (res.ok) {
      console.log(data.folder)
      setFolder({ folder: data.folder, pIdx });
      setOpen(false);
      setInputValue('');
      setFolders([]);
    } else {
      console.error('Failed to save folder:', data);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[400px] justify-between"
        >
          {product?.folder?.name || 'Select folder...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
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

                <div className='flex ml-auto- mb-4'>
                  <Button size="sm" variant="outline" onClick={() => _setFolder({ name: '', color: 'emerald-400' })}>
                    <Plus /> New Folder
                  </Button>
                </div>

                {/* <div className='text-sm font-semibold'>New Folder</div> */}
                <div className='flex gap-2 w-full'>
                  <Input
                    className="w-full"
                    value={_folder.name}
                    placeholder="Enter folder name"
                    onChange={(e) => _setFolder({ ..._folder, name: e.target.value })}
                  />
                  <Button onClick={handleSaveFolder} disabled={_folder.name.trim().length < 3}>
                    Save
                  </Button>
                </div>

                <div className='text-sm font-semibold'>Folder Color</div>
                <div className='rounded-lg max-h-24 overflow-scroll'>
                  <Colors
                    initColor={_folder.color}
                    onChange={(color) => _setFolder({ ..._folder, color })}
                  />
                </div>

                {_folder?._id}

              </div>
            </CommandEmpty>
            <CommandGroup>
              {folders.map((folder) => (
                <CommandItem
                  key={folder._id}
                  value={folder.name}
                  onSelect={() => handleSelect(folder)}
                >
                  <div
                    className="size-6 rounded-sm mr-2 flex items-center justify-center"
                    style={(() => {
                      const [colorFamily, colorShade] = folder.color.split('-');
                      // console.log(`${colorFamily} - ${colorShade}`)
                      const resolvedColor = colors?.[colorFamily]?.[colorShade];
                      // console.log(`Folder: ${folder.name}, Color Key: ${folder.color}, Resolved: ${resolvedColor}`);
                      return { backgroundColor: resolvedColor };
                    })()}
                  >
                    {value === folder.name && (
                      <Check className="size-4 text-white" />
                    )}
                  </div>
                  {folder.name} {folder.color}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}