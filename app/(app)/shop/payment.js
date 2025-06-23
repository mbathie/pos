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

import Customer from './customer'
import { User } from "lucide-react";

const keypad = ['1','2','3','4','5','6','7','8','9','.','0','AC'];

export default function Page() {
  const { cart, resetCart } = useGlobals();
  const [cashInput, setCashInput] = useState('0');
  const [tab, setTab] = useState('card');
  const { discoverReaders, connectReader, collectPayment, capturePayment } = useCard({cart})
  const { calcChange, receiveCash } = useCash({cart})

  const [changeInfo, setChangeInfo] = useState({ received: "0.00", change: "0.00" });

  const [ paymentIntentId, setPaymentIntentId ] = useState(0)
  const [ paymentStatus, setPaymentStatus ] = useState("")

  const [showCustomer, setShowCustomer] = useState(false);
  const [customer, setCustomer] = useState({})

  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      await discoverReaders();
      setTimeout(async () => {
        await connectReader();
      },2000)
    };

    init();
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
    <div className="gap-4 flex flex-row -justify-start mx-20 mt-4">

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

            {/* CUSTOMER */}
            <div className="flex justify-between items-start">
              <div className="flex gap-1 items-center">
                <User className="size-5"/>
                <div>Customer</div>
              </div>

              <div className="text-right">
                {customer?.name ? (
                  <div className="flex flex-col text-right">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-muted-foreground">{customer.email}</span>
                    <span className="text-muted-foreground">{customer.phone}</span>
                    <Button size="sm" className="mt-2" onClick={() => setShowCustomer(true)}>Change</Button>

                  </div>
                ) : (
                  <Button size="sm" onClick={() => setShowCustomer(true)}>Connect</Button>
                )}
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="w-[400px]">
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
                    disabled={parseFloat(changeInfo.received) < cart.total || paymentStatus === 'succeeded'}
                    onClick={async () => {
                      const tx = await receiveCash({ input: cashInput, customer });
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

      <Customer setCustomer={setCustomer} open={showCustomer} onOpenChange={setShowCustomer} />

    </div>
  )
}
