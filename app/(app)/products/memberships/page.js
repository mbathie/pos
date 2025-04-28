'use client'

import { Fragment, useState, useRef, useEffect } from "react"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronsUpDown, Ellipsis } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogDescription } from "@/components/ui/alert-dialog"
import { useImmer } from "use-immer"

export default function Page() {
  const [products, setProducts] = useImmer([])
  const [menuStates, setMenuStates] = useState({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState({})
  const [expandAll, setExpandAll] = useState(false)

  const contentRefs = useRef({})

  const frequencyOptions = ["hourly", "daily", "weekly", "fortnightly", "monthly", "annually"]

  useEffect(() => {
    async function start() {
      const res = await fetch("/api/products/subscriptions");
      const data = await res.json();
      setProducts(data);
    }
    start();
  }, []);

  // Update all menu states when expandAll toggles
  useEffect(() => {
    const newStates = {}
    products.forEach((p) => {
      newStates[p.id] = expandAll
    })
    setMenuStates(newStates)
  }, [expandAll, products])

  // const updateProducts = async () => {
  //   await fetch("/api/products/subscriptions", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ products })
  //   })
  //   getProducts()
  // }

  const handleDelete = async () => {
    if (toDelete.priceId)
      deletePrice(toDelete.productId, toDelete.priceId)
    if (toDelete.productId)
      deleteProduct(toDelete.productId, toDelete.priceId)
  }

  const deletePrice = async (productId, priceId) => {
    const res = await fetch(`/api/prices/${priceId}`, {
      method: "DELETE",
    });
  
    setProducts((draft) => {
      const product = draft.find((p) => p.id === productId);
      product.prices = product.prices.filter((price) => price.id !== priceId);
    })
  }

  const deleteProduct = async (productId) => {
    const res = await fetch(`/api/products/${productId}`, { method: "DELETE" })
  
    setProducts((draft) => {
      const index = draft.findIndex((p) => p.id === productId)
      if (index !== -1)
        draft.splice(index, 1)
    })
  }

  const updateProduct = async (product) => {
    const res = await fetch(`/api/products/${product.id}/subscriptions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product }),
    })
    const data = await res.json();
    const updatedProduct = data.product;

    setProducts((draft) => {
      const index = draft.findIndex((p) => p.id === updatedProduct.id);
      if (index !== -1) {
        // Replace product data directly
        draft[index] = { ...draft[index], ...updatedProduct };
      }
    })
  }

  const createProduct = async (product) => {
    const res = await fetch(`/api/products/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product })
    });
  
    const newProduct = await res.json();
    console.log(newProduct.product);
  
    // Update the products state with the new product
    setProducts((prevProducts) => [
      newProduct.product.id !== 0 ? newProduct.product : null,
      ...prevProducts.filter((p) => p.id !== 0)
    ].filter(Boolean));
  
    setTimeout(() => {
      setMenuStates((prev) => ({
        ...prev,
        [newProduct.product.id]: true
      }));
  
    }, 200)
  }

  const getProducts = async () => {
    const res = await fetch("/api/products/subscriptions")
    const _products = await res.json()    
  }

  return (
    <>
      {/* ALERT DIALOG */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document.body.style.pointerEvents = '';
            }}
          >
            <AlertDialogTitle>Dialog Title</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete?</AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete()}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      {/* TOP BAR */}
      <div className="flex space-x-2">
        <Button 
          size="sm" variant="outline"
          onClick={() => {
            setProducts([{name: "", id: 0}, ...products])
          }}
        >
          New Membership
        </Button>
        <div className="flex-1"/>
        <Button size="sm" variant="outline" onClick={() => setExpandAll((prev) => !prev)}>
          <ChevronsUpDown className="size-4" />
        </Button>
      </div>

      {/* PRODUCTS LIST */}
      {products.map((p, i) => (
        <Card
          key={i}
          className="overflow-hidden transition-all duration-300 ease-in-out"
        >
          <CardHeader>
            <CardTitle className="flex w-full items-center space-x-4">
              <div className="mr-auto flex space-x-2 items-center">
                {p.id > 0 &&
                  <div>{p.name}</div>
                }
                {!p.id &&
                  <Fragment>
                    <Input
                      className="text-sm font-normal"
                      value={p.name} 
                      placeholder="Gym Membership"
                      onChange={(e) => {
                        setProducts((_p) => {
                          _p[i].name = e.target.value
                        })
                      }}
                    />
                    <Button onClick={() => createProduct(p)}>
                      Save
                    </Button>
                  </Fragment>
                }

                {!p.edit &&
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost">
                      <Ellipsis className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => {
                        setDeleteOpen(true)
                        setToDelete({productId: p.id})
                      }}
                    >
                      Delete Product
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                }
              </div>

              {/* Per-card Expand Button */}
              <Button
                variant="ghost"
                onClick={() => {
                  setMenuStates((prev) => ({
                    ...prev,
                    [p.id]: !prev[p.id]
                  }));
                }}
              >
                <ChevronsUpDown className="size-4" />
              </Button>
            </CardTitle>
          </CardHeader>

          {/* CARD CONTENT WITH HEIGHT TOGGLE */}
          <CardContent
            ref={(el) => contentRefs.current[p.id] = el}
            style={{
              height: menuStates[p.id] ? contentRefs.current[p.id]?.scrollHeight : 0,
              overflow: 'hidden',
              transition: 'height 300ms ease'
            }}
          >
            <div className='flex space-x-4 mb-4'>
              <Label className="text-sm">Billing period</Label>
              <Button
                size="sm" 
                className="text-xs" 
                variant="outline"
                onClick={() => {
                  setProducts((draft) => {
                    if (!draft[i].prices) draft[i].prices = [];
                    draft[i].prices.push({ name: "", amount: "" });
                  })

                  setTimeout(() => {
                    const contentEl = contentRefs.current[p.id]
                    if (contentEl) {
                      requestAnimationFrame(() => {
                        contentEl.style.height = contentEl.scrollHeight + 'px';
                      });
                    }
                  }, 50);
                }}
              >
                Add Frequency
              </Button>
            </div>

            <div className="flex flex-col space-y-2">
              {p.prices?.map((pr, prIdx) => (
                <div key={prIdx} className="flex flex-row space-x-2">
                  <div className="w-32">
                    <Select
                      value={pr.name}
                      onValueChange={(value) => {
                        setProducts((draft) => {
                          draft[i].prices[prIdx].name = value
                          draft[i].prices[prIdx].edit = true

                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencyOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Input
                    value={pr.amount}
                    className="w-24"
                    onChange={(e) => {
                      setProducts((draft) => {
                        draft[i].prices[prIdx].amount = e.target.value;
                        draft[i].prices[prIdx].edit = true
                      });
                    }}
                  />

                  {pr.id &&
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost">
                        <Ellipsis className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => {
                          setDeleteOpen(true)
                          setToDelete({priceId: pr.id, productId: p.id})
                        }}
                      >
                        Delete Price
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  }

                  {pr.edit &&
                  <Button
                    onClick={() => updateProduct(p)}
                  >
                    Save
                  </Button>
                  }

                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}