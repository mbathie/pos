'use client'
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"

import { useGlobals } from "@/lib/globals"
import { useCard } from './useCard'
import { useCash } from "./useCash";
import { Separator } from "@radix-ui/react-separator";
import { ChevronDown, ChevronUp, Wifi, WifiOff, Loader2, Trash2 } from "lucide-react";
import { toast } from 'sonner'

import CustomerConnect from './customerConnect'
import DiscountPinDialog from '@/components/pin-dialog-discount'
import { hasPermission } from '@/lib/permissions'
// import { User } from "lucide-react";

const keypad = ['1','2','3','4','5','6','7','8','9','.','0','AC'];

export default function Page() {
  const { cart, resetCart, setCart, applyDiscount, removeDiscount, employee, setEmployee, getLastDiscountFeedback, clearDiscountFeedback } = useGlobals();
  const [cashInput, setCashInput] = useState('0');
  const [tab, setTab] = useState('card');
  const router = useRouter();
  const pathname = usePathname();
  const hasSuccessfulPayment = useRef(false);
  const { 
    discoverReaders, 
    connectReader, 
    collectPayment, 
    capturePayment,
    cancelPayment,
    terminalStatus,
    paymentStatus: cardPaymentStatus
  } = useCard({cart})
  const { calcChange, receiveCash } = useCash({cart})

  const [changeInfo, setChangeInfo] = useState({ received: "0.00", change: "0.00" });

  const [ paymentIntentId, setPaymentIntentId ] = useState(0)
  const [ paymentStatus, setPaymentStatus ] = useState("")
  const [ isCollectingPayment, setIsCollectingPayment ] = useState(false)
  const [ isProcessingCash, setIsProcessingCash ] = useState(false)
  const [ cartSnapshot, setCartSnapshot ] = useState(null)
  const hasInitialSnapshot = useRef(false)

  const [ showCustomerConnect, setShowCustomerConnect ] = useState(false)
  const [ connectCustomerFn, setConnectCustomerFn ] = useState()

  const [ requiresWaiver, setRequiresWaiver ] = useState(false)
  
  // Discount state
  const [discounts, setDiscounts] = useState([])
  const [loadingDiscounts, setLoadingDiscounts] = useState(false)
  const [discountExpanded, setDiscountExpanded] = useState(false)
  const [customDiscountInput, setCustomDiscountInput] = useState('')
  const [showDiscountPinDialog, setShowDiscountPinDialog] = useState(false)
  const [pendingDiscountAmount, setPendingDiscountAmount] = useState('')
  
  // Check if cart contains membership products
  const hasMembershipProducts = cart.products.some(product => product.type === 'membership')
  
  // Check if customer is required and connected for memberships
  const membershipNeedsCustomer = hasMembershipProducts && cart.products.some(p => 
    p.type === 'membership' && p.variations?.some(v => 
      v.prices?.some(pr => 
        pr.customers?.some(c => !c.customer?._id)
      )
    )
  )

  // Auto-switch to card tab if membership products are present
  useEffect(() => {
    if (hasMembershipProducts && tab === 'cash') {
      setTab('card')
    }
  }, [hasMembershipProducts, tab])

  useEffect(() => {
    console.log(cart)
  },[cart])

  // Update receive amount when card payment succeeds
  useEffect(() => {
    if (cardPaymentStatus === 'succeeded' && tab === 'card' && cartSnapshot) {
      const amountPaid = cartSnapshot.total.toFixed(2);
      setChangeInfo({
        received: amountPaid,
        change: "0.00"
      });
    }
  }, [cardPaymentStatus, tab, cartSnapshot])

  // Simple terminal initialization like the working version
  useEffect(() => {
    const init = async () => {
      try {
        await discoverReaders();
        setTimeout(async () => {
          try {
            await connectReader();
          } catch (error) {
            console.error('Terminal connection error:', error);
            toast.error('Failed to connect to payment terminal. Please check the terminal and try again.');
          }
        }, 2000)
      } catch (error) {
        console.error('Terminal discovery error:', error);
        toast.error('Failed to discover payment terminal. Please check the terminal and try again.');
      }
    };

    init();
  }, []);

  // Take initial snapshot of cart on page load (only once)
  useEffect(() => {
    if (!hasInitialSnapshot.current && cart.products.length > 0) {
      console.log('📸 Taking initial cart snapshot on page load')
      // Deep copy products to preserve all nested customer data
      const productsCopy = JSON.parse(JSON.stringify(cart.products));
      setCartSnapshot({
        total: cart.total,
        subtotal: cart.subtotal,
        tax: cart.tax,
        discount: cart.discount,
        discountAmount: cart.discountAmount,
        products: productsCopy, // Deep copy to preserve nested customer objects
        customer: cart.customer // Include the customer in snapshot
      })
      hasInitialSnapshot.current = true
    }
  }, [cart.products.length])

  // Update snapshot when discounts change (but keep the same products)
  useEffect(() => {
    if (hasInitialSnapshot.current && cartSnapshot && cart.products.length > 0) {
      console.log('📸 Updating cart snapshot due to discount change')
      setCartSnapshot(prev => ({
        ...prev,
        total: cart.total,
        subtotal: cart.subtotal,
        tax: cart.tax,
        discount: cart.discount,
        discountAmount: cart.discountAmount
        // Keep original products from snapshot
      }))
    }
  }, [cart.discount, cart.discountAmount, cart.total, cart.subtotal, cart.tax])


  // Watch for discount feedback and show toasts
  useEffect(() => {
    const feedback = getLastDiscountFeedback()
    
    if (feedback.success) {
      toast.success(`Applied "${feedback.success.name}" to ${feedback.success.productCount} product${feedback.success.productCount > 1 ? 's' : ''}.`)
      clearDiscountFeedback()
    } else if (feedback.error) {
      toast.warning(feedback.error)
      clearDiscountFeedback()
    } else if (feedback.removed) {
      toast.info(`Removed "${feedback.removed}" discount from cart.`)
      clearDiscountFeedback()
    }
  }, [cart.discount, getLastDiscountFeedback, clearDiscountFeedback])

  // Function to update snapshot with current customer data
  const updateSnapshotCustomers = () => {
    if (hasInitialSnapshot.current && cartSnapshot) {
      console.log('📸 Updating cart snapshot due to customer change')
      // Deep copy products to preserve all nested customer data
      const productsCopy = JSON.parse(JSON.stringify(cart.products));
      setCartSnapshot(prev => ({
        ...prev,
        products: productsCopy, // Deep copy to preserve nested customer objects
        customer: cart.customer // Update main customer
      }))
    }
  }

  // Always use snapshot for display (updated when discounts change or on page load)
  const displayCart = cartSnapshot || cart

  // Reset cart when payment succeeds (but keep UI in completed state)
  useEffect(() => {
    if (paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') {
      // Stop the collecting/loading state
      setIsCollectingPayment(false)
      
      // Reset cart after successful card payment (similar to cash payments)
      if ((paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') && cart.products.length > 0) {
        console.log('✅ Card payment succeeded, resetting cart')
        resetCart()
        // Keep the snapshot so the payment summary stays visible
      }
    }
  }, [paymentStatus, cardPaymentStatus, cart.products.length, resetCart])


  // Clear snapshot when navigating away or when returning to shop
  useEffect(() => {
    const handleRouteChange = () => {
      if (cartSnapshot) {
        console.log('🗑️ Clearing cart snapshot on navigation')
        setCartSnapshot(null)
        hasInitialSnapshot.current = false
      }
    }

    // Clear snapshot when user navigates away
    return () => {
      if (pathname !== '/shop/retail/payment') {
        handleRouteChange()
      }
    }
  }, [pathname, cartSnapshot])

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
        if (['class', 'course', 'casual', 'membership'].includes(p.type)) {
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

  // Handle custom discount application
  const applyCustomDiscount = (amount) => {
    const discountAmount = parseFloat(amount);
    if (isNaN(discountAmount) || discountAmount <= 0) return;
    
    // Check if discount amount exceeds cart total
    const cartTotal = cart.subtotal + cart.tax;
    if (discountAmount > cartTotal) {
      toast.error(`Discount amount ($${discountAmount.toFixed(2)}) cannot exceed cart total ($${cartTotal.toFixed(2)})`);
      return;
    }
    
    // Check if current user has permission for custom discounts
    if (!hasPermission(employee?.role, 'discount:custom')) {
      // Store the pending discount amount and show pin dialog
      setPendingDiscountAmount(amount);
      setShowDiscountPinDialog(true);
      return;
    }
    
    // User has permission, apply discount directly
    executeCustomDiscount(discountAmount);
  };

  // Execute the actual discount application (separated for reuse after PIN verification)
  const executeCustomDiscount = (discountAmount) => {
    // Remove any existing discount first
    if (cart.discount || cart.discountAmount > 0) {
      removeDiscount();
    }
    
    // Apply custom discount amount directly to cart
    setCart(draft => {
      draft.discountAmount = discountAmount;
      draft.discount = null; // No discount object for custom discounts
      draft.total = Math.max(0, draft.subtotal + draft.tax - discountAmount);
    });
    
    setCustomDiscountInput('');
    toast.success(`Applied custom discount of $${discountAmount.toFixed(2)}`);
  };

  // Handle successful PIN verification for custom discount
  const handleDiscountPinSuccess = (data) => {
    const discountAmount = parseFloat(pendingDiscountAmount);
    executeCustomDiscount(discountAmount);
    setPendingDiscountAmount('');
  };

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

      // Only update changeInfo for cash payments, not card payments
      if (tab === 'cash') {
        calcChange({ input: updated }).then(setChangeInfo);
      }
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
              <span className="text-right">${displayCart.total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-right">${displayCart.subtotal.toFixed(2)}</span>
            </div>
            {/* Only show discount row if there's an applied discount with actual discount amount */}
            {displayCart.discountAmount > 0 && (
              <div 
                className={`flex justify-between px-2 -py-1 rounded -mx-2 ${
                  displayCart.discount ? 'cursor-pointer hover:bg-muted/50' : ''
                }`}
                onClick={displayCart.discount ? () => setDiscountExpanded(!discountExpanded) : undefined}
              >
                <div className="flex items-center gap-1">
                  <span>
                    {displayCart.discount 
                      ? `${displayCart.discount.name} (${displayCart.discount.type === 'percent' ? `${displayCart.discount.value}%` : `$${displayCart.discount.value}`})`
                      : 'Custom Discount'
                    }
                  </span>
                  {displayCart.discount && (
                    <>{discountExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</>
                  )}
                </div>
                <span className="text-right">
                  -${displayCart.discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            
                          {/* Expanded discount details - only for regular discounts */}
              {discountExpanded && displayCart.discount && displayCart.discountAmount > 0 && (
                <div className="space-y-1- text-sm-  -pl-3 mt-2-">
                  {displayCart.products
                    .filter(product => product.amount?.discount > 0)
                    .map((product, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{product.name}</span>
                        <span>-${product.amount.discount.toFixed(2)}</span>
                      </div>
                    ))
                  }
                  {displayCart.products.filter(product => product.amount?.discount > 0).length === 0 && (
                    <div className="text-center py-2">No individual product discounts</div>
                  )}
                </div>
              )}
            <div className="flex justify-between">
              <span>Tax</span>
              <span className="text-right">${displayCart.tax.toFixed(2)}</span>
            </div>


            <Separator orientation="vertical" className="h-[1px] bg-muted my-2" />

            <div className="flex justify-between">
              <span>Receive</span>
              <span className="text-right">${changeInfo.received}</span>
            </div>
            <div className="flex justify-between">
              <span>Change</span>
              <span
                className={`text-right ${parseFloat(changeInfo.received) >= cart.total ? 'text-primary' : ''}`}
              >${changeInfo.change}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
                              <span className={`text-right ${(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') ? 'text-primary' : ''}`}>
                  {cardPaymentStatus || paymentStatus || ''}
              </span>
            </div>

            <Separator orientation="vertical" className="h-[1px] bg-muted my-2" />

            {/* Discount Code Selection */}
            <div className="flex flex-row gap-2">
              <div className="">Discount</div>
              <div className="flex-1" />
              
              {(cart.discountAmount > 0 || (cartSnapshot?.discountAmount > 0 && (paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'))) ? (
                // Show applied discount with remove button (disabled after payment)
                <div className="flex items-center gap-1">
                  <Trash2 
                    className={`size-4 ${
                      paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' 
                        ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                        : 'cursor-pointer hover:text-destructive'
                    }`}
                    onClick={() => {
                      if (paymentStatus !== 'succeeded' && cardPaymentStatus !== 'succeeded') {
                        removeDiscount();
                      }
                    }}
                  />
                  <div className="text-sm">
                    {/* Show discount from snapshot if payment succeeded, otherwise from current cart */}
                    {(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') 
                      ? (cartSnapshot?.discount ? cartSnapshot.discount.name : 'Custom Discount')
                      : (cart.discount ? cart.discount.name : 'Custom Discount')
                    }
                  </div>
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
                  disabled={loadingDiscounts || paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
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

            {/* Custom Discount Input */}
            {cart.discountAmount === 0 && !(cartSnapshot?.discountAmount > 0 && (paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded')) && (
              <div className="flex flex-row gap-4 items-center mt-2">
                <div className="">Custom Discount</div>
                <div className="flex-1" />
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={cart.subtotal + cart.tax}
                    value={customDiscountInput}
                    onChange={(e) => setCustomDiscountInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applyCustomDiscount(customDiscountInput);
                      }
                    }}
                    placeholder="0.00"
                    className="w-26"
                    disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                  />
                  <Button
                    onClick={() => applyCustomDiscount(customDiscountInput)}
                    disabled={!customDiscountInput || parseFloat(customDiscountInput) <= 0 || paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                    className="px-2"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}

            <Separator orientation="vertical" className="h-[1px] bg-muted my-2" />

            <div className="mb-2">Customers</div>

            {/* CUSTOMERS */}
            {requiresWaiver &&
            <div className="flex flex-col gap-1">
              {(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' ? cartSnapshot?.products : cart.products)?.map((p, pIdx) =>
                p.variations?.map((v, vIdx) =>
                  v.prices?.map((price, priceIdx) =>
                    price.customers?.map((c, cIdx) => (
                      <div className="flex items-start gap-4" key={`${pIdx}-${vIdx}-${priceIdx}-${cIdx}`}>
                        <div className="whitespace-nowrap self-start">{cIdx + 1}. {price.name}</div>
                        <div className="flex justify-end w-full text-right">
                          {c.customer ? (
                            <div className="flex items-center gap-1">
                              <Trash2 
                                className={`size-4 ${
                                  paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' 
                                    ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                                    : 'cursor-pointer hover:text-destructive'
                                }`}
                                onClick={() => {
                                  if (paymentStatus !== 'succeeded' && cardPaymentStatus !== 'succeeded') {
                                    setCart(draft => {
                                      draft.products[pIdx].variations[vIdx].prices[priceIdx].customers[cIdx].customer = null;
                                    });
                                    // Update snapshot after removing customer
                                    setTimeout(updateSnapshotCustomers, 50);
                                  }
                                }}
                              />
                              <div>{c.customer.name}</div>
                            </div>
                          ) : (
                            <Button
                              size="sm" variant="outline"
                              disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                              onClick={() => {
                                setConnectCustomerFn(() => (_c) => {
                                  setCart(draft => {
                                    draft.products[pIdx].variations[vIdx].prices[priceIdx].customers[cIdx].customer = _c;
                                  });
                                  // Update snapshot after connecting customer
                                  setTimeout(updateSnapshotCustomers, 50);
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
              <div className="flex items-start gap-4">
                <div className="whitespace-nowrap self-start">Customer</div>
                <div className="flex justify-end w-full text-right">
                {((paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') ? cartSnapshot?.customer : cart.customer) ? (
                  <div className="flex items-center gap-1">
                    <Trash2 
                      className={`size-4 ${
                        paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' 
                          ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                          : 'cursor-pointer hover:text-destructive'
                      }`}
                      onClick={() => {
                        if (paymentStatus !== 'succeeded' && cardPaymentStatus !== 'succeeded') {
                          setCart(draft => {
                            draft.customer = null;
                          });
                          // Update snapshot after removing customer
                          setTimeout(updateSnapshotCustomers, 50);
                        }
                      }}
                    />
                    <div>{(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') ? cartSnapshot?.customer?.name : cart.customer.name}</div>
                  </div>
                ) : (
                  <Button
                    size="sm" variant="outline"
                    disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                    onClick={() => {
                      setConnectCustomerFn(() => (_c) => {
                        setCart(draft => {
                          draft.customer = _c;
                        });
                        // Update snapshot after connecting customer
                        setTimeout(updateSnapshotCustomers, 50);
                      });
                      setShowCustomerConnect(true);
                    }}
                  >
                    Connect Customer
                  </Button>
                )}
                </div>
              </div>
            }

          </div>

        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(newTab) => {
        if (newTab === 'cash' && hasMembershipProducts) {
          toast.warning('Membership products require card payment for subscription setup');
          return;
        }
        setTab(newTab);
      }} className="w-3/4">
        <TabsList>
          <TabsTrigger 
            value="card" 
            onClick={() => setCashInput(0.00)} 
            disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
          >
            Card
          </TabsTrigger>
          <div 
            className="relative"
            onClick={() => {
              if (hasMembershipProducts && !(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded')) {
                toast.warning('Membership products require card payment for subscription setup');
              }
            }}
          >
            <TabsTrigger 
              value="cash" 
              disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' || hasMembershipProducts}
              className={hasMembershipProducts ? 'opacity-50 cursor-not-allowed' : ''}
              onClick={() => setCashInput(0.00)}
            >
              Cash
            </TabsTrigger>
            {hasMembershipProducts && !(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') && (
              <div className="absolute inset-0 cursor-not-allowed" />
            )}
          </div>
        </TabsList>
        
        
        {/* Customer required for memberships */}
        {membershipNeedsCustomer && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
            🚨 Customer connection required for membership subscriptions. Please connect a customer below.
          </div>
        )}
        <TabsContent value="card">
          <Card>
            <CardContent className='h-88 flex flex-col gap-2-'>

              {/* Simple Terminal Status */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Terminal Status</span>
                <div className="flex items-center gap-2">
                  {terminalStatus === 'connected' && (
                    <>
                      <Wifi className="size-4 text-green-600" />
                      <span className="text-xs text-green-600">Ready</span>
                    </>
                  )}
                  {terminalStatus === 'disconnected' && (
                    <>
                      <WifiOff className="size-4 text-destructive" />
                      <span className="text-xs text-destructive">Disconnected</span>
                    </>
                  )}
                  {(terminalStatus === 'discovering' || terminalStatus === 'connecting') && (
                    <>
                      <Loader2 className="size-4 animate-spin text-yellow-500" />
                      <span className="text-xs text-yellow-500">
                        {terminalStatus === 'discovering' ? 'Discovering...' : 'Connecting...'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Payment Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  disabled={
                    // Only disable if not disconnected AND one of these conditions is true
                    terminalStatus !== 'disconnected' && (
                      terminalStatus !== 'connected' || 
                      paymentStatus === 'succeeded' || 
                      cardPaymentStatus === 'succeeded' || 
                      isCollectingPayment || 
                      cart.products.length === 0 || 
                      membershipNeedsCustomer
                    )
                  }
                  onClick={async () => {
                    // If terminal is disconnected, retry connection
                    if (terminalStatus === 'disconnected') {
                      try {
                        await discoverReaders();
                        setTimeout(async () => {
                          try {
                            await connectReader();
                          } catch (error) {
                            console.error('Terminal reconnection error:', error);
                            toast.error('Failed to reconnect to payment terminal');
                          }
                        }, 1000);
                      } catch (error) {
                        console.error('Terminal rediscovery error:', error);
                        toast.error('Failed to find payment terminal');
                      }
                      return;
                    }
                    
                    try {
                      setIsCollectingPayment(true)
                      const pi = await collectPayment();
                      setPaymentIntentId(pi)
                      // Don't set isCollectingPayment to false here - let the payment status handle it
                    } catch (error) {
                      if (error.message === 'PAYMENT_CANCELLED') {
                        console.log('🚫 Payment was cancelled')
                        toast.info('Payment collection cancelled')
                      } else {
                        console.error('Payment collection failed:', error)
                        toast.error(`Payment failed: ${error.message}`)
                      }
                      setIsCollectingPayment(false)
                    }
                  }}
                >
                  {isCollectingPayment && <Loader2 className="size-4 animate-spin mr-2" />}
                  {(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') ? 
                    'Payment Complete' :
                    terminalStatus === 'connected' ? 
                      (cardPaymentStatus === 'collecting' ? 'Waiting for Card...' : 
                       cardPaymentStatus === 'processing' ? 'Processing...' :
                       cardPaymentStatus === 'creating' ? 'Creating Payment...' :
                       isCollectingPayment ? 'Starting...' : 'Collect Payment') : 
                      terminalStatus === 'connecting' ? 'Connecting...' :
                      terminalStatus === 'discovering' ? 'Discovering...' :
                      'Retry Connection'
                  }
                </Button>

                {/* Cancel Button - only show when collecting payment */}
                {isCollectingPayment && (
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        await cancelPayment()
                        setPaymentIntentId(0)
                        setIsCollectingPayment(false)
                        toast.success('Payment cancelled')
                      } catch (error) {
                        console.error('Payment cancellation failed:', error)
                        toast.error(`Failed to cancel payment: ${error.message}`)
                      }
                    }}
                  >
                    Cancel
                  </Button>
                )}

                {/* Return to Shop Button - only show after successful payment */}
                {(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log('🗑️ Clearing cart snapshot - returning to shop')
                      setCartSnapshot(null)
                      hasInitialSnapshot.current = false
                      router.push('/shop')
                    }}
                  >
                    Return to Shop
                  </Button>
                )}
              </div>

              {/* Capture Payment button - only show in dev mode */}
              {process.env.NEXT_PUBLIC_IS_DEV === 'true' && (
                <Button
                  disabled={!paymentIntentId || paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                  onClick={async () => {
                    try {
                    const intent = await capturePayment();
                    console.log(intent.status)
                    setPaymentStatus(intent.status)
                    
                    // Mark that we have a successful payment (PIN will be removed on navigation)
                    if (intent.status === 'succeeded') {
                      hasSuccessfulPayment.current = true
                      // Reset cart after successful manual capture
                      if (cart.products.length > 0) {
                        console.log('✅ Manual capture succeeded, resetting cart')
                        resetCart()
                      }
                    }
                    } catch (error) {
                      console.error('Payment capture failed:', error)
                      toast.error(`Payment capture failed: ${error.message}`)
                    }
                  }}
                >
                  Capture Payment
                </Button>
              )}
              
              {/* Debug payment info - only show in dev mode */}
              {process.env.NEXT_PUBLIC_IS_DEV === 'true' && (
                <div className="flex flex-col gap-1 text-sm">
                  {paymentIntentId && (
                    <div>Payment ID: {paymentIntentId}</div>
                  )}
                  {paymentStatus && (
                    <div className={`${paymentStatus === 'succeeded' ? 'text-green-600' : ''}`}>
                      Status: {paymentStatus}
                    </div>
                  )}

                </div>
              )}



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
                    disabled={isProcessingCash || paymentStatus === 'succeeded'}
                  >
                    {key}
                  </Button>
                ))}
                <div className="col-span-3 w-full gap-2 flex flex-col">
                  <Button
                    className="w-full h-12"
                    disabled={
                      cart.products.length === 0 ||
                      parseFloat(changeInfo.received) < cart.total ||
                      paymentStatus === 'succeeded' ||
                      isProcessingCash ||
                      cart.products.some(p =>
                        p.variations?.some(v =>
                          v.prices?.some(pr =>
                            pr.customers?.some(c => !c.customer?._id)
                          )
                        )
                      )
                    }
                    onClick={async () => {
                      setIsProcessingCash(true);
                      try {
                        const tx = await receiveCash({ input: cashInput });
                        // console.log(cart)
                        setPaymentStatus(tx.transaction.status);
                        
                        // Mark that we have a successful payment (PIN will be removed on navigation)
                        if (tx.transaction.status === 'succeeded') {
                          hasSuccessfulPayment.current = true;
                          toast.success('Payment processed successfully!');
                        }
                        
                        resetCart();
                      } catch (error) {
                        console.error('Cash payment failed:', error);
                        toast.error(`Payment failed: ${error.message}`);
                      } finally {
                        setIsProcessingCash(false);
                      }
                    }}
                  >
                    {isProcessingCash ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : paymentStatus === 'succeeded' ? (
                      'Payment Complete'
                    ) : (
                      'Accept'
                    )}
                  </Button>
                                     <Button
                     variant="outline"
                     className="w-full h-12"
                     disabled={paymentStatus !== 'succeeded'}
                     onClick={() => {
                       console.log('🗑️ Clearing cart snapshot - returning to shop')
                       setCartSnapshot(null)
                       hasInitialSnapshot.current = false
                       router.push('/shop')
                     }}
                   >
                     Return to Shop
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

      <DiscountPinDialog
        open={showDiscountPinDialog}
        onOpenChange={setShowDiscountPinDialog}
        onSuccess={handleDiscountPinSuccess}
        permission="discount:custom"
      />

    </div>
  )
}
