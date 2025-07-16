'use client';

import { useState, useEffect } from 'react';
import { ComboboxCreate } from '@/components/ui/combobox-create';

/**
 * A generic select component that allows selecting from existing options and creating new ones
 * 
 * @param {Object} props
 * @param {string|Object} props.value - The currently selected value (can be ID string, object with ID, or ObjectId)
 * @param {Function} props.onChange - Callback when selection changes (id) => void
 * @param {string} props.className - Optional CSS class
 * @param {string} props.apiEndpoint - API endpoint to fetch options from
 * @param {Function} props.formatOption - Function to format an option from API data: (item) => ({ id, name, ...rest })
 * @param {Function} props.createItem - Function to create a new item: (newItem) => Promise<createdItem>
 * @param {string} props.placeholder - Placeholder text when nothing is selected
 * @param {string} props.createLabel - Label for the create button
 * @param {string} props.createFormLabel - Label for the create form
 * @param {string} props.width - Width of the component (Tailwind class)
 * @param {string} props.idField - Field name for the ID in the data (default: '_id')
 * @param {string} props.displayField - Field to use for display (default: 'name')
 */
export default function SelectCreate({ 
  value,
  onChange,
  className,
  apiEndpoint,
  formatOption = (item) => ({ 
    id: item._id, 
    name: item.name 
  }),
  createItem,
  placeholder = "Select...",
  createLabel = "New Item",
  createFormLabel = "Create new item",
  width = "w-[300px]",
  idField = '_id',
  displayField = 'name',
  initialOptions = []
}) {
  const [options, setOptions] = useState(initialOptions);
  const [loading, setLoading] = useState(apiEndpoint ? true : false);
  const [selectedOption, setSelectedOption] = useState(null);

  // Extract ID from value which could be an ObjectId, string, or object with _id
  const getValueId = (val) => {
    if (!val || val === 'none') return null;
    // Handle ObjectId from MongoDB (which might be stringified)
    if (typeof val === 'string' && val.includes('ObjectId')) {
      const matches = val.match(/ObjectId\('([^']+)'\)/);
      return matches ? matches[1] : val;
    }
    // Handle object with _id property
    if (typeof val === 'object' && val[idField]) {
      return val[idField];
    }
    // Handle string ID directly
    return val;
  };

  useEffect(() => {
    if (apiEndpoint) {
      fetchOptions();
    }
  }, [apiEndpoint]);
  
  // Update selected option when value prop changes
  useEffect(() => {
    if (value && value !== 'none' && options.length > 0) {
      const valueId = getValueId(value);
      const selected = options.find(option => option.id === valueId);
      if (selected) {
        setSelectedOption(selected);
      }
    } else if (value === 'none' || value === null) {
      setSelectedOption(null);
    }
  }, [value, options]);

  async function fetchOptions() {
    if (!apiEndpoint) return;
    
    try {
      setLoading(true);
      const res = await fetch(apiEndpoint);
      const data = await res.json();
      
      // Extract the array from the response
      // This assumes the API returns an object with a property containing the array
      // If the API returns the array directly, adjust this logic
      const items = Array.isArray(data) ? data : 
                    Object.values(data).find(val => Array.isArray(val)) || [];
      
      // Transform to format expected by ComboboxCreate
      const formattedOptions = items.map(formatOption);
      
      setOptions(formattedOptions);
      
      // Set selected option if value exists
      if (value && value !== 'none') {
        const valueId = getValueId(value);
        const selected = formattedOptions.find(option => option.id === valueId);
        if (selected) {
          setSelectedOption(selected);
        }
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateItem(newItem) {
    if (!createItem) {
      console.error('createItem function is required to create new items');
      return null;
    }
    
    try {
      const createdItem = await createItem(newItem);
      
      if (!createdItem) {
        throw new Error('Failed to create item');
      }
      
      // Format the created item
      const formattedItem = formatOption(createdItem);
      
      // Update the local list and select the new option
      setOptions(prev => [...prev, formattedItem]);
      setSelectedOption(formattedItem);
      onChange(formattedItem.id);
      
      return formattedItem;
    } catch (error) {
      console.error('Error creating item:', error);
      return null;
    }
  }

  const handleSelect = (option) => {
    setSelectedOption(option);
    onChange(option.id);
  };

  return (
    <div className={className}>
      <ComboboxCreate
        options={options}
        onSelect={handleSelect}
        onCreate={handleCreateItem}
        placeholder={loading ? "Loading..." : placeholder}
        selected={selectedOption}
        createLabel={createLabel}
        createFormLabel={createFormLabel}
        width={width}
        disabled={loading}
      />
    </div>
  );
} 