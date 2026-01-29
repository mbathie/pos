'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * A combobox component that allows selecting from existing options and creating new ones.
 * 
 * @param {Object} props
 * @param {Array} props.options - Array of existing options [{ id, label, ...otherData }]
 * @param {Function} props.onSelect - Callback when an option is selected (option) => void
 * @param {Function} props.onCreate - Callback when a new option is created (newOptionData) => void
 * @param {Function} props.searchFunction - Optional function to fetch dynamic options (searchQuery) => Promise<options[]>
 * @param {string} props.placeholder - Placeholder text for the combobox
 * @param {Object} props.selected - Currently selected option
 * @param {string} props.createLabel - Label for the "Create New" button ("New Item" by default)
 * @param {string} props.createFormLabel - Label for the new item form
 * @param {Function} props.validateNewOption - Function to validate new option input (returns boolean)
 */
export function ComboboxCreate({ 
  options: initialOptions = [],
  onSelect,
  onCreate, 
  searchFunction,
  placeholder = "Select...",
  selected = null,
  createLabel = "New Item",
  createFormLabel = "Create new item",
  validateNewOption = (value) => value.trim().length >= 3,
  width = "w-full",
  className,
  ...props
}) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState(initialOptions)
  const [inputValue, setInputValue] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Handle search/filtering
  useEffect(() => {
    const handleSearch = async () => {
      if (searchFunction && inputValue.trim().length >= 2) {
        try {
          const results = await searchFunction(inputValue)
          setOptions(results)
        } catch (err) {
          console.error('Error searching options:', err)
          setOptions([])
        }
      } else if (initialOptions && inputValue.trim().length < 2) {
        setOptions(initialOptions)
      }
    }

    handleSearch()
  }, [inputValue, searchFunction, initialOptions])

  const handleSelect = (option) => {
    onSelect(option)
    setOpen(false)
    setInputValue('')
  }

  const handleCreateNew = () => {
    if (validateNewOption(newItemName)) {
      onCreate({ name: newItemName })
      setNewItemName('')
      setShowCreateForm(false)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(width, "justify-between", className)}
          {...props}
        >
          {selected?.name || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", width)}>
        <Command>
          <CommandInput
            placeholder="Search..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              <p className="px-4 py-2 text-sm text-muted-foreground text-left">No options found</p>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => handleSelect(option)}
                >
                  {selected?.id === option.id && (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <div className="border-t p-2">
              {!showCreateForm ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full cursor-pointer"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> {createLabel}
                </Button>
              ) : (
                <div className="px-2 py-1 text-left">
                  <p className="text-sm font-medium mb-2">{createFormLabel}</p>
                  <div className="flex gap-2">
                    <Input
                      className="w-full"
                      value={newItemName}
                      placeholder="Enter name"
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && validateNewOption(newItemName)) {
                          handleCreateNew();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="cursor-pointer"
                      onClick={handleCreateNew}
                      disabled={!validateNewOption(newItemName)}
                    >
                      Create
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 