'use client';

import React, { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  Image
} from 'lucide-react';
import { SvgIcon } from '@/components/ui/svg-icon';
import colors from 'tailwindcss/colors';
import { cn } from '@/lib/utils';

export function CategoryFolderMenu({ 
  categories, 
  folders,
  selectedCategory,
  selectedFolder,
  onCategorySelect,
  onFolderSelect
}) {
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const getCategoryFolders = (categoryId) => {
    return folders.filter(f => f.category === categoryId);
  };

  return (
    <div className="w-full">
      {categories.map((category) => {
        const categoryFolders = getCategoryFolders(category._id);
        const isExpanded = expandedCategories[category._id];
        const isCategorySelected = selectedCategory?._id === category._id && !selectedFolder;
        
        return (
          <Collapsible
            key={category._id}
            open={isExpanded}
            onOpenChange={() => toggleCategory(category._id)}
          >
            <div 
              className={cn(
                "group flex items-center justify-between h-10 px-2 rounded-lg cursor-pointer transition-colors",
                isCategorySelected ? "bg-accent font-medium" : "hover:bg-accent/50"
              )}
            >
              <div 
                className="flex items-center gap-2 flex-1"
                onClick={() => onCategorySelect(category)}
              >
                {category.thumbnail ? (
                  <SvgIcon
                    src={category.thumbnail}
                    alt={category.name}
                    className="size-5 text-foreground"
                  />
                ) : (
                  <Image className="size-5" />
                )}
                <span className="text-sm font-medium">{category.name}</span>
              </div>
              
              {categoryFolders.length > 0 ? (
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform text-foreground",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
              ) : (
                <div className="h-7 w-7" /> // Spacer to keep alignment
              )}
            </div>
            
            <CollapsibleContent>
              <div className="ml-2 space-y-1 mt-1">
                {categoryFolders.map((folder) => {
                  const isFolderSelected = selectedFolder?._id === folder._id;
                  const initials = folder.name
                    .split(' ')
                    .map(word => word[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  
                  return (
                    <div
                      key={folder._id}
                      onClick={() => onFolderSelect(folder, category)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                        isFolderSelected 
                          ? "bg-accent font-medium" 
                          : "hover:bg-accent/50"
                      )}
                    >
                      <div
                        className="size-5 rounded-sm flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{
                          backgroundColor: colors?.[folder.color?.split('-')[0]]?.[folder.color?.split('-')[1]] || '#94a3b8'
                        }}
                      >
                        {/* {initials} */}
                      </div>
                      <span className="text-sm">{folder.name}</span>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}