'use client';

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from '@/components/ui/label'
import { Tag, ChevronsUpDown, Plus, Info } from 'lucide-react'
import { useUI } from '../../useUI';
import { useProduct } from './useProduct';
import DateTimePicker from '@/components/date-time-picker';
import { getLastClassDate } from '@/lib/classes'
import { Checkbox } from "@/components/ui/checkbox"
import IconSelect from '@/components/icon-select'

export default function Page({products, setProducts, categoryName}) {
  const contentRefs = useRef({});
  const { productsUI, toggleExpanded, toggleAll } = useUI({products, contentRefs});
  const { updateProduct, updateProductKey, updatePrice, addPrice, saveProduct, addTime, updateTime, addProduct } = useProduct({setProducts, categoryName});

  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconDialogProductIdx, setIconDialogProductIdx] = useState(null);
  const [iconDialogQuery, setIconDialogQuery] = useState('');

  const originalProducts = useRef({});
  const [isDirty, setIsDirty] = useState({});
  useEffect(() => {
    const updatedIsDirty = { ...isDirty };
    
    // Populate the originalProducts hash with _id as the key
    products.forEach((p) => {
      originalProducts.current[p._id] = originalProducts.current[p._id] || JSON.parse(JSON.stringify(p));
    });

    products.forEach((p) => {
      console.log(p)
      const isProductChanged = JSON.stringify(p) !== JSON.stringify(originalProducts.current[p._id]);
      updatedIsDirty[p._id] = isProductChanged || !p._id
    });
    setIsDirty(updatedIsDirty);
  }, [products]);

  return (
    <div className='flex flex-col space-y-4'>
      <div className="flex">
        <div className='text-lg- font-semibold mb-2'>Setup Class and Course Products</div>
        <div className='flex-1'/>
        <Button size="sm" className="mr-2" variant="outline" onClick={() => addProduct()}>
          New Product
        </Button>
        <Button variant="outline" size="sm" onClick={toggleAll}>
          <ChevronsUpDown />
        </Button>
      </div>
      {products.map((p, pIdx) => (
        <Card
          ref={(el) => (contentRefs.current[p._id] = el)}
          key={p._id}
          className='overflow-hidden transition-all duration-300 ease-in-out'
          style={{
            maxHeight: productsUI[p._id]?.expanded ? `${productsUI[p._id]?.height}px` : '105px',
          }}
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

              {isDirty[p._id] && (
                <Button
                  size="sm"
                  className="bg-lime-400"
                  onClick={async () => {
                    const updated = await saveProduct({product: p, productIdx: pIdx})
                    originalProducts.current[p._id] = JSON.parse(JSON.stringify(updated));
                    setIsDirty((prev) => ({ ...prev, [p._id]: false }));                  }}
                >
                  Save
                </Button>
              )}

              <div className='flex-1' />
                <Button
                  variant='ghost'
                  onClick={() => toggleExpanded(p._id)}
                >
                  <ChevronsUpDown className='size-4' />
                </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            
            <div className='flex flex-col gap-4 w-full'>

              <div className='flex flex-col gap-1'>
                <Label>Name</Label>
                <Input 
                  placeholder="product name" value={p.name}
                  onChange={(e) => updateProduct(p._id, { name: e.target.value })}
                />
              </div>

              <div className='flex gap-2'>
                <div className='flex flex-col gap-1 w-full-'>
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

                <div className='flex flex-col gap-1 w-32'>
                  <Label>Class Size</Label>
                  <Input 
                    type="number" placeholder="max capacity" min="0"
                    value={p.capacity || 0}
                    onChange={(e) => updateProduct(p._id, { capacity: e.target.value })}
                  />
                </div>

                <div className='flex flex-col gap-1'>
                  <div className='flex items-center gap-2'>
                    <Label>Duration (h)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info size="15"/>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Class length in hours e.g.</p>
                          <p>1 for 1 hr</p>
                          <p>1.5 for 1h 30m</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className='flex'>
                    <div className='flex flex-col gap-1 w-22'>
                      <Input 
                        type="number" placeholder="1.5" min="0"
                        value={p?.duration?.name || 0}
                        onChange={(e) => updateProduct(p._id, { duration: {name: e.target.value }})}
                      />
                    </div>

                  </div>
                </div>


              </div>

              <div className=''>
                <div className='flex mb-1'>
                  <Label className="w-38">Prices ($)</Label>
                </div>
                <div className='flex flex-col gap-2'>
                  {p?.prices?.map((pr, prIdx) => {
                    return (
                      <Card key={pr._id} className='flex flex-col gap-2'>
                        <CardContent className="flex flex-col gap-2">
                          <div className='flex'>
                            <div className='flex flex-col gap-1'>
                              <Label>Price Name</Label>
                              <Input 
                                placeholder="Adult" className="w-38 rounded-r-none" value={pr.name}
                                onChange={(e) => updatePrice(p._id, pr._id, { name: e.target.value })}
                              />
                            </div>
                            <div className="flex flex-col gap-1 w-38">
                              <Label>Price ($)</Label>
                              <Input
                                type="number"
                                placeholder="20.00"
                                className="w-38 rounded-l-none relative left-[-1px] border-l-0" // padding to the right so the icon doesn't overlap text
                                value={pr.value}
                                onChange={(e) => updatePrice(p._id, pr._id, { value: e.target.value })}
                              />
                            </div>
                          </div>

                          <Label>Times</Label>
                          {pr.times?.map((t, tIdx) => {
                            return (

                              <Card key={t._id} className=''>
                                <CardContent>
                                  <div className='flex flex-col gap-2'>
                  
                  
                                    <div className="flex gap-2">
                                      <div>
                                        <div className='text-sm text-muted-foreground'>starts</div>
                                        <div className='flex flex-row items-center space-x-2'>
                                          <DateTimePicker 
                                            value={t.start} 
                                            onChange={(newDate) => updateTime({
                                              productIdx: pIdx, priceIdx: prIdx, timeIdx: tIdx,
                                              changes: { start: newDate }
                                            })}
                                          />
                                        </div>
                                      </div>
                  
                                      <div>
                                        <div className='text-sm text-muted-foreground'>repeats every</div>
                                        <div className='flex flex-row items-center space-x-2 relative'>
                                          <Input
                                            type="number"
                                            className="w-28"
                                            value={t.repeatInterval || 0}
                                            placeholder="7"
                                            onChange={(e) => updateTime({
                                              productIdx: pIdx, priceIdx: prIdx, timeIdx: tIdx,
                                              changes: { repeatInterval: Number(e.target.value) }
                                            })}
                                          />
                                          <div className="absolute right-10 text-muted-foreground">
                                            days
                                          </div>
                                        </div>
                                      </div>
                  
                                      <div className="-ml-2">
                                        <div className='text-sm text-muted-foreground'>times</div>
                                        <div className='flex flex-row items-center space-x-2 relative'>
                                          <Input
                                            type="number"
                                            className="w-28"
                                            placeholder="10"
                                            value={t.repeatCnt || 0}
                                            disabled={t.repeatAlways === true}
                                            onChange={(e) => updateTime({
                                              productIdx: pIdx, priceIdx: prIdx, timeIdx: tIdx,
                                              changes: { repeatCnt: Number(e.target.value) }
                                            })}
                                            />
                                        </div>
                                      </div>
                                      <div className='flex flex-col h-full'>
                                        <div className='text-sm text-muted-foreground'>repeat always</div>
                                        <Checkbox 
                                          checked={t.repeatAlways || false}
                                          onCheckedChange={(e) => updateTime({
                                            productIdx: pIdx, priceIdx: prIdx, timeIdx: tIdx,
                                            changes: { repeatAlways: e, repeatCnt: e ? 0 : t.repeatCnt }
                                          })}
                                        />  
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <div className='text-muted-foreground text-sm'>
                                        {getLastClassDate(t) === -1 ? "repeats until cancelled" : `last class ${getLastClassDate(t)}`}
                                      </div>
                                    </div>
                  
                  
                                  </div>
                                </CardContent>
                              </Card>
    



                            )
                          })}

                          <div>
                            <Button type="icon" variant="outline" onClick={() => addTime({productIdx: pIdx, priceIdx: prIdx})}>
                              <Plus /> New Time
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <Button type="icon" variant="outline" className="mt-2" onClick={() => addPrice(p._id)}>
                  <Plus /> New Price
                </Button>

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