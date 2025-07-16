'use client';

import SelectCreate from '@/components/select-create';

export default function AccountingSelect({ value, onChange, className }) {
  const apiEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/accounting`;
  
  const formatOption = (code) => ({
    id: code._id,
    name: `${code.name} (${code.code})`,
    code: code.code,
    originalData: code
  });
  
  const createAccountingCode = async (newCode) => {
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCode.name,
          code: generateCodeFromName(newCode.name)
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to create accounting code');
      }
      
      const data = await res.json();
      return data.accounting;
    } catch (error) {
      console.error('Error creating accounting code:', error);
      return null;
    }
  };
  
  // Simple function to generate a code from the name
  function generateCodeFromName(name) {
    return name
      .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric chars
      .substring(0, 6) // Take first 6 chars
      .toUpperCase();
  }

  return (
    <SelectCreate
      value={value}
      onChange={onChange}
      className={className}
      apiEndpoint={apiEndpoint}
      formatOption={formatOption}
      createItem={createAccountingCode}
      placeholder="Select accounting code"
      createLabel="New Accounting Code"
      createFormLabel="Create new accounting code"
      width="w-[300px]"
    />
  );
} 