'use client'
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { useGlobals } from "@/lib/globals"
import { useCard } from './useCard'
import { useCash } from "./useCash";
import { Separator } from "@radix-ui/react-separator";

import CustomerConnect from './customerConnect'
// import { User } from "lucide-react";

const keypad = ['1','2','3','4','5','6','7','8','9','.','0','AC'];

export default function Page() {
  const { cart, resetCart, setCart } = useGlobals();
  const [cashInput, setCashInput] = useState('0');
  const [tab, setTab] = useState('card');
  const { discoverReaders, connectReader, collectPayment, capturePayment } = useCard({cart})
  const { calcChange, receiveCash } = useCash({cart})

  const [changeInfo, setChangeInfo] = useState({ received: "0.00", change: "0.00" });

  const [ paymentIntentId, setPaymentIntentId ] = useState(0)
  const [ paymentStatus, setPaymentStatus ] = useState("")

  // const [showCustomer, setShowCustomer] = useState(false);
  // const [customer, setCustomer] = useState({})

  const [ showCustomerConnect, setShowCustomerConnect ] = useState(false)
  const [ connectCustomerFn, setConnectCustomerFn ] = useState()

  const [ requiresWaiver, setRequiresWaiver ] = useState(false)

  useEffect(() => {
    console.log(cart)
  },[cart])

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
