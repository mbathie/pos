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
  GripVertical
} from 'lucide-react';
import { ProductThumbnail } from '@/components/product-thumbnail';
import colors from '@/lib/tailwind-colors';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Category Component for drag and drop
function SortableCategory({ 
  category, 
  folders, 
  selectedCategory, 
  selectedFolder, 
  onCategorySelect, 
  onFolderSelect,
  isExpanded,
  onToggle,
  editMode 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const categoryFolders = folders.filter(f => f.category === category._id);
  const isCategorySelected = selectedCategory?._id === category._id && !selectedFolder;

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible
        open={isExpanded}
        onOpenChange={onToggle}
      >
        <div 
          className={cn(
            "group flex items-center justify-between h-12 px-2 rounded-lg transition-colors",
            editMode ? "cursor-move" : "cursor-pointer",
            isCategorySelected ? "bg-accent font-medium" : "hover:bg-accent/50"
          )}
        >
          {editMode && (
            <div {...attributes} {...listeners}>
              <GripVertical className="size-4 text-muted-foreground mr-1" />
            </div>
          )}
          <div 
            className="flex items-center gap-2 flex-1"
            onClick={() => !editMode && onCategorySelect(category)}
          >
            <ProductThumbnail
              src={category.thumbnail}
              alt={category.name}
              size="sm"
              className="size-5"
            />
            <span className="text-sm font-medium">{category.name}</span>
          </div>
          
          {categoryFolders.length > 0 && !editMode ? (
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
            !editMode && <div className="h-7 w-7" /> // Spacer to keep alignment
          )}
        </div>
        
        {!editMode && (
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
        )}
      </Collapsible>
    </div>
  );
}

export function CategoryFolderMenu({ 
  categories, 
  folders,
  selectedCategory,
  selectedFolder,
  onCategorySelect,
  onFolderSelect,
  editMode,
  onCategoriesReorder
}) {
  const [expandedCategories, setExpandedCategories] = useState({});
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat._id === active.id);
      const newIndex = categories.findIndex((cat) => cat._id === over.id);
      
      const reorderedCategories = arrayMove(categories, oldIndex, newIndex);
      
      // Update the order property for each category
      const updatedCategories = reorderedCategories.map((cat, index) => ({
        ...cat,
        order: index
      }));
      
      onCategoriesReorder(updatedCategories);
      
      // Save the new order to the database
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            categories: updatedCategories.map((cat, index) => ({
              _id: cat._id,
              order: index
            }))
          }),
        });
      } catch (error) {
        console.error('Error saving category order:', error);
      }
    }
  };

  if (editMode) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map(c => c._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="w-full">
            {categories.map((category) => (
              <SortableCategory
                key={category._id}
                category={category}
                folders={folders}
                selectedCategory={selectedCategory}
                selectedFolder={selectedFolder}
                onCategorySelect={onCategorySelect}
                onFolderSelect={onFolderSelect}
                isExpanded={expandedCategories[category._id]}
                onToggle={() => toggleCategory(category._id)}
                editMode={editMode}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  // Non-edit mode (original layout)
  return (
    <div className="w-full">
      {categories.map((category) => {
        const categoryFolders = folders.filter(f => f.category === category._id);
        const isExpanded = expandedCategories[category._id];
        const isCategorySelected = selectedCategory?._id === category._id && !selectedFolder;
        
        return (
          <Collapsible
            key={category._id}
            open={isExpanded}
          >
            <div 
              className={cn(
                "group flex items-center justify-between h-12 px-2 rounded-lg cursor-pointer transition-colors",
                isCategorySelected ? "bg-accent font-medium" : "hover:bg-accent/50"
              )}
              onClick={() => {
                onCategorySelect(category);
                if (categoryFolders.length > 0) {
                  toggleCategory(category._id);
                }
              }}
            >
              <div 
                className="flex items-center gap-2 flex-1"
              >
                {category.thumbnail ? (
                  <SvgIcon
                    src={category.thumbnail}
                    alt={category.name}
                    className="size-5 text-foreground rounded-xs"
                  />
                ) : (
                  <Image className="size-5" />
                )}
                <span className="text-sm font-medium">{category.name}</span>
              </div>
              
              {categoryFolders.length > 0 && (
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform text-foreground",
                    isExpanded && "rotate-90"
                  )}
                />
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