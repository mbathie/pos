import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Standardized sizes for control buttons and selection checkboxes
 * Use these for consistent sizing across the app
 */
const controlSizes = {
  sm: {
    button: 'size-10',      // 40px
    icon: 'size-4',         // 16px
    checkbox: 'size-10',    // 40px
    checkIcon: 'size-5',    // 20px
    rounded: 'rounded-md',
  },
  md: {
    button: 'size-12',      // 48px - default, bigger than before
    icon: 'size-5',         // 20px
    checkbox: 'size-12',    // 48px
    checkIcon: 'size-6',    // 24px
    rounded: 'rounded-lg',
  },
  lg: {
    button: 'size-14',      // 56px
    icon: 'size-6',         // 24px
    checkbox: 'size-14',    // 56px
    checkIcon: 'size-7',    // 28px
    rounded: 'rounded-lg',
  },
};

/**
 * IconButton - Standardized icon button for controls like +/- quantity
 *
 * @param {string} size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} icon - 'plus' | 'minus' or custom icon component
 * @param {string} variant - Button variant (default: 'default')
 */
export function IconButton({
  size = 'md',
  icon = 'plus',
  variant = 'default',
  className = '',
  children,
  ...props
}) {
  const sizeConfig = controlSizes[size] || controlSizes.md;

  const IconComponent = typeof icon === 'string'
    ? (icon === 'plus' ? Plus : icon === 'minus' ? Minus : null)
    : icon;

  return (
    <Button
      variant={variant}
      className={cn(
        sizeConfig.button,
        sizeConfig.rounded,
        'p-0 cursor-pointer',
        className
      )}
      {...props}
    >
      {IconComponent && <IconComponent className={sizeConfig.icon} />}
      {children}
    </Button>
  );
}

/**
 * SelectionCheck - Checkbox-style selection button for options/variations
 *
 * @param {boolean} checked - Whether the item is selected
 * @param {string} size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {function} onCheckedChange - Callback when selection changes
 */
export function SelectionCheck({
  checked = false,
  size = 'md',
  className = '',
  disabled = false,
  onCheckedChange,
  ...props
}) {
  const sizeConfig = controlSizes[size] || controlSizes.md;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className={cn(
        sizeConfig.checkbox,
        sizeConfig.rounded,
        'shrink-0 border shadow-xs transition-all outline-none',
        'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring',
        'flex items-center justify-center',
        checked
          ? 'bg-primary border-primary text-primary-foreground'
          : 'border-input bg-background dark:bg-input/30',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
      {...props}
    >
      {checked && <Check className={sizeConfig.checkIcon} />}
    </button>
  );
}

/**
 * Export size config for custom usage
 */
export { controlSizes };
