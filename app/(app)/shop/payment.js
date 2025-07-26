'use client'
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useGlobals } from "@/lib/globals"
import { useCard } from './useCard'
import { useCash } from "./useCash";
import { Separator } from "@radix-ui/react-separator";
import { ChevronDown, ChevronUp } from "lucide-react";

import CustomerConnect from './customerConnect'
// import { User } from "lucide-react";

const keypad = ['1','2','3','4','5','6','7','8','9','.','0','AC'];

export default function Page() {
  const { cart, resetCart, setCart, applyDiscount, removeDiscount, employee, setEmployee } = useGlobals();
  const [cashInput, setCashInput] = useState('0');
  const [tab, setTab] = useState('card');
  const router = useRouter();
  const pathname = usePathname();
  const hasSuccessfulPayment = useRef(false);
  const { discoverReaders, connectReader, collectPayment, capturePayment } = useCard({cart})
  const { calcChange, receiveCash } = useCash({cart})

  const [changeInfo, setChangeInfo] = useState({ received: "0.00", change: "0.00" });

  const [ paymentIntentId, setPaymentIntentId ] = useState(0)
  const [ paymentStatus, setPaymentStatus ] = useState("")

  const [ showCustomerConnect, setShowCustomerConnect ] = useState(false)
  const [ connectCustomerFn, setConnectCustomerFn ] = useState()

  const [ requiresWaiver, setRequiresWaiver ] = useState(false)
  
  // Discount state
  const [discounts, setDiscounts] = useState([])
  const [loadingDiscounts, setLoadingDiscounts] = useState(false)
  const [discountExpanded, setDiscountExpanded] = useState(false)

  useEffect(() => {
    console.log(cart)
  },[cart])


  // Handle PIN auth removal when navigating away after successful payment
  useEffect(() => {
    const removePinAuthOnLeave = () => {
      if (hasSuccessfulPayment.current) {
        // Use setTimeout to defer the state update to avoid React errors
        setTimeout(() => {
          setEmployee({
            ...employee,
            pinAuth: undefined
          })
        }, 0)
      }
    }

    // Handle route changes within the app
    const handleRouteChange = () => {
      removePinAuthOnLeave()
    }
    
    // For Next.js app router, we need to listen for route changes differently
    // We'll use a custom approach since we can't access router events in app router
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function(...args) {
      setTimeout(() => handleRouteChange(), 0)
      return originalPushState.apply(history, args)
    }

    history.replaceState = function(...args) {
      setTimeout(() => handleRouteChange(), 0)
      return originalReplaceState.apply(history, args)
    }

    // Listen for popstate (back/forward buttons)
    window.addEventListener('popstate', () => {
      setTimeout(() => handleRouteChange(), 0)
    })

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
    }
  }, [employee, setEmployee])

  // Fetch current discount codes for manual selection
  useEffect(() => {
    const fetchDiscounts = async () => {
      setLoadingDiscounts(true)
      try {
        const response = await fetch('/api/discounts?current=true')
        if (response.ok) {
          const data = await response.json()
          setDiscounts(data)
        }
      } catch (error) {
        console.error('Error fetching discounts:', error)
      } finally {
        setLoadingDiscounts(false)
      }
    }

    fetchDiscounts()
  }, [])

  useEffect(() => {
    const allAreShop = cart.products.length > 0 &&
      cart.products.every(p => p.type === 'shop');
    setRequiresWaiver(!allAreShop);
  }, []);

  useEffect(() => {
    setCart(draft => {
      draft.products.forEach((p) => {
        if (['class', 'course', 'casual'].includes(p.type)) {
          p.variations?.forEach((v) => {
            v.prices?.forEach((pr) => {
              const qty = pr.qty ?? 0;
              if (!pr.customers || pr.customers.length !== qty) {
                pr.customers = Array.from({ length: qty }, (_, i) => ({
                  customer: pr.customers?.[i]?.customer || null
                }));
              }
            });
          });
        }
      });
    });
  }, []);

  // Handle keypad input for cash received
  const handleKeypadInput = async (key) => {
    setCashInput(prev => {
      let updated;
      if (key === 'AC') {
        updated = '0';
      } else if (key === '.' && prev.includes('.')) {
        updated = prev;
      } else if (prev === '0' && key !== '.') {
        updated = key;
      } else {
        updated = prev + key;
      }

      calcChange({ input: updated }).then(setChangeInfo);
      return updated;
    });
  };

  return (
    <div className="gap-4 flex flex-row -justify-start mx-4 mt-4">

      <Card className="w-full">
        <CardContent>
          <div className="flex flex-col">

            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-right">${cart.total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-right">${cart.subtotal.toFixed(2)}</span>
            </div>
            <div 
              className="flex justify-between cursor-pointer hover:bg-muted/50 px-2 -py-1 rounded -mx-2"
              onClick={() => setDiscountExpanded(!discountExpanded)}
            >
              <div className="flex items-center gap-1">
                <span>
                  {cart.discount ? 
                    `${cart.discount.name} (${cart.discount.type === 'percent' ? `${cart.discount.value}%` : `$${cart.discount.value}`})` : 
                    'Discount'
                  }
                </span>
                {cart.discountAmount > 0 && (
                  discountExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />
                )}
              </div>
              <span className="text-right">
                {cart.discount ? `-$${cart.discountAmount.toFixed(2)}` : '$0.00'}
              </span>
            </div>
            
            {/* Expanded discount details */}
            {discountExpanded && cart.discountAmount > 0 && (
              <div className="space-y-1- text-sm-  -pl-3 mt-2-">
                {cart.products
                  .filter(product => product.amount?.discount > 0)
                  .map((product, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{product.name}</span>
                      <span>-${product.amount.discount.toFixed(2)}</span>
                    </div>
                  ))
                }
                {cart.products.filter(product => product.amount?.discount > 0).length === 0 && (
                  <div className="text-center py-2">No individual product discounts</div>
                )}
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax</span>
              <span className="text-right">${cart.tax.toFixed(2)}</span>
            </div>


            <Separator orientation="vertical" className="h-[1px] bg-muted my-2" />

            <div className="flex justify-between">
              <span>Receive</span>
              <span className="text-right">${changeInfo.received}</span>
            </div>
            <div className="flex justify-between">
              <span>Change</span>
              <span
                className={`text-right ${parseFloat(changeInfo.received) >= cart.total ? 'text-lime-400' : ''}`}
              >${changeInfo.change}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className={`text-right ${paymentStatus === 'succeeded' ? 'text-lime-400' : ''}`}>{paymentStatus}</span>
            </div>

            <Separator orientation="vertical" className="h-[1px] bg-muted my-2" />

            {/* Discount Code Selection */}
            <div className="flex flex-row gap-2 mb-4">
              <div className="">Discount</div>
              <div className="flex-1" />
              
              {cart.discount ? (
                // Show applied discount as text
                <div className="text-sm-">
                  {cart.discount.name}
                </div>
              ) : (
                // Show dropdown for manual selection
                <Select
                  value="none"
                  onValueChange={(value) => {
                    if (value === "none") {
                      removeDiscount()
                    } else {
                      const selectedDiscount = discounts.find(d => d._id === value)
                      if (selectedDiscount) {
                        applyDiscount(selectedDiscount)
                      }
                    }
                  }}
                  disabled={loadingDiscounts || paymentStatus === 'succeeded'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingDiscounts ? "Loading..." : "Select a discount code"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Discount</SelectItem>
                    {discounts.map((discount) => (
                      <SelectItem key={discount._id} value={discount._id}>
                        {discount.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator orientation="vertical" className="h-[1px] bg-muted my-2" />

            <div className="mb-2">Customers</div>

            {/* CUSTOMERS */}
            {requiresWaiver &&
            <div className="flex flex-col gap-1">
              {cart.products.map((p, pIdx) =>
                p.variations?.map((v, vIdx) =>
                  v.prices?.map((price, priceIdx) =>
                    price.customers?.map((c, cIdx) => (
                      <div className="flex items-start gap-4" key={`${pIdx}-${vIdx}-${priceIdx}-${cIdx}`}>
                        <div className="whitespace-nowrap self-start">{cIdx + 1}. {price.name}</div>
                        <div className="flex justify-end w-full text-right">
                          {c.customer ? (
                            <div className="flex flex-col">
                              <div>{c.customer.name}</div>
                              <div className="text-xs">{c.customer.phone}, {c.customer.email}</div>
                            </div>
                            // <div>{c.customer.name}, {c.customer.phone}, {c.customer.email}</div>
                          ) : (
                            <Button
                              size="sm" variant="outline"
                              onClick={() => {
                                setConnectCustomerFn(() => (_c) => {
                                  setCart(draft => {
                                    draft.products[pIdx].variations[vIdx].prices[priceIdx].customers[cIdx].customer = _c;
                                  });
                                });
                                setShowCustomerConnect(true);
                              }}
                            >
                              Connect Customer
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )
                )
              )}
            </div>
            }
            {!requiresWaiver &&
              <div>
                {cart.customer ? (
                  <div>{cart.customer.name}, {cart.customer.phone}</div>
                ) : (
                  <Button
                    size="sm" variant="outline"
                    onClick={() => {
                      setConnectCustomerFn(() => (_c) => {
                        setCart(draft => {
                          draft.customer = _c;
                        });
                      });
                      setShowCustomerConnect(true);
                    }}
                  >
                    Connect Customer
                  </Button>
                )}
              </div>
            }

          </div>

        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="w-3/4">
        <TabsList>
          <TabsTrigger value="card" onClick={() => setCashInput(0.00)} disabled={paymentStatus === 'succeeded'}>Card</TabsTrigger>
          <TabsTrigger value="cash" disabled={paymentStatus === 'succeeded'}>Cash</TabsTrigger>
        </TabsList>
        <TabsContent value="card">
          <Card>
            <CardContent className='h-88 flex flex-col gap-2'>

              {/* <Button onClick={async () => {
                  const readers = await discoverReaders();
              }}>Discover Reader</Button>
              <Button onClick={async () => {
                const reader = await connectReader();
              }}>Connect Reader</Button> */}
              <Button
                onClick={async () => {
                  const pi = await collectPayment();
                  setPaymentIntentId(pi)
                }}
              >
                Collect Payment
              </Button>

              <Button
                onClick={async () => {
                  const intent = await capturePayment();
                  console.log(intent.status)
                  setPaymentStatus(intent.status)
                  
                  // Mark that we have a successful payment (PIN will be removed on navigation)
                  if (intent.status === 'succeeded') {
                    hasSuccessfulPayment.current = true
                  }
                }}
              >
                Capture Payment
              </Button>
              
              <div className="flex flex-col">
                <div>{paymentIntentId}</div>
                <div>{paymentStatus}</div>
              </div>


            </CardContent>
          </Card>  
        </TabsContent>
        <TabsContent value="cash">
          <Card>
            <CardContent className="flex justify-center">
              <div className="grid grid-cols-3 gap-x-2 gap-y-2 w-fit">
                {keypad.map((key) => (
                  <Button
                    key={key}
                    size="icon"
                    className="size-16 active:bg-lime-400"
                    onClick={() => handleKeypadInput(key)}
                  >
                    {key}
                  </Button>
                ))}
                <div className="col-span-3 w-full">
                  <Button
                    className="w-full h-16"
                    disabled={
                      parseFloat(changeInfo.received) < cart.total ||
                      paymentStatus === 'succeeded' ||
                      cart.products.some(p =>
                        p.variations?.some(v =>
                          v.prices?.some(pr =>
                            pr.customers?.some(c => !c.customer?._id)
                          )
                        )
                      )
                    }
                    onClick={async () => {
                      const tx = await receiveCash({ input: cashInput });
                      // console.log(cart)
                      setPaymentStatus(tx.transaction.status);
                      
                      // Mark that we have a successful payment (PIN will be removed on navigation)
                      if (tx.transaction.status === 'succeeded') {
                        hasSuccessfulPayment.current = true
                      }
                      
                      resetCart();
                    }}
                  >
                    Accept
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CustomerConnect
        connectCustomerFn={connectCustomerFn}
        requiresWaiver={requiresWaiver}
        open={showCustomerConnect} onOpenChange={setShowCustomerConnect} 
      />

    </div>
  )
}
