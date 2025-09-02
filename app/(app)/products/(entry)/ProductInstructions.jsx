'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info, Plus, Trash2 } from 'lucide-react';
import WysiwygEditor from '@/components/wysiwyg-editor';

export default function ProductInstructions({ 
  value, 
  onChange, 
  placeholder = "Enter product instructions or usage guidelines..." 
}) {
  const [isExpanded, setIsExpanded] = useState(!!value);
  const [localContent, setLocalContent] = useState(value || '');

  useEffect(() => {
    setLocalContent(value || '');
    if (value && value.trim() !== '') setIsExpanded(true);
  }, [value]);

  const handleExpand = () => setIsExpanded(true);
  const handleRemove = () => { setLocalContent(''); onChange(''); setIsExpanded(false); };
  const handleContentChange = (content) => { setLocalContent(content); onChange(content); };

  if (!isExpanded) {
    return (
      <div className="space-y-2">
        <Button type="button" size="sm" onClick={handleExpand} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" /> Add Instructions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Instructions</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>These instructions will appear in the customer's confirmation email</p>
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
        toolbarOptions={{ headings: false, bold: true, italic: true, underline: true, bulletList: true, orderedList: true, alignment: false, indent: false, link: true }}
      />
    </div>
  );
}

