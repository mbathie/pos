import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CheckCircle, Save, Trash2, Plus, Info, Trash, CalendarIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProductIcon } from '@/components/product-icon';
import ProductInstructions from '@/components/product-instructions';
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Helper function to migrate old schedule format to new format
function migrateScheduleFormat(schedule) {
  if (!schedule) return schedule;
  
  // Check if already in new format
  if (schedule.daysOfWeek && Array.isArray(schedule.daysOfWeek) && 
      schedule.daysOfWeek.length > 0 && typeof schedule.daysOfWeek[0] === 'object') {
    return schedule;
  }
  
  // Convert old format to new format
  const newDaysOfWeek = [];
  
  // Convert times array to All template
  if (schedule.times && Array.isArray(schedule.times)) {
    const allTimes = schedule.times.map(t => {
      if (typeof t === 'string') {
        return { time: t, label: '', selected: true };
      }
      return { ...t, selected: true };
    });
    newDaysOfWeek.push({ dayIndex: -1, times: allTimes });
  }
  
  // Convert boolean daysOfWeek array to new structure
  if (schedule.daysOfWeek && Array.isArray(schedule.daysOfWeek)) {
    const oldDaysOfWeek = schedule.daysOfWeek;
    const allDay = newDaysOfWeek.find(d => d.dayIndex === -1);
    const templateTimes = allDay?.times || [];
    
    oldDaysOfWeek.forEach((isActive, dayIdx) => {
      if (isActive && templateTimes.length > 0) {
        newDaysOfWeek.push({
          dayIndex: dayIdx,
          times: templateTimes.map(t => ({ ...t, selected: true }))
        });
      }
    });
  }
  
  return {
    ...schedule,
    daysOfWeek: newDaysOfWeek
  };
}

export default function ClassesProductSheet({ 
  open, 
  onOpenChange, 
  products,
  selectedProductId,
  setProducts,
  isDirty,
  saving,
  markAsSaved,
  setIconDialogOpen,
  setIconDialogProductIdx,
  setIconDialogQuery,
  createProduct,
  categoryName
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [activeScheduleTab, setActiveScheduleTab] = React.useState('all');
  
  // Find product and index
  const rawProduct = products?.find(p => p._id === selectedProductId);
  const pIdx = products?.findIndex(p => p._id === selectedProductId);
  
  if (!rawProduct || pIdx === -1) return null;
  
  // Migrate schedule format if needed (for backward compatibility)
  const product = {
    ...rawProduct,
    schedule: migrateScheduleFormat(rawProduct.schedule)
  };
  
  const updateProduct = (updates) => {
    setProducts(draft => {
      Object.assign(draft[pIdx], updates);
    });
  };
  
  const handleDelete = async () => {
    setProducts(draft => {
      draft.splice(pIdx, 1);
    });
    onOpenChange(false);
    setDeleteDialogOpen(false);
    
    // If product has _id, delete from database
    if (product._id) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${product._id}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[75vw] sm:max-w-[75vw] overflow-y-auto p-4">
        <SheetHeader className='m-0 p-0 mt-4'>
          <SheetTitle className="flex items-center gap-4">
            <div 
              className="cursor-pointer"
              onClick={() => {
                setIconDialogOpen(true);
                setIconDialogProductIdx(pIdx);
                setIconDialogQuery(product.name);
              }}
            >
              <ProductIcon
                src={product.thumbnail}
                alt={product.name}
                size="lg"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{product.name}</h2>
            </div>
            
            {/* Auto-save indicator */}
            {product._id && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      {saving[product._id] ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : isDirty[product._id] ? (
                        <Save className="h-5 w-5 text-orange-500 animate-pulse" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {saving[product._id] ? 'Saving...' : 
                       isDirty[product._id] ? 'Unsaved changes (auto-saves in 3s)' : 
                       'All changes saved'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Manual save for new products */}
            {(product.isNew || !product._id) && (
              <Button
                size="sm"
                onClick={async () => {
                  // Remove the isNew flag and temporary _id before creating
                  const { isNew, _id, ...productToCreate } = product;
                  const createdProduct = await createProduct(categoryName, productToCreate);
                  setProducts(draft => {
                    draft[pIdx] = createdProduct;
                  });
                  markAsSaved(createdProduct._id, createdProduct);
                }}
              >
                Save
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col space-y-6 mt-4">
          <div className="flex flex-col gap-2">
            <Label>Product Name</Label>
            <Input
              type="text"
              placeholder="Product Name"
              onChange={(e) => updateProduct({ name: e.target.value })}
              value={product.name || ''}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Textarea
              type="text"
              rows={6}
              placeholder="Product description"
              onChange={(e) => updateProduct({ desc: e.target.value })}
              value={product.desc || ''}
            />
          </div>

          {/* Pricing Section */}
          <div className='space-y-4'>
            <div>
              {product.prices?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-row gap-2 items-center">
                    <Label className="w-32">Price Name</Label>
                    <Label className="w-24">Amount ($)</Label>
                    <Label className="flex items-center gap-2">
                      Minor
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="size-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Price is for a minor, generally under 18 years old. Will require consent from a guardian or parent</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <div className="w-8"></div>
                  </div>
                  
                  {product.prices.map((price, priceIdx) => (
                    <div key={priceIdx} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Adult"
                        value={price.name || ''}
                        className="w-32 text-sm"
                        onChange={(e) => {
                          setProducts((draft) => {
                            draft[pIdx].prices[priceIdx].name = e.target.value;
                          });
                        }}
                      />
                      <NumberInput
                        placeholder="0.00"
                        value={price.value || null}
                        min={0}
                        step={0.01}
                        className="w-24 text-sm"
                        onChange={(value) => {
                          setProducts((draft) => {
                            draft[pIdx].prices[priceIdx].value = value;
                          });
                        }}
                      />
                      <div className="flex items-center justify-center w-[60px]">
                        <Checkbox
                          checked={price.minor || false}
                          onCheckedChange={(checked) => {
                            setProducts((draft) => {
                              draft[pIdx].prices[priceIdx].minor = checked;
                            });
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProducts((draft) => {
                            draft[pIdx].prices.splice(priceIdx, 1);
                          });
                        }}
                        className="w-8 h-8 p-0"
                      >
                        <Trash className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-2">
                <Button 
                  size="sm" 
                  className="w-32"
                  onClick={() => {
                    setProducts((draft) => {
                      if (!draft[pIdx].prices) {
                        draft[pIdx].prices = [];
                      }
                      draft[pIdx].prices.push({
                        name: '',
                        value: '',
                        minor: false
                      });
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Price
                </Button>
              </div>
            </div>
          </div>

          <div className='flex gap-4'>
            <div className='flex flex-col gap-2 w-full'>
              <div className='flex items-center gap-2'>
                <Label>Product Type</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size="15"/>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Class</p>
                      <p>&nbsp;Customers can select from</p>
                      <p>&nbsp;one or more ad-hoc classes.</p>
                      <p>&nbsp;Set price per class</p>
                      <p>Course</p>
                      <p>&nbsp;A course runs over a period of time</p>
                      <p>&nbsp;i.e. 10 weeks. Customers must signup</p>
                      <p>&nbsp;and pay for the whole course.</p>
                      <p>&nbsp;Set price for the whole course</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={product.type}
                onValueChange={(value) => updateProduct({ type: value })}
              >
                <SelectTrigger className="w-42">
                  <SelectValue placeholder="Product Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Type</SelectLabel>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-2 w-32'>
              <Label>Class Size</Label>
              <NumberInput 
                placeholder="max capacity" 
                min={0}
                value={product.capacity || null}
                onChange={(value) => updateProduct({ capacity: value })}
              />
            </div>

            <div className='flex flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <Label>Duration (min)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size="15"/>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Class length in minutes e.g.</p>
                      <p>60 for 1 hour</p>
                      <p>90 for 1h 30m</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <NumberInput 
                placeholder="60" 
                min={0}
                value={product?.duration?.minute || null}
                onChange={(value) => updateProduct({ duration: {minute: value, unit: 'minute' }})}
              />
            </div>
          </div>

          <div>
            <ProductInstructions
              value={product.instructions}
              onChange={(content) => updateProduct({ instructions: content })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`waiver-${pIdx}`}
              checked={product.waiverRequired || false}
              onCheckedChange={(checked) => updateProduct({ waiverRequired: checked })}
            />
            <Label htmlFor={`waiver-${pIdx}`} className="cursor-pointer">
              Waiver Required
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Check if customers will be required to complete a waiver or not</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Schedule Section */}
          <div className='space-y-6'>
            <Label>Schedule</Label>
            
            {/* Start and End Dates */}
            <div className='space-y-2'>
              <div className='flex items-center gap-8'>
                <Label className="w-[215px]">Start Date</Label>
                <div className='flex items-center gap-2'>
                  <Label className="w-[70px]">End Date</Label>
                  <Checkbox
                    checked={product.schedule?.noEndDate || false}
                    onCheckedChange={(checked) => {
                      updateProduct({ 
                        schedule: { 
                          ...product.schedule, 
                          noEndDate: checked,
                          endDate: checked ? null : product.schedule?.endDate
                        } 
                      });
                    }}
                  />
                  <Label className='text-sm font-normal'>No end date</Label>
                </div>
              </div>
              <div className='flex gap-2'>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !product.schedule?.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {product.schedule?.startDate ? format(new Date(product.schedule.startDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={product.schedule?.startDate ? new Date(product.schedule.startDate) : undefined}
                      onSelect={(date) => {
                        updateProduct({ 
                          schedule: { 
                            ...product.schedule, 
                            startDate: date ? date.toISOString() : null 
                          } 
                        });
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      disabled={product.schedule?.noEndDate}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !product.schedule?.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {product.schedule?.endDate ? format(new Date(product.schedule.endDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={product.schedule?.endDate ? new Date(product.schedule.endDate) : undefined}
                      onSelect={(date) => {
                        updateProduct({ 
                          schedule: { 
                            ...product.schedule, 
                            endDate: date ? date.toISOString() : null 
                          } 
                        });
                      }}
                      disabled={(date) => product.schedule?.startDate && date < new Date(product.schedule.startDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Schedule Configuration with Tabs */}
            <div className='space-y-2'>
              <Label>Schedule Configuration</Label>
              <div className="w-full space-y-4">
                {/* Tab List */}
                <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                  {[
                    { value: 'all', label: 'All' },
                    { value: '0', label: 'Mon' },
                    { value: '1', label: 'Tue' },
                    { value: '2', label: 'Wed' },
                    { value: '3', label: 'Thu' },
                    { value: '4', label: 'Fri' },
                    { value: '5', label: 'Sat' },
                    { value: '6', label: 'Sun' }
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setActiveScheduleTab(tab.value)}
                      className={cn(
                        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                        activeScheduleTab === tab.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                
                {/* Tab Content */}
                <div>
                  {/* All Tab - Template for all days */}
                  {activeScheduleTab === 'all' && (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground mb-2">
                        Configure all available time slots. These will be used as templates for each day.
                      </div>
                      <div className='space-y-2'>
                    <div className='flex gap-2'>
                      <Label className="w-32">Class Time</Label>
                      <Label className="w-48">Class Label</Label>
                    </div>
                    {(() => {
                      // Get or initialize the daysOfWeek structure
                      const daysOfWeek = product.schedule?.daysOfWeek || [];
                      const allDay = daysOfWeek.find(d => d?.dayIndex === -1) || { dayIndex: -1, times: [] };
                      const allTimes = allDay.times || [];
                      
                      return (
                        <>
                          {allTimes.map((time, timeIdx) => (
                            <div key={timeIdx} className='flex gap-2 items-center'>
                              <Input
                                type="time"
                                value={time?.time || ''}
                                onChange={(e) => {
                                  const newDaysOfWeek = [...(product.schedule?.daysOfWeek || [])];
                                  let allDayIndex = newDaysOfWeek.findIndex(d => d?.dayIndex === -1);
                                  
                                  if (allDayIndex === -1) {
                                    newDaysOfWeek.push({ dayIndex: -1, times: [] });
                                    allDayIndex = newDaysOfWeek.length - 1;
                                  }
                                  
                                  const newTimes = [...(newDaysOfWeek[allDayIndex].times || [])];
                                  newTimes[timeIdx] = { ...(newTimes[timeIdx] || {}), time: e.target.value };
                                  newDaysOfWeek[allDayIndex] = { ...newDaysOfWeek[allDayIndex], times: newTimes };
                                  
                                  updateProduct({ 
                                    schedule: { 
                                      ...product.schedule, 
                                      daysOfWeek: newDaysOfWeek 
                                    } 
                                  });
                                }}
                                className="w-32"
                              />
                              <Input
                                type="text"
                                placeholder="Warm Up, Main, Cool Down"
                                value={time?.label || ''}
                                onChange={(e) => {
                                  const newDaysOfWeek = [...(product.schedule?.daysOfWeek || [])];
                                  let allDayIndex = newDaysOfWeek.findIndex(d => d?.dayIndex === -1);
                                  
                                  if (allDayIndex === -1) {
                                    newDaysOfWeek.push({ dayIndex: -1, times: [] });
                                    allDayIndex = newDaysOfWeek.length - 1;
                                  }
                                  
                                  const newTimes = [...(newDaysOfWeek[allDayIndex].times || [])];
                                  newTimes[timeIdx] = { ...(newTimes[timeIdx] || {}), label: e.target.value };
                                  newDaysOfWeek[allDayIndex] = { ...newDaysOfWeek[allDayIndex], times: newTimes };
                                  
                                  updateProduct({ 
                                    schedule: { 
                                      ...product.schedule, 
                                      daysOfWeek: newDaysOfWeek 
                                    } 
                                  });
                                }}
                                className="w-64"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newDaysOfWeek = [...(product.schedule?.daysOfWeek || [])];
                                  const allDayIndex = newDaysOfWeek.findIndex(d => d?.dayIndex === -1);
                                  
                                  if (allDayIndex !== -1) {
                                    const newTimes = [...(newDaysOfWeek[allDayIndex].times || [])];
                                    newTimes.splice(timeIdx, 1);
                                    newDaysOfWeek[allDayIndex].times = newTimes;
                                    
                                    updateProduct({ 
                                      schedule: { 
                                        ...product.schedule, 
                                        daysOfWeek: newDaysOfWeek 
                                      } 
                                    });
                                  }
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            onClick={() => {
                              const newDaysOfWeek = [...(product.schedule?.daysOfWeek || [])];
                              let allDayIndex = newDaysOfWeek.findIndex(d => d?.dayIndex === -1);
                              
                              if (allDayIndex === -1) {
                                newDaysOfWeek.push({ dayIndex: -1, times: [{ time: '', label: '', selected: true }] });
                              } else {
                                const newTimes = [...(newDaysOfWeek[allDayIndex].times || []), { time: '', label: '', selected: true }];
                                newDaysOfWeek[allDayIndex].times = newTimes;
                              }
                              
                              updateProduct({ 
                                schedule: { 
                                  ...product.schedule, 
                                  daysOfWeek: newDaysOfWeek 
                                } 
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Time
                          </Button>
                        </>
                      );
                    })()}
                      </div>
                    </div>
                  )}
                  
                  {/* Individual Day Tabs */}
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, dayIdx) => {
                    if (activeScheduleTab !== dayIdx.toString()) return null;
                    
                    return (
                      <div key={dayIdx} className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-2">
                      Select which time slots are available on {dayName}
                    </div>
                    <div className='space-y-2'>
                      {(() => {
                        const daysOfWeek = product.schedule?.daysOfWeek || [];
                        const allDay = daysOfWeek.find(d => d?.dayIndex === -1) || { dayIndex: -1, times: [] };
                        const currentDay = daysOfWeek.find(d => d?.dayIndex === dayIdx);
                        const allTimes = allDay.times || [];
                        
                        if (allTimes.length === 0) {
                          return (
                            <div className="text-sm text-muted-foreground py-4">
                              No time slots configured. Please add time slots in the "All" tab first.
                            </div>
                          );
                        }
                        
                        // Format time to 12-hour format with AM/PM
                        const formatTime12Hour = (timeStr) => {
                          if (!timeStr) return 'No time set';
                          const [hours, minutes] = timeStr.split(':').map(Number);
                          const ampm = hours >= 12 ? 'PM' : 'AM';
                          const displayHours = hours % 12 || 12;
                          return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                        };
                        
                        return allTimes.map((time, timeIdx) => {
                          const isSelected = currentDay?.times?.[timeIdx]?.selected ?? false;
                          
                          return (
                            <div key={timeIdx} className='flex items-center gap-3 p-2 rounded hover:bg-muted/50'>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const newDaysOfWeek = [...(product.schedule?.daysOfWeek || [])];
                                  let dayIndex = newDaysOfWeek.findIndex(d => d?.dayIndex === dayIdx);
                                  
                                  if (dayIndex === -1) {
                                    // Initialize this day with all times from template
                                    const dayTimes = allTimes.map((t, idx) => ({
                                      ...t,
                                      selected: idx === timeIdx ? checked : false
                                    }));
                                    newDaysOfWeek.push({ dayIndex: dayIdx, times: dayTimes });
                                  } else {
                                    // Create a new day object with updated times
                                    const existingDay = newDaysOfWeek[dayIndex];
                                    const newTimes = allTimes.map((t, idx) => {
                                      // Check if this day already has this time configured
                                      const existingTime = existingDay.times?.[idx];
                                      if (idx === timeIdx) {
                                        // This is the time being toggled
                                        return {
                                          ...t,
                                          selected: checked
                                        };
                                      } else if (existingTime) {
                                        // Keep existing selection state for other times
                                        return {
                                          ...t,
                                          selected: existingTime.selected ?? false
                                        };
                                      } else {
                                        // New time slot, default to unselected
                                        return {
                                          ...t,
                                          selected: false
                                        };
                                      }
                                    });
                                    
                                    // Replace the entire day object
                                    newDaysOfWeek[dayIndex] = {
                                      dayIndex: dayIdx,
                                      times: newTimes
                                    };
                                  }
                                  
                                  updateProduct({ 
                                    schedule: { 
                                      ...product.schedule, 
                                      daysOfWeek: newDaysOfWeek 
                                    } 
                                  });
                                }}
                              />
                              <div className='flex-1'>
                                <div className='text-sm'>
                                  <span className='font-medium'>{formatTime12Hour(time.time)}</span>
                                  {time.label && <span className='text-muted-foreground ml-2'>{time.label}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
          
          {/* Delete Product Button */}
          <div className="w-54">
            <Button
              variant="destructive"
              className="w-full cursor-pointer"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Product
            </Button>
          </div>
        </div>
        </div>
      </SheetContent>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{product?.name}"? This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
