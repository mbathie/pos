import React, { useState } from 'react';
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
import { Tag, Loader2, CheckCircle, Save, Trash2, Plus, Info, Trash, CalendarIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SvgIcon } from '@/components/ui/svg-icon';
import ProductInstructions from '@/components/product-instructions';
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  saveProduct
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  
  // Find product and index
  const product = products?.find(p => p._id === selectedProductId);
  const pIdx = products?.findIndex(p => p._id === selectedProductId);
  
  if (!product || pIdx === -1) return null;
  
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
            <div onClick={() => {
              setIconDialogOpen(true);
              setIconDialogProductIdx(pIdx);
              setIconDialogQuery(product.name);
            }}>
              {!product?.thumbnail ? (
                <Button className="bg-white rounded-lg size-16">
                  <Tag className="!w-8 !h-8" />
                </Button>
              ) : (
                <Button className="bg-white rounded-lg size-16 flex items-center justify-center">
                  <SvgIcon
                    src={product.thumbnail}
                    alt={product.name}
                    className="w-10 h-10"
                  />
                </Button>
              )}
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
            {!product._id && (
              <Button
                size="sm"
                onClick={async () => {
                  const updated = await saveProduct({product, productIdx: pIdx});
                  setProducts(draft => {
                    draft[pIdx] = updated;
                  });
                  markAsSaved(updated._id, updated);
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
                  <div className="flex flex-row gap-2">
                    <Label className="w-32">Price Name</Label>
                    <Label className="w-24">Amount ($)</Label>
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
                        value: ''
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

            {/* Days of Week */}
            <div className='space-y-2'>
              <Label>Days of Week</Label>
              <div className='flex gap-4'>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                  <div key={day} className='flex items-center gap-1.5'>
                    <Checkbox
                      checked={product.schedule?.daysOfWeek?.[index] || false}
                      onCheckedChange={(checked) => {
                        const newDaysOfWeek = [...(product.schedule?.daysOfWeek || [false, false, false, false, false, false, false])];
                        newDaysOfWeek[index] = checked;
                        updateProduct({ 
                          schedule: { 
                            ...product.schedule, 
                            daysOfWeek: newDaysOfWeek 
                          } 
                        });
                      }}
                    />
                    <Label className='text-sm font-normal'>{day}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Start Times */}
            <div className='space-y-2'>
              <div className='flex gap-2'>
                <Label className="w-32">Class Times</Label>
                <Label className="w-48">Class Label</Label>
              </div>
              <div className='space-y-2'>
                {(product.schedule?.times || []).map((time, timeIdx) => (
                  <div key={timeIdx} className='flex gap-2 items-center'>
                    <Input
                      type="time"
                      value={typeof time === 'string' ? time : time?.time || ''}
                      onChange={(e) => {
                        const newTimes = [...(product.schedule?.times || [])];
                        if (typeof newTimes[timeIdx] === 'string') {
                          newTimes[timeIdx] = { time: e.target.value, label: '' };
                        } else {
                          newTimes[timeIdx] = { ...newTimes[timeIdx], time: e.target.value };
                        }
                        updateProduct({ 
                          schedule: { 
                            ...product.schedule, 
                            times: newTimes 
                          } 
                        });
                      }}
                      className="w-32"
                    />
                    <Input
                      type="text"
                      placeholder="Warm Up, Cool Down, Main Class"
                      value={typeof time === 'object' ? time?.label || '' : ''}
                      onChange={(e) => {
                        const newTimes = [...(product.schedule?.times || [])];
                        if (typeof newTimes[timeIdx] === 'string') {
                          newTimes[timeIdx] = { time: newTimes[timeIdx], label: e.target.value };
                        } else {
                          newTimes[timeIdx] = { ...newTimes[timeIdx], label: e.target.value };
                        }
                        updateProduct({ 
                          schedule: { 
                            ...product.schedule, 
                            times: newTimes 
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
                        const newTimes = [...(product.schedule?.times || [])];
                        newTimes.splice(timeIdx, 1);
                        updateProduct({ 
                          schedule: { 
                            ...product.schedule, 
                            times: newTimes 
                          } 
                        });
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={() => {
                    const newTimes = [...(product.schedule?.times || []), { time: '', label: '' }];
                    updateProduct({ 
                      schedule: { 
                        ...product.schedule, 
                        times: newTimes 
                      } 
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Time
                </Button>
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