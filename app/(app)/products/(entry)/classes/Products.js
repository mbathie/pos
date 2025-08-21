'use client';

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from '@/components/ui/label'
import { Tag, ChevronsUpDown, Plus, Info, Trash, Loader2, CheckCircle, Save } from 'lucide-react'
import { useUI } from '../../useUI';
import { useProduct } from './useProduct';
import { useAutoSave } from '../../useAutoSave';

import { Checkbox } from "@/components/ui/checkbox"
import IconSelect from '@/components/icon-select'
import ProductInstructions from '@/components/product-instructions'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function Page({products, setProducts, categoryName, type}) {
  const contentRefs = useRef({});
  const { productsUI, toggleExpanded, toggleAll } = useUI({products, contentRefs});
  const { updateProduct, updateProductKey, saveProduct, addProduct } = useProduct({setProducts, categoryName});

  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconDialogProductIdx, setIconDialogProductIdx] = useState(null);
  const [iconDialogQuery, setIconDialogQuery] = useState('');

  // Wrapper function for auto-save that provides the correct parameters
  const autoSaveProduct = useCallback(async (product) => {
    const productIdx = products.findIndex(p => p._id === product._id);
    if (productIdx !== -1) {
      return await saveProduct({ product, productIdx });
    }
  }, [products, saveProduct]);

  // Use the auto-save hook
  const { isDirty, saving, isAnySaving, hasAnyUnsaved, markAsSaved } = useAutoSave(products, autoSaveProduct, 3000);

  return (
    <div className='flex flex-col space-y-4'>
      <div className="flex items-center">
        <div className='text-lg- font-semibold mb-2'>Setup Class and Course Products</div>
        
        {/* Overall save status */}
        <div className="ml-4 mb-2">
          {isAnySaving ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving changes...</span>
            </div>
          ) : hasAnyUnsaved ? (
            <div className="flex items-center gap-2 text-sm text-orange-500">
              <Save className="h-3 w-3 animate-pulse" />
              <span>Unsaved changes</span>
            </div>
          ) : products.some(p => p._id) && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <CheckCircle className="h-3 w-3" />
              <span>All changes saved</span>
            </div>
          )}
        </div>
        
        <div className='flex-1'/>
        <Button size="sm" className="mr-2" onClick={() => addProduct()}>
          <Plus className="h-4 w-4 mr-1" /> New Product
        </Button>
        <Button variant="outline" size="sm" onClick={toggleAll}>
          <ChevronsUpDown />
        </Button>
      </div>
      {products.map((p, pIdx) => (
        <Card
          ref={(el) => (contentRefs.current[p._id] = el)}
          key={p._id}
          className={`transition-all duration-300 ease-in-out ${
            productsUI[p._id]?.expanded ? '' : 'max-h-[105px] overflow-hidden'
          }`}
        >
          <CardHeader>
            <CardTitle className='flex w-full items-center space-x-4'>
              <div 
                onClick={() => {
                  setIconDialogOpen(true);
                  setIconDialogProductIdx(pIdx);
                  setIconDialogQuery(p.name);
              }}>
                {!p?.thumbnail ? (
                  <Button className="bg-white rounded-lg w-16 h-16">
                    <Tag className="!w-8 !h-8" />
                  </Button>
                ) : (
                  <Button className="rounded-lg -p-1 w-16 h-16">
                    <img className='rounded-lg w-16 h-16' src={p.thumbnail} alt="Thumbnail" />
                  </Button>
                )}
              </div>
              <div className='flex-'>{p.name}</div>

              {/* Right side controls */}
              <div className="flex items-center gap-2">
                {/* Save status indicator */}
                {p._id && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          {saving[p._id] ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : isDirty[p._id] ? (
                            <Save className="h-4 w-4 text-orange-500 animate-pulse" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {saving[p._id] ? 'Saving...' : 
                           isDirty[p._id] ? 'Unsaved changes (auto-saves in 3s)' : 
                           'All changes saved'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Manual save button for new products only */}
                {!p._id && (
                  <Button
                    size="sm"
                    className="bg-primary"
                    onClick={async () => {
                      const updated = await saveProduct({product: p, productIdx: pIdx})
                      setProducts(draft => {
                        draft[pIdx] = updated;
                      });
                      markAsSaved(updated._id, updated);
                    }}
                  >
                    Save
                  </Button>
                )}
              </div>

              <div className='flex-1' />
                <Button
                  variant='ghost'
                  onClick={() => toggleExpanded(p._id)}
                >
                  <ChevronsUpDown className='size-4' />
                </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className='px-0'>
            
            <div className='flex flex-col w-full gap-8'>

              <div className='px-6 space-y-2'>
                <Label>Name</Label>
                <Input 
                  placeholder="product name" value={p.name}
                  onChange={(e) => updateProduct(p._id, { name: e.target.value })}
                />
              </div>

              <div className='px-6 space-y-2'>
                <Label>Description</Label>
                <Textarea
                  rows={4} 
                  placeholder="product description" value={p.desc}
                  onChange={(e) => updateProduct(p._id, { desc: e.target.value })}
                />
              </div>

              {/* Pricing Section */}
              <div className='px-6 space-y-4'>
                <div>
                  {p.prices?.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex flex-row gap-2">
                        <Label className="w-32">Price Name</Label>
                        <Label className="w-24">Amount ($)</Label>
                        <div className="w-8"></div>
                      </div>
                      
                      {p.prices.map((price, priceIdx) => (
                        <div key={priceIdx} className="flex items-center gap-2">
                          <Input
                            type="text"
                            placeholder="Adult"
                            value={price.name || ''}
                            className="w-32 text-sm"
                            onChange={(e) => {
                              setProducts((draft) => {
                                const productIndex = draft.findIndex(prod => prod._id === p._id);
                                draft[productIndex].prices[priceIdx].name = e.target.value;
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
                                const productIndex = draft.findIndex(prod => prod._id === p._id);
                                draft[productIndex].prices[priceIdx].value = value;
                              });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setProducts((draft) => {
                                const productIndex = draft.findIndex(prod => prod._id === p._id);
                                draft[productIndex].prices.splice(priceIdx, 1);
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
                          const productIndex = draft.findIndex(prod => prod._id === p._id);
                          if (!draft[productIndex].prices) {
                            draft[productIndex].prices = [];
                          }
                          draft[productIndex].prices.push({
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

              <div className='px-6 flex gap-2'>
                <div className='flex flex-col gap-2 w-full-'>
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
                    value={p.type}
                    onValueChange={(value) => updateProduct(p._id, { type: value }, pIdx)}
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
                    value={p.capacity || null}
                    onChange={(value) => updateProduct(p._id, { capacity: value })}
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

                  <div className='flex'>
                    <div className='flex flex-col gap-1 w-22'>
                      <NumberInput 
                        placeholder="60" 
                        min={0}
                        value={p?.duration?.minute || null}
                        onChange={(value) => updateProduct(p._id, { duration: {minute: value, unit: 'minute' }})}
                      />
                    </div>

                  </div>
                </div>


              </div>

              <div className="px-6">
                <ProductInstructions
                  value={p.instructions}
                  onChange={(content) => updateProduct(p._id, { instructions: content })}
                />
              </div>

              {/* Schedule Section */}
              <div className='px-6 space-y-6'>
                <Label>Schedule</Label>
                <Card>
                  <CardContent className='gap-8 flex flex-col'>
                    {/* Start and End Dates */}
                    <div className='space-y-2'>
                  <div className='flex items-center gap-8'>
                    <Label className="w-[215px]">Start Date</Label>
                    <div className='flex items-center gap-2'>
                      <Label className="w-[70px]">End Date</Label>
                      <Checkbox
                        checked={p.schedule?.noEndDate || false}
                        onCheckedChange={(checked) => {
                          updateProduct(p._id, { 
                            schedule: { 
                              ...p.schedule, 
                              noEndDate: checked,
                              endDate: checked ? null : p.schedule?.endDate
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
                            !p.schedule?.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {p.schedule?.startDate ? format(new Date(p.schedule.startDate), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={p.schedule?.startDate ? new Date(p.schedule.startDate) : undefined}
                          onSelect={(date) => {
                            updateProduct(p._id, { 
                              schedule: { 
                                ...p.schedule, 
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
                          disabled={p.schedule?.noEndDate}
                          className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !p.schedule?.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {p.schedule?.endDate ? format(new Date(p.schedule.endDate), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={p.schedule?.endDate ? new Date(p.schedule.endDate) : undefined}
                          onSelect={(date) => {
                            updateProduct(p._id, { 
                              schedule: { 
                                ...p.schedule, 
                                endDate: date ? date.toISOString() : null 
                              } 
                            });
                          }}
                          disabled={(date) => p.schedule?.startDate && date < new Date(p.schedule.startDate)}
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
                          checked={p.schedule?.daysOfWeek?.[index] || false}
                          onCheckedChange={(checked) => {
                            const newDaysOfWeek = [...(p.schedule?.daysOfWeek || [false, false, false, false, false, false, false])];
                            newDaysOfWeek[index] = checked;
                            updateProduct(p._id, { 
                              schedule: { 
                                ...p.schedule, 
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
                    {(p.schedule?.times || []).map((time, timeIdx) => (
                      <div key={timeIdx} className='flex gap-2 items-center'>
                        <Input
                          type="time"
                          value={typeof time === 'string' ? time : time?.time || ''}
                          onChange={(e) => {
                            const newTimes = [...(p.schedule?.times || [])];
                            if (typeof newTimes[timeIdx] === 'string') {
                              newTimes[timeIdx] = { time: e.target.value, label: '' };
                            } else {
                              newTimes[timeIdx] = { ...newTimes[timeIdx], time: e.target.value };
                            }
                            updateProduct(p._id, { 
                              schedule: { 
                                ...p.schedule, 
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
                            const newTimes = [...(p.schedule?.times || [])];
                            if (typeof newTimes[timeIdx] === 'string') {
                              newTimes[timeIdx] = { time: newTimes[timeIdx], label: e.target.value };
                            } else {
                              newTimes[timeIdx] = { ...newTimes[timeIdx], label: e.target.value };
                            }
                            updateProduct(p._id, { 
                              schedule: { 
                                ...p.schedule, 
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
                            const newTimes = [...(p.schedule?.times || [])];
                            newTimes.splice(timeIdx, 1);
                            updateProduct(p._id, { 
                              schedule: { 
                                ...p.schedule, 
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
                        const newTimes = [...(p.schedule?.times || []), { time: '', label: '' }];
                        updateProduct(p._id, { 
                          schedule: { 
                            ...p.schedule, 
                            times: newTimes 
                          } 
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Time
                    </Button>
                  </div>
                </div>
                  </CardContent>
                </Card>
              </div>

              {/* <Times product={p} setProducts={setProducts} /> */}

            </div>

          </CardContent>
        </Card>
        ))}
        <IconSelect
          open={iconDialogOpen}
          setOpen={setIconDialogOpen}
          pIdx={iconDialogProductIdx}
          query={iconDialogQuery}
          updateProduct={updateProductKey}
        />
    </div>
  )
}