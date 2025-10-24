import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Image as ImageIcon, Edit2, GripVertical } from 'lucide-react';
import { SvgIcon } from '@/components/ui/svg-icon';

export default function SortableCategory({ category, isSelected, onSelect, onDelete, onEdit }) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isSelected ? 'bg-sidebar-accent-foreground text-black' : ''}`}
    >
      <Button
        variant="outline"
        onClick={(e) => {
          console.log('Category button clicked:', category.name);
          e.stopPropagation();
          onSelect();
        }}
        className={`w-full cursor-pointer h-12 rounded-none border-t-0 border-x-0 last:border-b-0 justify-start gap-2 ${isSelected ? 'text-black hover:text-black' : 'hover:bg-accent'}`}
      >
        <div
          className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 -ml-1"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-4" />
        </div>
        {category.thumbnail ? (
          <SvgIcon
            src={category.thumbnail}
            alt={category.name}
            className="size-6 flex-shrink-0 rounded-xs"
          />
        ) : (
          <ImageIcon className="size-6 flex-shrink-0" />
        )}
        <span className="flex-1 text-left">{category.name}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className="opacity-0 group-hover:opacity-100 cursor-pointer p-1"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MoreVertical className="size-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                console.log('Edit clicked in dropdown');
                onEdit(category);
              }}
              className="cursor-pointer"
            >
              <Edit2 className="size-4 mr-2" />
              Edit Category
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                console.log('Delete clicked in dropdown');
                onDelete(category._id);
              }}
              className="cursor-pointer"
            >
              <Trash2 className="size-4 mr-2" />
              Delete Category
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Button>
    </div>
  );
}
