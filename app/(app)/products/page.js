'use client'
import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useImmer } from 'use-immer'

import IconSelect from '@/components/icon-select'

import * as Tabs from "@radix-ui/react-tabs"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@radix-ui/react-separator"
import { Button } from '@/components/ui/button'
import { Tag, ChevronsUpDown, Plus } from "lucide-react"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Page() {
  const [ categories, setCategories ] = useState([])
  const [ category, setCategory ] = useState({})
  const [ product, setProduct ] = useState({})
  const [ products, setProducts ] = useImmer([])
  const [ productsUI, setProductsUI ] = useState({})
  const [ productsUIAll, setProductsUIAll ] = useState(false)

  // for the icon select dialogs 
  const [ openById, setOpenById ] = useState({})
  const setDialogOpen = (id, isOpen) => {
    setOpenById((prev) => ({ ...prev, [id]: isOpen }));
  };

  const contentRefs = useRef({});

  useEffect(() => {
    const updatedUI = {};
  
    products.forEach((product) => {
      const ref = contentRefs.current[product.id];
      if (ref && ref.scrollHeight) {
        updatedUI[product.id] = {
          ...(productsUI[product.id] || {}),
          height: ref.scrollHeight,
        };
      }
    });
  
    setProductsUI((prev) => ({
      ...prev,
      ...updatedUI,
    }));
  }, [products]);

  useEffect(() => {
    async function start() {
      const res = await fetch(`/api/categories`)
      const c = await res.json()
      setCategories(c.categories)
    }
    start()
  },[])

  const saveCategory = async () => {
    const res = await fetch(`/api/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({name: category.name}),
    })
    const c = await res.json()
    setCategory({})
    setCategories([c.category, ...categories])
  }

  const updateProduct = async (p,pIdx,uiOpen) => {
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: p }),
    });
    const updatedProduct = await res.json();
    
    if (uiOpen)
      setProductsUI({
        ...productsUI,
        [updatedProduct.product.id]: { state: uiOpen }
      })

    await setProducts((_p) => {
      _p[pIdx] = updatedProduct.product
    })
  }

  const deleteProduct = async (p) => {
    console.log(p.id)

    const res = await fetch(`/api/products/${p.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
    const newProducts = products.filter((_p) => _p.id !== p.id);
    setProducts(newProducts);
  }

  const getCategoryProducts = async (c) => {
    const res = await fetch(`/api/categories/${c.id}/products`)
    const _products = await res.json()
    console.log(_products)
    const updatedProducts = _products.map((p) => ({
      ...p,
      prices: p.prices || [{ name: "", amount: "" }],
    }))
    // console.log(updatedProducts)
    setProducts(updatedProducts)
  }

  return (
    <Card>

      <CardHeader>
        <CardTitle className="flex text-lg">Non-Subscription Products</CardTitle>
        <Separator className="h-[1px] mt-4 bg-muted"/>
      </CardHeader>


      <Tabs.Root className="flex w-full" defaultValue="tab1">

        <Tabs.List className="flex flex-col min-w-56 text-sm- *:font-semibold">
          <Card className="ml-4">
            <CardHeader className="">
              <div className="flex space-x-4">
                <CardTitle className="flex space-x-1 items-center -mt-4">
                  {/* <SquareMenu /> */}
                  <div className=''>Categories</div>
                </CardTitle>
                <Button size="sm" onClick={() => setCategory({new: true, name: ""})} variant="outline" className="relative text-xs -top-2 right-0">
                  New
                </Button>
              </div>
            </CardHeader>
            <Separator className="h-[1px] -mt-5 bg-muted"/>

            <CardContent className="text-sm flex flex-col p-0 -top-6 relative">

              {category.new &&
                <Tabs.Trigger
                  className="text-left p-4 pl-6 data-[state=active]:bg-muted"
                  value="new"
                >
                  <Input
                    placeholder="Coffees"
                    value={category.name} 
                    onChange={(e) => {
                      setCategory({...category, name: e.target.value})
                    }} 
                  />

                </Tabs.Trigger>
              }
              
              {categories.map((c) => {c
                return (
                  <Tabs.Trigger
                    key={c.id}
                    className="text-left p-4 pl-6 data-[state=active]:bg-muted"
                    value={c.name}
                    onClick={() => {
                      setCategory(c)
                      setProduct({new: false})
                      getCategoryProducts(c)
                      // getCategoryVariations(c)
                      // getCategoryVariants(c)

                    }}
                  >
                    {c.name}
                  </Tabs.Trigger>
                )
              })}


            </CardContent>
          </Card>
        </Tabs.List>

        {/* Tab Content */}
        <div className="px-4 w-full">
          <div className='flex pb-4 items-center'>
            {/* <SquareMenu /> */}
            <div className="ml-1 text-lg font-semibold">{category?.name ? category.name : ""}</div>
            {category.id &&
              <div className='ml-auto flex space-x-2'>
              <Button 
                variant="outline" className="ml-auto text-xs" size="sm" 
                onClick={() => {
                  setProducts([{name: "", new: true}, ...products])
                }}
              >
                New Product
              </Button>
              <Button 
                variant="outline" className="ml-auto text-xs" size="sm" 
                onClick={() => {
                  setProductsUI(
                    products.reduce((acc, product) => {
                      acc[product.id] = { height: contentRefs.current[product.id].scrollHeight, state: !productsUIAll };
                      return acc
                    }, {})
                  )
                  setProductsUIAll(!productsUIAll)
                }}
              >
                <ChevronsUpDown className="mx-auto size-4" />
              </Button>
              </div>
            }
          {(category.new && category.name) &&
            <Button
              className="ml-auto"
              onClick={() => {
                saveCategory()

                setCategory(c)
                setProduct({new: false})
                getCategoryProducts(c)
              }}
            >Save
            </Button>
          }
          </div>
          <Tabs.Content value="new">
            <Card>
              <CardHeader>
                <CardTitle className="flex">
                  item name placeholder
                </CardTitle>
                <CardContent></CardContent>
              </CardHeader>
              <Separator className="h-[1px] mt-4- bg-muted"/>
              <CardContent>
                new
              </CardContent>
            </Card>
          </Tabs.Content>

          {categories.map((c,i) => {
            return (
            <Tabs.Content key={i} value={c.name} className='flex flex-col space-y-4 w-full'>


              {products.map((p,pIdx) => {
                if (p.new) return (
                  <Card key={pIdx}>
                    <CardContent>
                      <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor={c.id}>Product Name</Label>
                        <div className='flex w-full space-x-4'>
                          <Input 
                            id={c.id} 
                            type="text" placeholder="Flat White"
                            onChange={(e) => {
                              setProducts((_p) => {
                                _p[pIdx].name = e.target.value
                              });
                              // setProduct({...product, name: e.target.value})
                            }}
                            value={p.name || ""}
                            // onChange={(e) => setProducts((d) => { d[0].name = e.target.value})}
                          />
                          <div className='flex-1'/>
                          <Button 
                            className="ml-auto"
                            onClick={() => {
                              updateProduct({...p, categoryId: category.id},pIdx, true)
                              // const p = saveProduct()
                              // setProduct({new: false})
                            }}
                          >Save product</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                )
                return (
                  <Card 
                    key={pIdx}
                    ref={(el) => contentRefs.current[p.id] = el }
                    className={`overflow-hidden transition-all duration-300 ease-in-out`}
                    style={{
                      maxHeight: productsUI[p.id]?.state ? `${productsUI[p.id]?.height}px` : "105px",
                    }}
                    // className={`${
                    //   productsUI[p.id]?.state ? 'max-h-max' : 'max-h-20'
                    // } overflow-hidden transition-all duration-300 ease-in-out`}
                  >
                    <CardHeader>
                      <CardTitle className="flex w-full items-center space-x-4">
                        {openById[p.id] && 
                        <IconSelect
                          product={p}
                          query={p.name}
                          setProducts={setProducts}
                          updateProduct={updateProduct}
                          productIdx={pIdx}
                          open={openById[p.id] || false}
                          setOpen={(isOpen) => setDialogOpen(p.id, isOpen)}
                          
                        />
                        }
                        <div onClick={() => setDialogOpen(p.id, true)}>
                          {!p.data?.thumbnail && 
                            <Button className="bg-white rounded-lg w-14 h-14">
                              <Tag className="!w-8 !h-8" />
                            </Button>
                          }
                          {p.data?.thumbnail &&
                            <Button className='bg-white rounded-lg p-1 w-14 h-14'>
                              <img src={p.data.thumbnail} />
                            </Button>
                          }
                        </div>

                        <div>{p.name}</div>

                        <div 
                          className='ml-auto'
                          onClick={() => {
                            const el = contentRefs.current[p.id]
                            // console.log(el.scrollHeight)

                            setProductsUI({
                              ...productsUI,
                              [p.id]: {
                                ...productsUI[p.id],
                                state: !productsUI[p.id]?.state,
                                height: el.scrollHeight
                              }
                            })
                          }}
                        >
                          <Button variant="ghost">
                            <ChevronsUpDown className="size-4" />
                          </Button>
                        </div>
                      </CardTitle>
                      {/* <CardContent></CardContent> */}
                    </CardHeader>
                    {/* <Separator className="h-[1px] mt-4- bg-muted"/> */}

                    {/* PRICES / SIZES */}

                    <CardContent>

                    {/* <Button variant="outline" onClick={() => getIcons(p)}>
                          icon test
                        </Button> */}
                      <div className='flex space-x-4 mb-2'>
                        <Label className="text-sm">Sizes</Label>
                        <Button 
                          size="sm" className="text-xs" variant="outline"
                          onClick={() => {
                            setProducts((_p) => {
                              // _p[pIdx].prices.push({ name: "", amount: "" }); 
                              _p[pIdx].prices = [..._p[pIdx].prices, { name: "", amount: "" }]
                              _p[pIdx].updated = true
                            });
                          }}
                          
                        >
                          Add Size
                        </Button>
                      </div>
                      {p?.prices?.length > 0 &&
                      <div className='flex flex-row'>
                        <Label  className={`${i > 0 ? "hidden" : ""} text-xs mb-1 w-26`}>
                          Size
                        </Label>
                        <Label className={`${i > 0 ? "hidden" : ""} text-xs mb-1 w-24`}>
                          Price
                        </Label>
                      </div>
                      }
                      {p?.prices?.map((pr, i) => (
                        <div className="flex space-x-2 space-y-2" key={`${p.id}-${i}`}>

                          <div className="flex flex-col w-24 items-center">
                            <Input
                              type="text"
                              placeholder="SM"
                              value={pr.name}
                              className="text-sm"
                              onChange={(e) => {
                                setProducts((_p) => { 
                                  _p[pIdx].prices[i].updated = true
                                  _p[pIdx].prices[i].name = e.target.value
                                })
                              }}
                            />
                          </div>
                          <div className="w-24 items-center">
                            <Input
                              type="text"
                              placeholder="5.50"
                              className="text-sm"
                              value={pr.amount}
                              onChange={(e) => {
                                setProducts((_p) => { 
                                  _p[pIdx].prices[i].amount = e.target.value
                                  _p[pIdx].prices[i].updated = true

                                })
                              }}
                            />
                          </div>
                          <Button // save price / amount
                            variant=""
                            className={`${pr.updated ? '' : 'hidden'}`}
                            onClick={() => {
                              updateProduct(p,pIdx,true)
                            }}
                          >
                            Save
                          </Button>

                          {pr.id > 0 &&
                          <Button 
                            variant="destructive" className="ml-auto"
                            onClick={() => {
                              setProducts((_p) => { 
                                _p[pIdx].prices[i].delete = true
                              })
                              const _prices = JSON.parse(JSON.stringify(p.prices))
                              _prices[i].delete = true

                              updateProduct({...p, prices: [..._prices]},pIdx, true)
                            }}
                          > 
                            Del
                          </Button>
                          }

                        </div>
                      ))}

                      {/* VARIATIONS */}



                      {/* VARIANTS / VARIATIONS */}
                      {/* {p.variations.filter(v => v.enabled).length > 0 &&  */}
                      <div className='flex flex-row space-x-4 mt-4 items-center'>
                        <Label className="">Variations</Label>
                        <div className="">
                          {/* <Label>Variations</Label> */}
                          <Select value="" className="w-full" 
                            onValueChange={(vIdx) => {
                              if (vIdx === "new")
                                setProducts((_p) => {
                                  _p[pIdx].variations = [{variants: [], name: "", id: -1, new: true, enabled: true}, ..._p[pIdx].variations]
                                })
                              else
                                setProducts((_p) => {                              
                                  _p[pIdx].variations[vIdx].enabled = true
                                })
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Add Variation" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem key="new" value="new">Add New +</SelectItem>

                                {(() => {
                                  return p?.variations?.map((v,i) => {
                                    console.log(`v.id = ${v.id}`)
                                    if (!v.enabled)
                                      return (
                                      <SelectItem key={v.id} value={i}>
                                        {v.name}
                                      </SelectItem>
                                  )})
                                })()}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* <Card className='mt-2'> */}
                        {/* <CardContent> */}
                          <div className='grid grid-cols-[1fr_4fr] gap-y-4 mt-4'>
                            <div></div>
                            <Label>Variants</Label>

                            {/* <div> */}
                            {(() => {
                              return p.variations.map((v,vIdx) => {
                                return (
                                  <React.Fragment key={vIdx}>
                                  <Label>{v.name}</Label>


                                  <div className='flex flex-wrap space-y-2 space-x-2'>
                                    {v?.variants?.map((vv,vvIdx) => {
                                      
                                      // handle new variant
                                      if (vv.new) return (
                                        <div key={vvIdx} className='flex space'>
                                          <Input
                                            value={vv.name || ""} placeholder="Soy" className="w-24 rounded-r-none h-[32.5px]"
                                            onChange={(e) => {
                                              setProducts((_p) => {
                                                _p[pIdx].variations[vIdx].variants[vvIdx].name = e.target.value
                                              })
                                            }}
                                          />
                                          <Input
                                            size="sm"
                                            onChange={(e) => {
                                              setProducts((_p) => {
                                                _p[pIdx].variations[vIdx].variants[vvIdx].amount = e.target.value
                                              })
                                            }}
                                            value={vv.amount || ""} placeholder="$0.75" className="w-24 rounded-none h-[32.5px]"></Input>
                                          <Button
                                            size="sm"
                                            className="rounded-l-none"
                                            onClick={async () => {
                                              await updateProduct(p, pIdx, true)
                                              await getCategoryProducts(c)
                                            }}
                                          >
                                            Save
                                          </Button>
                                        </div>
                                      )

                                      // existing variants
                                      return (
                                        <Button
                                        size="sm"
                                          variant={vv.enabled ? '' : 'outline'} key={vv.id}
                                          onClick={() => {
                                            setProducts((_p) => {
                                              _p[pIdx].variations[vIdx].variants[vvIdx].enabled = !vv.enabled
                                              updateProduct(_p[pIdx], pIdx)
                                            })
                                          }}
                                        >
                                          {vv.name} {vv.amount ? `$${vv.amount.toFixed(2)}` : ""}
                                        </Button>
                                      )
                                    })}

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setProducts((_p) => {
                                          _p[pIdx].variations[vIdx].variants = [{new: true, enabled: true, variationId: v.id}, ..._p[pIdx].variations[vIdx].variants]
                                        })    
                                      }}
                                    >
                                      <Plus />
                                    </Button>

                                  </div>



                                  </React.Fragment>
                                )
                              })
                            })()}
                            {/* </div> */}



                          </div>
                        {/* </CardContent> */}


                      {/* <CardContent>
                        <div className='flex flex-col space-y-4'>

                          {(() => {
                            return p.variations.map((v,vIdx) => {
                              if (v.new) return (
                                <div key={vIdx} className='flex space-x-2'>
                                  <Input
                                    placeholder="Milk"
                                    value={v.name} 
                                    onChange={(e) => {
                                      setProducts((_p) => {
                                        _p[pIdx].variations[vIdx].name = e.target.value
                                      })
                                    }} 
                                  />
                                  <Button
                                    variant={v.name.length > 2 ? '' : 'disabled'}
                                    onClick={() => {
                                      if (v.name.length > 2)
                                        updateProduct(p, pIdx, true)
                                    }}
                                  >
                                    Save
                                  </Button>
                                </div>
                              ) 
                              // else if (!v.enabled) return
                              return (
                                  <div key={vIdx} className='flex flex-col'>
                                    <Label className="mb-2">{v.name}</Label>

                                    <div className='flex space-x-2'>

                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setProducts((_p) => {
                                            _p[pIdx].variations[vIdx].variants = [{new: true, enabled: true, variationId: v.id}, ..._p[pIdx].variations[vIdx].variants]
                                            // updateProduct(_p[pIdx], pIdx)
                                          })    
                                        }}
                                      >
                                        + Variant
                                      </Button>

                                      <Separator className="ml-2 mr-4 h-8 w-[1px] bg-muted" orientation="vertical"></Separator>

                                      <div className='flex flex-wrap space-y-2 space-x-2'>
                                        {v?.variants?.map((vv,vvIdx) => {
                                          
                                          // handle new variant
                                          if (vv.new) return (
                                            <div key={vvIdx} className='flex space'>
                                              <Input
                                                value={vv.name || ""} placeholder="Soy" className="w-24 rounded-r-none h-[32.5px]"
                                                onChange={(e) => {
                                                  setProducts((_p) => {
                                                    _p[pIdx].variations[vIdx].variants[vvIdx].name = e.target.value
                                                  })
                                                }}
                                              ></Input>
                                              <Input
                                                size="sm"
                                                onChange={(e) => {
                                                  setProducts((_p) => {
                                                    _p[pIdx].variations[vIdx].variants[vvIdx].amount = e.target.value
                                                  })
                                                }}
                                                value={vv.amount || ""} placeholder="$0.75" className="w-24 rounded-none h-[32.5px]"></Input>
                                              <Button
                                                size="sm"
                                                className="rounded-l-none"
                                                onClick={async () => {
                                                  await updateProduct(p, pIdx, true)
                                                  await getCategoryProducts(c)
                                                }}
                                              >
                                                Save
                                              </Button>
                                            </div>
                                          )

                                          // existing variants
                                          return (
                                            <Button
                                            size="sm"
                                              variant={vv.enabled ? '' : 'outline'} key={vv.id}
                                              onClick={() => {
                                                setProducts((_p) => {
                                                  _p[pIdx].variations[vIdx].variants[vvIdx].enabled = !vv.enabled
                                                  updateProduct(_p[pIdx], pIdx)
                                                })
                                              }}
                                            >
                                              {vv.name} {vv.amount ? `$${vv.amount.toFixed(2)}` : ""}
                                            </Button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                
                              )
                            })

                            })()}
                          </div>
                      </CardContent> */}
                      {/* </Card> */}
                      {/* } */}

                      {/* Delete Product Buttons */}
                      <div className='flex mt-4 ml-auto space-x-2'>
                        <Button 
                          variant={p.delete ? 'destructive' : 'outline'} className="w-full-"
                          onClick={() => {
                            if (p.delete)
                              return deleteProduct(p)

                            setProducts((_p) => {
                              _p[pIdx].delete = true
                              // _p[pIdx].deleteConfirm = _p[pIdx].delete ? _p[pIdx].delete : false
                            })
                          }}
                        >
                          {p.delete ? 'Are you sure?' : 'Delete product'}
                        </Button>
                        {p.delete &&
                        <Button 
                          variant="" className="w-full-"
                          onClick={() => {
                            setProducts((_p) => {
                              _p[pIdx].delete = false
                            })
                          }}
                        >
                          Cancel
                        </Button>
                        }
                      </div>

                    </CardContent>
                  </Card>
                )
              })}

            </Tabs.Content>
            )
          })}

        </div>
      </Tabs.Root>
    </Card>
  )
}
