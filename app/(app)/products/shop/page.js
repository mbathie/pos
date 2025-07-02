'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useImmer } from 'use-immer';

import * as Tabs from '@radix-ui/react-tabs';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Separator } from '@radix-ui/react-separator'
import { Button } from '@/components/ui/button'
import { Tag, ChevronsUpDown, Plus, Ellipsis, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

import { actions } from './actions'
import { useUI } from '../useUI';
import Delete from '../Delete'
import { FolderSelect } from './folderSelect'
import IconSelect  from '@/components/icon-select'
import colors from 'tailwindcss/colors';

export default function Page() {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState({});
  const [product, setProduct] = useState({});
  const [products, setProducts] = useImmer([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState({});

  const [ addItem, setAddItem ] = useState({})
  const [ addItemOpen, setAddItemOpen ] = useState(false)

  // Icon dialog state
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconDialogProductIdx, setIconDialogProductIdx] = useState(null);
  const [iconDialogQuery, setIconDialogQuery] = useState('');

  const { 
    addVariation, updateVariation, 
    updateProduct, saveProduct, addProduct, deleteProduct,
    deleteVariation, addModCat, 
    addMod, updateMod, saveMod, updateModCat, setFolder } = actions({category, setProducts})
  const contentRefs = useRef({});
  const { productsUI, toggleExpanded, toggleAll } = useUI({products, contentRefs});

  const originalProducts = useRef({});
  const [isDirty, setIsDirty] = useState({});
  useEffect(() => {
    console.log(products)
    const updatedIsDirty = { ...isDirty };
    
    products.forEach((p) => {
      originalProducts.current[p._id] = originalProducts.current[p._id] || JSON.parse(JSON.stringify(p));
    });

    products.forEach((p) => {
      const isProductChanged = JSON.stringify(p) !== JSON.stringify(originalProducts.current[p._id]);
      updatedIsDirty[p._id] = isProductChanged || !p._id
    });
    setIsDirty(updatedIsDirty);
  }, [products]);

  const handleDelete = async () => {
    if (toDelete.variationIdx !== undefined)
      deleteVariation(toDelete)
    setToDelete({})
  }

  useEffect(() => {
    async function fetchCategories() {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/categories?menu=shop');
      const c = await res.json();
      setCategories(c.categories);
    }
    fetchCategories();
  }, []);

  const saveCategory = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${category.name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu: 'shop' }),
    });
    const c = await res.json();
    setCategory(c.category);
    setCategories([c.category, ...categories]);
    getCategoryProducts(c.category);
  }

  const getCategoryProducts = async (c) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${c._id}/products`);
    const _products = await res.json()
    setProducts(_products.products)
  };

  return (
    <>
      {/* FOR ADDING SOMETHING */}
      <Dialog
        open={addItemOpen} onOpenChange={setAddItemOpen}
      >
        <DialogTrigger asChild>
          <span style={{ display: "none" }} />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter New Modification Name</DialogTitle>
            <DialogDescription>
              Enter a Modification, i.e. Milk, Extras, Sugar, etc
            </DialogDescription>
          </DialogHeader>
          <Input placeholder="Milk" value={addItem.name || ""} 
            onChange={(e) => {
              setAddItem({...addItem, name: e.target.value})
            }}
          />
          <Button
            onClick={() => {
              addModCat({pIdx: addItem.pIdx, name: addItem.name, multi: false})
              setAddItemOpen(false)
              setAddItem({})
            }}
          >
            Save
          </Button>

        </DialogContent>
      </Dialog>

      {/* FOR DELETING SOMETHING */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document.body.style.pointerEvents = '';
            }}
          >
            <AlertDialogTitle>Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete?
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete()}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      <Card className="mx-4">
        <CardHeader>
          <CardTitle className="flex text-lg">
            Retail Shop Products
          </CardTitle>
        </CardHeader>
        <Tabs.Root className="flex w-full" defaultValue="tab1">
          <Tabs.List className="flex flex-col min-w-56 text-sm *:font-semibold">
            <Card 
              className="ml-4">
              <CardHeader>
                <div className="flex space-x-4">
                  <CardTitle className="flex space-x-1 items-center -mt-4">
                    Categories
                  </CardTitle>
                  <Button
                    size="icon"
                    onClick={() => {
                      setCategory({ new: true, name: '' })
                      setProducts([])
                    }}
                    variant="outline"
                    className="relative text-xs -top-2 right-0"
                  >
                    <Plus />
                  </Button>
                </div>
              </CardHeader>
              <Separator className="h-[1px] -mt-5 bg-muted" />
              <CardContent className="text-sm flex flex-col p-0 -top-6 relative">
                {category.new && (
                  <Tabs.Trigger
                    className="text-left p-4 pl-6 data-[state=active]:bg-muted"
                    value="new"
                  >
                    <Input
                      placeholder="Coffees"
                      value={category.name || ''}
                      onChange={(e) =>
                        setCategory({ ...category, name: e.target.value })
                      }
                    />
                  </Tabs.Trigger>
                )}
                {categories.map((c) => (
                  <Tabs.Trigger
                    key={c._id}
                    className="text-left p-4 pl-6 data-[state=active]:bg-muted"
                    value={c.name}
                    onClick={() => {
                      setCategory(c);
                      setProduct({ new: false });
                      getCategoryProducts(c);
                    }}
                  >
                    {c.name}
                  </Tabs.Trigger>
                ))}
              </CardContent>
            </Card>
          </Tabs.List>
          <div className="px-4 w-full">
            <div className="px-4 w-full">
              <div className="flex pb-4 items-center">
                <div className="ml-1 text-lg font-semibold">
                  {category?.name ? category.name : ''}
                </div>
                {category._id && (
                  <div className="ml-auto flex space-x-2">
                    <Button
                      variant="outline"
                      className="ml-auto text-xs"
                      size="sm"
                      onClick={() => addProduct()}
                    >
                      New Product
                    </Button>
                    <Button
                      variant="outline"
                      className="ml-auto text-xs"
                      size="sm"
                      onClick={() => toggleAll()}
                    >
                      <ChevronsUpDown className="mx-auto size-4" />
                    </Button>
                  </div>
                )}
                {category.new && category.name && (
                  <Button
                    className="ml-auto"
                    onClick={() => {
                      saveCategory();
                    }}
                  >
                    Save
                  </Button>
                )}
              </div>



              {/* {categories.map((c, i) => (
                <Tabs.Content
                  key={c._id}
                  value={c.name}
                  className="flex flex-col space-y-4 w-full"
                > */}

                  


                  {products?.map((p, pIdx) => 
                    (
                      <Card
                        // key={pIdx}
                        key={p._id}
                        ref={(el) => (contentRefs.current[p._id] = el)}
                        className='overflow-hidden transition-all duration-300 ease-in-out'
                        style={{
                          maxHeight: productsUI[p._id]?.expanded ? `${productsUI[p._id]?.height}px` : '105px',
                        }}
              
                      >
                        <CardHeader>
                          <CardTitle className="flex w-full items-center space-x-4">
                          <div onClick={() => {
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

                            <div>{p.name}</div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant='ghost'>
                                  <Ellipsis className='size-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end'>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setToDelete({ pIdx, product: p })
                                    setDeleteOpen(true)
                                  }}
                                >
                                  Delete Product
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {isDirty[p._id] && (
                              <Button
                                size="sm"
                                className="bg-lime-400"
                                onClick={async () => {
                                  const updated = await saveProduct({product: p, pIdx})
                                  originalProducts.current[p._id] = JSON.parse(JSON.stringify(updated));
                                  setIsDirty((prev) => ({ ...prev, [p._id]: false }));                  
                                }}
                              >
                                Save
                              </Button>
                            )}

                            <Button
                              className="ml-auto"
                              onClick={() => toggleExpanded(p._id)}
                              variant="ghost">
                              <ChevronsUpDown className="size-4" />
                            </Button>

                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col space-y-2">

                          <div className="flex flex-col gap-1 w-[400px]">
                            <Label>Product Name</Label>
                            <Input
                              // id={c.id}
                              type="text"
                              placeholder="Flat White"
                              onChange={(e) => updateProduct({pIdx, key: "name", value: e.target.value})}
                              value={p.name || ''}
                            />
                          </div>

                          <div className="flex flex-col gap-1 w-[400px]">
                            <Label>Description</Label>
                            <Textarea
                              // id={c.id}
                              type="text"
                              placeholder=""
                              onChange={(e) => updateProduct({pIdx, key: "desc", value: e.target.value})}
                              value={p.desc || ''}
                            />
                          </div>

                            <div className="flex flex-col gap-1">
                            <Label>Folder</Label>
                            <div className='flex'>
                              <FolderSelect pIdx={pIdx} product={p} setFolder={setFolder}/>
                              {p.folder?.color && (
                                <div
                                  style={{ backgroundColor: colors?.[p.folder.color.split('-')[0]]?.[p.folder.color.split('-')[1]] }}
                                  className="size-9 rounded-md border ml-2"
                                />
                              )}
                            </div>
                          </div>

                          <div className="flex space-x-2-">
                            <Label className="text-sm mr-2">Variations</Label>
                            <Button
                              size="icon" variant="outline"
                              onClick={() => addVariation({pIdx})}
                            >
                              <Plus />
                            </Button>
                          </div>
                          <div className='flex flex-col'>
                            {p?.variations?.length > 0 && (
                              <div className="flex flex-row">
                                <Label className="text-xs w-26">
                                  Variation
                                </Label>
                                <Label className="text-xs w-24">
                                  Price
                                </Label>
                              </div>
                            )}
                            {p?.variations?.map((v, i) => (
                              <div
                                className="flex space-x-2 space-y-2"
                                key={`${p.id}-${i}`}
                              >
                                <div className="flex flex-col w-24 items-center">
                                  <Input
                                    type="text" placeholder="SM" value={v.name || ''} className="text-sm"
                                    onChange={(e) => updateVariation({pIdx, vIdx: i, key: "name", value: e.target.value})}
                                  />
                                </div>
                                <div className="w-24 items-center">
                                  <Input
                                    type="text" placeholder="5.50" className="text-sm" value={v.amount || ''}
                                    onChange={(e) => updateVariation({pIdx, vIdx: i, key: "amount", value: e.target.value})}
                                  />
                                </div>

                                {v.id > 0 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="icon">
                                        <Ellipsis className="size-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setDeleteOpen(true);
                                          setToDelete({ product: p, productIdx: pIdx, variationIdx: i });
                                        }}
                                      >
                                        Delete Variation
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            ))}
                          </div>


                          {/* ADD MODIFICATION DROPDOWN */}

                          <div className='flex'>
                            <Label className='mr-2'>Mod Groups</Label>
                            <Button
                              className="text-xs"
                              variant="outline"
                              size="icon" 
                              onClick={() => {
                                setAddItem({pIdx, p})
                                setAddItemOpen(true)
                              }}
                            >
                              <Plus />
                            </Button>

                          </div>

                          {/* MODIFICATIONS (used to be called variations) */}

                          <div className='grid grid-cols-[1fr_1fr_4fr] gap-y-2'>
                            <div></div>
                            <div className='flex space-x-2'>
                              <Label className="text-xs">Multi</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info size="15"/>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Allow more than one mod to</p>
                                    <p>be selected from the group</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className='flex space-x-2'>
                              <Label className="text-xs">Mods</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info size="15"/>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Enable mods on / off by clicking each one.</p>
                                    <p>Click the + to add new</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            {p.modCats?.map((mp, mcIdx) => {
                              return (
                                <React.Fragment key={mcIdx}>
                                  <div className='h-full w-28 flex items-start'>
                                    {!mp.new &&
                                      <Label>{mp.name}</Label>
                                    }
                                  </div>
                                  <div>
                                    <Switch
                                      checked={mp.multi}
                                      onCheckedChange={(value) => updateModCat({ pIdx, mcIdx, key: "multi", value })}
                                    />
                                  </div>
                                  <div className='flex flex-wrap space-x-2- space-y-2- gap-2'>
                                    {mp?.mods?.map((m, mIdx) => {
                                      return (
                                        <React.Fragment key={mIdx}>
                                          {!m.new &&
                                            <div key={mIdx}>
                                              <Button
                                                className="cursor-pointer"
                                                onClick={() => updateMod({ pIdx, mcIdx, mIdx, key: "enabled", value: !m.enabled })}
                                                variant={m.enabled ? "" : "outline"}>{m.name} {`${!isNaN(m?.amount) ? '$' + Number(m.amount).toFixed(2) : ''}`}
                                              </Button>
                                            </div>
                                          }
                                          {m.new &&
                                            <div key={mIdx} className='flex space'>
                                              <Input
                                                value={m.name || ""} placeholder="Soy" className="w-24 rounded-r-none h-[32.5px]-"
                                                onChange={(e) => updateMod({ pIdx, mcIdx, mIdx, key: "name", value: e.target.value })}
                                              />
                                              <Input
                                                size="sm"
                                                onChange={(e) => updateMod({ pIdx, mcIdx, mIdx, key: "amount", value: e.target.value })}
                                                value={m.amount || ""} placeholder="$0.75" className="w-24 rounded-none h-[32.5px]-"></Input>
                                              <Button
                                                className="rounded-l-none"
                                                onClick={() => saveMod({ pIdx, mcIdx, mIdx })}
                                              >
                                                Save
                                              </Button>
                                            </div>
                                          }
                                        </React.Fragment>
                                      ) 
                                    })}
                                    {!mp.new &&
                                    <Button
                                      variant="outline"
                                      onClick={() => addMod({ pIdx, mcIdx })}
                                    >
                                      <Plus />
                                    </Button>
                                    }
                                  </div>
                                </React.Fragment>
                              )
                            })}
                          </div>

                          
                        </CardContent>
                      </Card>
                    ),
                  )}
                {/* </Tabs.Content>
              ))} */}
            </div>
          </div>
        </Tabs.Root>
      </Card>

      <Delete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        name={`${toDelete?.product?.name}`}
        onConfirm={() => {
          console.log(toDelete)
          deleteProduct({...toDelete})
          setDeleteOpen(false);
        }}
      />
      <IconSelect
        open={iconDialogOpen}
        setOpen={setIconDialogOpen}
        pIdx={iconDialogProductIdx}
        query={iconDialogQuery}
        updateProduct={updateProduct}
      />
    </>
  );
}