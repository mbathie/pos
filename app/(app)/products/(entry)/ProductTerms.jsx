'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info, Plus, Trash2 } from 'lucide-react';
import WysiwygEditor from '@/components/wysiwyg-editor';

export default function ProductTerms({ 
  value, 
  onChange, 
  placeholder = "Enter product-specific terms and conditions...",
  productId = null 
}) {
  const [isExpanded, setIsExpanded] = useState(!!value);
  const [localContent, setLocalContent] = useState(value || '');

  useEffect(() => {
    setLocalContent(value || '');
    if (value && value.trim() !== '') setIsExpanded(true);
  }, [value]);

  const handleExpand = async () => {
    if (!localContent && !value && productId) {
      try {
        const res = await fetch(`/api/products/${productId}/org-terms`);
        if (res.ok) {
          const data = await res.json();
          if (data.tandcContent) {
            setLocalContent(data.tandcContent);
            onChange(data.tandcContent);
          }
        }
      } catch (error) {
        console.error('Error fetching org terms:', error);
      }
    }
    setIsExpanded(true);
  };

  const handleRemove = () => { setLocalContent(''); onChange(''); setIsExpanded(false); };
  const handleContentChange = (content) => { setLocalContent(content); onChange(content); };

  if (!isExpanded) {
    return (
      <div className="space-y-2">
        <Button type="button" size="sm" onClick={handleExpand} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" /> Add Terms
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Terms & Conditions</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Product-specific terms will override the general organization terms</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={handleRemove} className="cursor-pointer h-8 w-8">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <WysiwygEditor
        content={localContent}
        onChange={handleContentChange}
        placeholder={placeholder}
        minHeight="200px"
        showToolbar={true}
        toolbarPosition="top"
        toolbarOptions={{ headings: true, bold: true, italic: true, underline: true, bulletList: true, orderedList: true, alignment: false, indent: false, link: true }}
      />
    </div>
  );
}

