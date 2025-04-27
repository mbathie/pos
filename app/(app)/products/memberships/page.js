'use client'

import { useState, useRef, useEffect } from "react"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { ChevronsUpDown } from "lucide-react"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { useImmer } from "use-immer"

const frequencyOptions = [
  "hourly",
  "daily",
  "weekly",
  "fortnightly",
  "monthly",
  "annually"
]

export default function Page() {
  const [products, setProducts] = useImmer([
    { name: 'Gym Membership', id: 1, prices: [{name: "monthly", amount: 123}, {name: "annually", amount: 123}] },
    { name: 'ABC Membership', id: 2 }
  ])

  const [productsUI, setProductsUI] = useState({})
  const [allOpen, setAllOpen] = useState(false)

  const updateProducts = async () => {
    await fetch("/api/products/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products)
    })
  }

  // refs for measuring content height
  const contentRefs = useRef({})

  useEffect(() => {
    setTimeout(() => {
      setProductsUI(prev => {
        const newState = { ...prev }
        products.forEach((product) => {
          const contentEl = contentRefs.current[product.id];
          const height = contentEl?.scrollHeight || 0;
  
          if (!newState[product.id]) {
            newState[product.id] = { state: false, height }
          } else {
            newState[product.id] = { ...newState[product.id], height }
          }
        })
        return newState
      })
    }, 0)
  }, [products])

  const updateCardHeight = (productId) => {
    const contentEl = contentRefs.current[productId];
    if (contentEl) {
      const newHeight = contentEl.scrollHeight;
      setProductsUI(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          height: newHeight
        }
      }));
    }
  }

  const toggleAll = () => {
    const newState = {}
    products.forEach((product) => {
      const contentEl = contentRefs.current[product.id]
      const height = contentEl?.scrollHeight || 0
      newState[product.id] = {
        state: !allOpen,
        height,
      }
    })
    setProductsUI(newState)
    setAllOpen(!allOpen)
  }

  return (
    <div className="flex flex-col space-y-4">

      <Button onClick={() => updateProducts()}>Save all</Button>

      <div className="flex">
        <Button 
          variant="outline" className="text-xs" size="sm" 
          onClick={() => {
            setProducts([{name: "", new: true}, ...products])
          }}
        >
          New Product
        </Button>

        <div className="mx-auto"/>

        <Button variant="outline" onClick={toggleAll} className="w-fit" size="sm">
          <ChevronsUpDown className="mx-auto size-4" />
        </Button>
      </div>

      {products.map((p, i) => {
        const isOpen = productsUI[p.id]?.state
        const height = productsUI[p.id]?.height ?? 0

        return (
          <Card
            key={p.id}
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              maxHeight: isOpen ? `${height + 110}px` : "89px", // 105px = header height estimate
            }}
          >
            <CardHeader>
              <CardTitle className="flex w-full items-center space-x-4">
                <div className="mr-auto">{p.name}</div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    const contentEl = contentRefs.current[p.id]
                    const scrollHeight = contentEl?.scrollHeight || 0
                    setProductsUI(prev => ({
                      ...prev,
                      [p.id]: {
                        state: !prev[p.id]?.state,
                        height: scrollHeight
                      }
                    }))
                  }}
                >
                  <ChevronsUpDown className="size-4" />
                </Button>

              </CardTitle>
            </CardHeader>

            <CardContent ref={el => contentRefs.current[p.id] = el}>


            <div className='flex space-x-4 mb-4'>
              <Label className="text-sm">Sizes</Label>
              <Button 
                size="sm" className="text-xs" variant="outline"
                onClick={() => {
                  setProducts((draft) => {
                    if (!draft[i].prices) draft[i].prices = []
                    draft[i].prices.push({ name: "", amount: "" })
                  })
                  setTimeout(() => updateCardHeight(p.id), 0)
                }}
              >
                Add Frequency
              </Button>
            </div>

            <div className="flex flex-col space-y-2">
              <div className="flex mb-1">
                <Label className={`${p.prices?.length ? "" : "hidden"} text-xs w-34`}>
                  Frequency
                </Label>
                <Label className={`${p.prices?.length ? "" : "hidden"} text-xs`}>
                  Price
                </Label>
              </div>

              {p.prices?.map((pr, prIdx) => {
                return (
                  <div key={prIdx} className="flex flex-row space-x-2">
                    <div className="w-32">
                    <Select
                      value={pr.name.toLocaleLowerCase()}
                      onValueChange={(value) => {
                        setProducts((draft) => {
                          draft[i].prices[prIdx].name = value
                        })
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencyOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                    <Input
                      placeholder="24.00"
                      className="w-24"
                      value={pr.amount}
                      onChange={(e) => {
                        setProducts((draft) => {
                          draft[i].prices[prIdx].amount = e.target.value
                        })
                      }}
                    />
                    

                  </div>
                )
              })}


            </div>
              



            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

