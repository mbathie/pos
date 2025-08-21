'use client';

import { Label } from '@/components/ui/label';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import WysiwygEditor from '@/components/wysiwyg-editor';

export default function ProductInstructions({ value, onChange, placeholder = "Enter product instructions or usage guidelines..." }) {
  return (
    <div className="space-y-2">
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
      <WysiwygEditor
        content={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        minHeight="200px"
        showToolbar={true}
        toolbarPosition="top"
        toolbarOptions={{
          headings: false,
          bold: true,
          italic: true,
          underline: true,
          bulletList: true,
          orderedList: true,
          alignment: false,
          indent: false,
          link: true
        }}
      />
    </div>
  );
}