'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectValue,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectGroup
} from '@/components/ui/multi-select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function TagSelector({
  value = [],
  onChange,
  placeholder = "Select tags..."
}) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Normalize value to always be an array of string IDs (deduplicated)
  // Handles both populated objects [{_id: '123', name: 'tag'}] and string IDs ['123']
  const normalizedValue = [...new Set(
    value.map(v => typeof v === 'object' ? String(v._id) : String(v))
  )];

  // Fetch available tags
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/tags`);
      const data = await res.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Create a new tag
  const createTag = async (name) => {
    if (!name.trim()) return null;

    try {
      setCreating(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        // Add the new tag to the list
        setTags(prev => [...prev, data.tag]);
        // Select the new tag
        onChange([...normalizedValue, data.tag._id]);
        setSearchValue('');
        toast.success(`Tag "${data.tag.name}" created`);
        return data.tag;
      } else {
        toast.error(data.error || 'Failed to create tag');
        return null;
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
      return null;
    } finally {
      setCreating(false);
    }
  };

  // Handle creating a new tag from search input
  const handleCreateFromSearch = async () => {
    if (!searchValue.trim()) return;
    await createTag(searchValue);
  };

  // Check if the search value matches an existing tag
  const searchMatchesExisting = tags.some(
    tag => tag.name.toLowerCase() === searchValue.trim().toLowerCase()
  );

  // Filter tags based on search
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Toggle tag selection
  const toggleTag = (tagId) => {
    const tagIdStr = String(tagId);
    const newValue = normalizedValue.includes(tagIdStr)
      ? normalizedValue.filter(id => id !== tagIdStr)
      : [...normalizedValue, tagIdStr];
    onChange(newValue);
  };

  // Get selected tag objects for display
  const selectedTags = tags.filter(tag => normalizedValue.includes(String(tag._id)));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex h-auto min-h-9 w-full items-center justify-between gap-2 overflow-hidden cursor-pointer"
        >
          <div className="flex flex-1 flex-wrap gap-1.5 overflow-hidden">
            {selectedTags.length === 0 ? (
              <span className="text-muted-foreground font-normal">
                {loading ? "Loading..." : placeholder}
              </span>
            ) : (
              selectedTags.map(tag => (
                <Badge
                  key={tag._id}
                  variant="outline"
                  className="group flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTag(tag._id);
                  }}
                >
                  {tag.name}
                  <XIcon className="size-2 text-muted-foreground group-hover:text-destructive" />
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or create tag..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center">
                <Loader2 className="size-4 animate-spin mx-auto" />
              </div>
            ) : (
              <>
                {filteredTags.length === 0 && !searchValue.trim() && (
                  <CommandEmpty>No tags yet. Type to create one.</CommandEmpty>
                )}

                {filteredTags.length > 0 && (
                  <CommandGroup>
                    {filteredTags.map(tag => (
                      <CommandItem
                        key={tag._id}
                        value={tag.name}
                        onSelect={() => toggleTag(tag._id)}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 size-4",
                            normalizedValue.includes(String(tag._id)) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tag.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Show create option when search doesn't match existing tags */}
                {searchValue.trim() && !searchMatchesExisting && (
                  <>
                    {filteredTags.length > 0 && <CommandSeparator />}
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleCreateFromSearch}
                        disabled={creating}
                        className="cursor-pointer"
                      >
                        {creating ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 size-4" />
                        )}
                        Create "{searchValue.trim()}"
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
