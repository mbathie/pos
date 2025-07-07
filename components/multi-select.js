// src/components/multi-select.js

import * as React from "react";
import { cva } from "class-variance-authority";
import {
  CheckIcon,
  XCircle,
  ChevronDown,
  XIcon,
  WandSparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

/**
 * Variants for the multi-select component to handle different styles.
 * Uses class-variance-authority (cva) to define different styles based on "variant" prop.
 */
const multiSelectVariants = cva(
  "m-1 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300",
  {
    variants: {
      variant: {
        default:
          "border-foreground/10 text-foreground bg-card hover:bg-card/80",
        secondary:
          "border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        inverted: "inverted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/**
 * MultiSelect component props
 * 
 * @param {Object} props
 * @param {Array<{label: string, value: string, icon?: React.ComponentType}>} props.options - An array of option objects.
 * @param {(value: string[]) => void} props.onValueChange - Callback when selected values change.
 * @param {string[]} [props.defaultValue] - Default selected values.
 * @param {string} [props.placeholder] - Placeholder text when no values selected.
 * @param {number} [props.animation] - Animation duration in seconds.
 * @param {number} [props.maxCount] - Maximum number of items to display.
 * @param {boolean} [props.modalPopover] - Whether popover is modal.
 * @param {boolean} [props.asChild] - Whether to render as child.
 * @param {string} [props.className] - Additional class names.
 * @param {string} [props.variant] - Variant style.
 * @param {boolean} [props.disableSelectAll] - Whether to disable the "Select All" option.
 * @param {React.Ref} ref - Ref to the button element.
 */
const MultiSelect = React.forwardRef(function MultiSelect(
  {
    options,
    onValueChange,
    variant,
    defaultValue = [],
    placeholder = "Select options",
    animation = 0,
    maxCount = 3,
    modalPopover = false,
    asChild = false,
    className,
    disableSelectAll = false,
    ...props
  },
  ref
) {
  const [selectedValues, setSelectedValues] =
    React.useState(defaultValue);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter") {
      setIsPopoverOpen(true);
    } else if (event.key === "Backspace" && !event.currentTarget.value) {
      const newSelectedValues = [...selectedValues];
      newSelectedValues.pop();
      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);
    }
  };

  const toggleOption = (option) => {
    const newSelectedValues = selectedValues.includes(option)
      ? selectedValues.filter((value) => value !== option)
      : [...selectedValues, option];
    setSelectedValues(newSelectedValues);
    onValueChange(newSelectedValues);
  };

  const handleClear = () => {
    setSelectedValues([]);
    onValueChange([]);
  };

  const handleTogglePopover = () => {
    setIsPopoverOpen((prev) => !prev);
  };

  const clearExtraOptions = () => {
    const newSelectedValues = selectedValues.slice(0, maxCount);
    setSelectedValues(newSelectedValues);
    onValueChange(newSelectedValues);
  };

  const toggleAll = () => {
    if (selectedValues.length === options.length) {
      handleClear();
    } else {
      const allValues = options.map((option) => option.value);
      setSelectedValues(allValues);
      onValueChange(allValues);
    }
  };

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={setIsPopoverOpen}
      modal={modalPopover}
    >
      <PopoverTrigger asChild>
        <div className="w-full">
          <Button
            ref={ref}
            {...props}
            onClick={handleTogglePopover}
            className={cn(
              "w-full p-1 rounded-md border min-h-10 h-auto items-center justify-between bg-inherit hover:bg-inherit [&_svg]:pointer-events-auto",
              className
            )}
          >
          {selectedValues.length > 0 ? (
            <div className="flex justify-between items-center w-full">
              <div className="flex flex-wrap items-center">
                {selectedValues.slice(0, maxCount).map((value) => {
                  const option = options.find((o) => o.value === value);
                  const IconComponent = option?.icon;
                  return (
                    <Badge
                      key={value}
                      className={cn(
                        isAnimating ? "animate-bounce" : "",
                        multiSelectVariants({ variant })
                      )}
                      style={{ animationDuration: `${animation}s` }}
                    >
                      {IconComponent && (
                        <IconComponent className="h-4 w-4 mr-2" />
                      )}
                      {option?.label}
                      <XCircle
                        className="ml-2 h-4 w-4 cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleOption(value);
                        }}
                      />
                    </Badge>
                  );
                })}
                {selectedValues.length > maxCount && (
                  <Badge
                    className={cn(
                      "bg-transparent text-foreground border-foreground/1 hover:bg-transparent",
                      isAnimating ? "animate-bounce" : "",
                      multiSelectVariants({ variant })
                    )}
                    style={{ animationDuration: `${animation}s` }}
                  >
                    {`+ ${selectedValues.length - maxCount} more`}
                    <XCircle
                      className="ml-2 h-4 w-4 cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        clearExtraOptions();
                      }}
                    />
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <XIcon
                  className="h-4 mx-2 cursor-pointer text-muted-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleClear();
                  }}
                />
                <Separator
                  orientation="vertical"
                  className="flex min-h-6 h-full"
                />
                <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full mx-auto">
              <span className="text-sm text-muted-foreground mx-3">
                {placeholder}
              </span>
              <ChevronDown className="h-4 cursor-pointer text-muted-foreground mx-2" />
            </div>
          )}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-full"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        align="start"
        onEscapeKeyDown={() => setIsPopoverOpen(false)}
      >
        <Command>
          <CommandInput
            placeholder="Search..."
            onKeyDown={handleInputKeyDown}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {!disableSelectAll && (
                <CommandItem
                  key="all"
                  onSelect={toggleAll}
                  className="cursor-pointer"
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selectedValues.length === options.length
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </div>
                  <span>(Select All)</span>
                </CommandItem>
              )}
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                const isDisabled = option.available === 0;
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleOption(option.value)}
                    className={cn(
                      "cursor-pointer w-full",
                      isDisabled && "opacity-50 pointer-events-none"
                    )}
                    disabled={isDisabled}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    {option.icon && (
                      <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex flex-row gap-4">
                      <div>{option.label}</div>
                      <div className="">{`(x${option.available})`}</div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <div className="flex items-center justify-between">
                {selectedValues.length > 0 && (
                  <>
                    <CommandItem
                      onSelect={handleClear}
                      className="flex-1 justify-center cursor-pointer"
                    >
                      Clear
                    </CommandItem>
                    <Separator
                      orientation="vertical"
                      className="flex min-h-6 h-full"
                    />
                  </>
                )}
                <CommandItem
                  onSelect={() => setIsPopoverOpen(false)}
                  className="flex-1 justify-center cursor-pointer max-w-full"
                >
                  Close
                </CommandItem>
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      {/* {animation > 0 && selectedValues.length > 0 && (
        <WandSparkles
          className={cn(
            "cursor-pointer my-2 text-foreground bg-background w-3 h-3",
            isAnimating ? "" : "text-muted-foreground"
          )}
          onClick={() => setIsAnimating(!isAnimating)}
        />
      )} */}
    </Popover>
  );
});

MultiSelect.displayName = "MultiSelect";
export default MultiSelect;