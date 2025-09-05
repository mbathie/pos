'use client'
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { z } from 'zod'

import { useGlobals } from "@/lib/globals"
import { calcCartTotals } from '@/lib/cart'
import { useCard } from './useCard'
import { useCash } from "./useCash";
import { Separator } from "@radix-ui/react-separator";
import { ChevronDown, ChevronUp, Wifi, WifiOff, Loader2, Trash2, Mail, Plus, OctagonAlert, Check } from "lucide-react";
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import CustomerSelectionSheet from './customerSelectionSheet'
import DiscountPinDialog from '@/components/pin-dialog-discount'
import { hasPermission } from '@/lib/permissions'
// import { User } from "lucide-react";

// Email validation schema
const emailSchema = z.string().email('Please enter a valid email address');

const keypad = ['1','2','3','4','5','6','7','8','9','.','0','AC'];

export default function Page() {
  const { cart, resetCart, setCart, employee, setEmployee, appliedAdjustments, setAppliedAdjustments, clearAppliedAdjustments } = useGlobals();
  const [cashInput, setCashInput] = useState('0');
  const [tab, setTab] = useState('card');
  const router = useRouter();
  const pathname = usePathname();
  const hasSuccessfulPayment = useRef(false);
  const [stripeEnabled, setStripeEnabled] = useState(null);
  const { 
    discoverReaders, 
    connectReader, 
    collectPayment, 
    capturePayment,
    cancelPayment,
    terminalStatus,
    paymentStatus: cardPaymentStatus,
    transactionId: cardTransactionId
  } = useCard({cart})
  const { calcChange, receiveCash } = useCash({cart})

  const [changeInfo, setChangeInfo] = useState({ received: "0.00", change: "0.00" });

  const [ paymentIntentId, setPaymentIntentId ] = useState(0)
  const [ transactionId, setTransactionId ] = useState(null)
  const [ paymentStatus, setPaymentStatus ] = useState("")
  const [ isCollectingPayment, setIsCollectingPayment ] = useState(false)
  const [ isProcessingCash, setIsProcessingCash ] = useState(false)
  const [ cartSnapshot, setCartSnapshot ] = useState(null)
  const hasInitialSnapshot = useRef(false)

  const [ showCustomerSelection, setShowCustomerSelection ] = useState(false)
  const [ requiresWaiver, setRequiresWaiver ] = useState(false)
  
  // Discount state
  const [discounts, setDiscounts] = useState([])
  const [loadingDiscounts, setLoadingDiscounts] = useState(false)
  const [discountExpanded, setDiscountExpanded] = useState(false)
  const [customDiscountDollar, setCustomDiscountDollar] = useState(null)
  const [customDiscountPercent, setCustomDiscountPercent] = useState(null)
  const [showDiscountPinDialog, setShowDiscountPinDialog] = useState(false)
  const [pendingDiscountAmount, setPendingDiscountAmount] = useState('')
  
  // Email receipt state
  const [receiptEmail, setReceiptEmail] = useState('')
  const [sendingReceipt, setSendingReceipt] = useState(false)
  const [isValidEmail, setIsValidEmail] = useState(false)
  
  // Check if cart contains membership products
  const hasMembershipProducts = cart.products.some(product => product.type === 'membership')
  
  // Check if customer is required and connected for memberships
  const membershipNeedsCustomer = hasMembershipProducts && cart.products.some(p => 
    p.type === 'membership' && p.prices?.some(pr => 
      pr.customers?.some(c => !c.customer?._id)
    )
  )

  // Validate email whenever it changes
  useEffect(() => {
    if (receiptEmail) {
      try {
        emailSchema.parse(receiptEmail)
        setIsValidEmail(true)
      } catch {
        setIsValidEmail(false)
      }
    } else {
      setIsValidEmail(false)
    }
  }, [receiptEmail])

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
      // Store card transaction ID
      if (cardTransactionId) {
        setTransactionId(cardTransactionId);
      }
    }
  }, [cardPaymentStatus, tab, cartSnapshot, cardTransactionId])

  // Handle customer selection and auto-assignment
  const handleCustomerSelection = (assignments) => {
    if (!assignments || assignments.length === 0) return
    
    // Separate adult and minor assignments
    const adultAssignments = assignments.filter(a => !a.isMinor)
    const minorAssignments = assignments.filter(a => a.isMinor)
    
    setCart(draft => {
      let adultIndex = 0
      let minorIndex = 0
      
      // Go through each product and assign customers
      draft.products.forEach((product, pIdx) => {
        if (['class', 'course', 'general'].includes(product.type)) {
          product.prices?.forEach((price, priceIdx) => {
            price.customers?.forEach((customer, cIdx) => {
              // Skip if already assigned
              if (draft.products[pIdx].prices[priceIdx].customers[cIdx].customer) return
              
              const isMinorPrice = price.minor || false
              
              if (isMinorPrice && minorIndex < minorAssignments.length) {
                // Assign minor
                const assignment = minorAssignments[minorIndex]
                draft.products[pIdx].prices[priceIdx].customers[cIdx].customer = assignment.customer
                draft.products[pIdx].prices[priceIdx].customers[cIdx].dependent = assignment.dependent
                minorIndex++
              } else if (!isMinorPrice && adultIndex < adultAssignments.length) {
                // Assign adult
                const assignment = adultAssignments[adultIndex]
                draft.products[pIdx].prices[priceIdx].customers[cIdx].customer = assignment.customer
                draft.products[pIdx].prices[priceIdx].customers[cIdx].dependent = null
                adultIndex++
              }
            })
          })
        }
        // Handle memberships (now using prices directly like classes)
        else if (product.type === 'membership') {
          product.prices?.forEach((price, priceIdx) => {
            // Initialize customers array if it doesn't exist (for membership products)
            if (!price.customers && price.qty > 0) {
              draft.products[pIdx].prices[priceIdx].customers = Array(price.qty).fill(null).map(() => ({}))
            }
            
            price.customers?.forEach((customer, cIdx) => {
              // Skip if already assigned
              if (draft.products[pIdx].prices[priceIdx].customers[cIdx].customer) return
              
              const isMinorPrice = price.minor || false
              
              if (isMinorPrice && minorIndex < minorAssignments.length) {
                // Assign minor
                const assignment = minorAssignments[minorIndex]
                draft.products[pIdx].prices[priceIdx].customers[cIdx].customer = assignment.customer
                draft.products[pIdx].prices[priceIdx].customers[cIdx].dependent = assignment.dependent
                minorIndex++
              } else if (!isMinorPrice && adultIndex < adultAssignments.length) {
                // Assign adult
                const assignment = adultAssignments[adultIndex]
                draft.products[pIdx].prices[priceIdx].customers[cIdx].customer = assignment.customer
                draft.products[pIdx].prices[priceIdx].customers[cIdx].dependent = null
                adultIndex++
              }
            })
          })
        }
      })
      
      // Handle main cart customer if we have at least one adult assignment
      if (adultAssignments.length > 0) {
        draft.customer = adultAssignments[0].customer
      }
    })
    
    // Update snapshot after assignment
    setTimeout(updateSnapshotCustomers, 100)
    
    toast.success('Customers assigned successfully')
  }

  // Apply adjustments to cart when discount is applied
  const applyAdjustments = async (discountCode = null, discountId = null, customDiscountAmount = null, discountName = null) => {
    try {
      console.log('🎁 [UI] Requesting adjustments:', { discountCode, discountId, customDiscountAmount, discountName });
      
      const response = await fetch('/api/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          customer: cart.customer,
          discountCode,
          discountId,
          customDiscountAmount
        })
      });

      if (response.ok) {
        const updatedCart = await response.json();
        
        console.log('🎁 [UI] Received adjustments:', {
          discounts: updatedCart.adjustments?.discounts?.length || 0,
          surcharges: updatedCart.adjustments?.surcharges?.length || 0,
          totalDiscount: updatedCart.adjustments?.totalDiscountAmount,
          error: updatedCart.adjustments?.discountError
        });
        
        // Handle discount application feedback
        if (updatedCart.adjustments?.discountError) {
          // Discount was not applied - show detailed error
          toast.error(
            <div>
              <div className="font-semibold">Discount Not Applied</div>
              <div className="text-sm mt-1">{updatedCart.adjustments.discountError}</div>
            </div>,
            { duration: 5000 }
          );
          
          // Don't update cart if discount wasn't applied
          return null;
        } else if (updatedCart.adjustments?.discounts?.length > 0) {
          // Discount was successfully applied
          const discount = updatedCart.adjustments.discounts[0];
          const affectedCount = discount.affectedProducts?.length || 0;
          
          toast.success(
            <div>
              <div className="font-semibold">Discount Applied</div>
              <div className="text-sm mt-1">
                {discount.name}: -${discount.totalAmount.toFixed(2)} on {affectedCount} item{affectedCount !== 1 ? 's' : ''}
              </div>
            </div>,
            { duration: 4000 }
          );
          
          // Update the cart with adjusted values
          setCart(draft => {
            draft.subtotal = updatedCart.subtotal;
            draft.tax = updatedCart.tax;
            draft.total = updatedCart.total;
            draft.products = updatedCart.products;
          });
          
          // Store adjustments for display
          setAppliedAdjustments(updatedCart.adjustments);
        } else if (discountName) {
          // No discount was applied but one was attempted
          toast.warning(
            <div>
              <div className="font-semibold">No Discount Applied</div>
              <div className="text-sm mt-1">"${discountName}" doesn't apply to items in your cart</div>
            </div>,
            { duration: 4000 }
          );
          return null;
        } else {
          // Just surcharges or no adjustments at all
          // Update the cart with adjusted values
          setCart(draft => {
            draft.subtotal = updatedCart.subtotal;
            draft.tax = updatedCart.tax;
            draft.total = updatedCart.total;
            draft.products = updatedCart.products;
          });
          
          // Store adjustments for display
          setAppliedAdjustments(updatedCart.adjustments);
        }
        
        return updatedCart;
      } else {
        const error = await response.json();
        toast.error(
          <div>
            <div className="font-semibold">Failed to Apply Discount</div>
            <div className="text-sm mt-1">{error.error || 'Please try again'}</div>
          </div>,
          { duration: 4000 }
        );
      }
    } catch (error) {
      console.error('❌ [UI] Error applying adjustments:', error);
      toast.error(
        <div>
          <div className="font-semibold">Error</div>
          <div className="text-sm mt-1">Failed to apply adjustments. Please try again.</div>
        </div>
      );
    }
  };

  // Remove all adjustments
  const removeAdjustments = () => {
    console.log('🗑️ [UI] Removing all adjustments');
    
    // Reset cart to original values
    const totals = calcCartTotals(cart.products);
    setCart(draft => {
      draft.subtotal = totals.subtotal;
      draft.tax = totals.tax;
      draft.total = totals.total;
      draft.products.forEach(product => {
        if (product.amount) {
          product.amount.discount = 0;
          product.amount.surcharge = 0;
        }
      });
    });
    clearAppliedAdjustments();
    
    toast.info(
      <div>
        <div className="font-semibold">Discount Removed</div>
        <div className="text-sm mt-1">Cart totals have been reset</div>
      </div>,
      { duration: 3000 }
    );
  };

  // Check if Stripe is configured
  useEffect(() => {
    const checkStripeStatus = async () => {
      try {
        const res = await fetch('/api/payments');
        const data = await res.json();
        setStripeEnabled(data.charges_enabled || false);
      } catch (error) {
        console.error('Error checking Stripe status:', error);
        setStripeEnabled(false);
      }
    };
    checkStripeStatus();
  }, []);

  // Simple terminal initialization like the working version
  useEffect(() => {
    // Only initialize terminal if Stripe is enabled
    if (stripeEnabled) {
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
    }
  }, [stripeEnabled]);

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
        products: productsCopy, // Deep copy to preserve nested customer objects
        customer: cart.customer ? JSON.parse(JSON.stringify(cart.customer)) : null, // Deep copy customer too
        adjustments: appliedAdjustments ? JSON.parse(JSON.stringify(appliedAdjustments)) : null
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
        adjustments: appliedAdjustments ? JSON.parse(JSON.stringify(appliedAdjustments)) : null
        // Keep original products from snapshot
      }))
    }
  }, [appliedAdjustments, cart.total, cart.subtotal, cart.tax])



  // Function to update snapshot with current customer data
  const updateSnapshotCustomers = () => {
    if (hasInitialSnapshot.current && cartSnapshot) {
      console.log('📸 Updating cart snapshot due to customer change')
      // Deep copy products to preserve all nested customer data
      const productsCopy = JSON.parse(JSON.stringify(cart.products));
      setCartSnapshot(prev => ({
        ...prev,
        products: productsCopy, // Deep copy to preserve nested customer objects
        customer: cart.customer ? JSON.parse(JSON.stringify(cart.customer)) : null // Deep copy customer too
      }))
    }
  }
  
  // Watch for customer changes in cart and update snapshot
  useEffect(() => {
    if (hasInitialSnapshot.current && cartSnapshot && cart.products.length > 0) {
      // Check if any customers have changed
      let hasCustomerChange = false;
      
      cart.products.forEach((product, pIdx) => {
        // All products now use prices directly
        if (['class', 'course', 'general', 'membership'].includes(product.type)) {
          product.prices?.forEach((price, prIdx) => {
            price.customers?.forEach((customer, cIdx) => {
              const snapshotCustomer = cartSnapshot.products?.[pIdx]?.prices?.[prIdx]?.customers?.[cIdx]?.customer;
              if (customer.customer?._id !== snapshotCustomer?._id) {
                hasCustomerChange = true;
              }
            });
          });
        } else {
          // Legacy support for products that might still use variations
          product.variations?.forEach((variation, vIdx) => {
            variation.prices?.forEach((price, prIdx) => {
              price.customers?.forEach((customer, cIdx) => {
                const snapshotCustomer = cartSnapshot.products?.[pIdx]?.variations?.[vIdx]?.prices?.[prIdx]?.customers?.[cIdx]?.customer;
                if (customer.customer?._id !== snapshotCustomer?._id) {
                  hasCustomerChange = true;
                }
              });
            });
          });
        }
      });
      
      // Also check main customer
      if (cart.customer?._id !== cartSnapshot.customer?._id) {
        hasCustomerChange = true;
      }
      
      if (hasCustomerChange && paymentStatus !== 'succeeded' && cardPaymentStatus !== 'succeeded') {
        console.log('📸 Auto-updating snapshot due to customer change detected')
        const productsCopy = JSON.parse(JSON.stringify(cart.products));
        setCartSnapshot(prev => ({
          ...prev,
          products: productsCopy,
          customer: cart.customer ? JSON.parse(JSON.stringify(cart.customer)) : null
        }))
      }
    }
  }, [cart.products, cart.customer, cartSnapshot, paymentStatus, cardPaymentStatus]) // Watch for changes

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


  // Clear snapshot and adjustments when navigating away or when returning to shop
  useEffect(() => {
    const handleRouteChange = () => {
      if (cartSnapshot) {
        console.log('🗑️ Clearing cart snapshot on navigation')
        setCartSnapshot(null)
        hasInitialSnapshot.current = false
      }
      // Clear adjustments when leaving payment page
      clearAppliedAdjustments()
    }

    // Clear snapshot when user navigates away
    return () => {
      if (pathname !== '/shop/payment') {
        handleRouteChange()
      }
    }
  }, [pathname, cartSnapshot, clearAppliedAdjustments])

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

  // Fetch current discount codes for manual selection and apply surcharges
  useEffect(() => {
    const fetchDiscountsAndApplySurcharges = async () => {
      console.log('📋 [UI] Fetching available discounts and checking for surcharges...')
      setLoadingDiscounts(true)
      
      // Fetch discounts
      try {
        const response = await fetch('/api/discounts?current=true')
        if (response.ok) {
          const data = await response.json()
          console.log(`📋 [UI] Found ${data.length} available discount(s):`, data.map(d => ({
            name: d.name,
            code: d.code,
            type: d.type,
            value: d.value,
            mode: d.mode
          })))
          setDiscounts(data)
        }
      } catch (error) {
        console.error('❌ [UI] Error fetching discounts:', error)
      } finally {
        setLoadingDiscounts(false)
      }
      
      // Apply surcharges if cart has products
      if (cart.products.length > 0) {
        console.log('🔄 [UI] Checking for surcharges on cart...')
        await applyAdjustments(); // This will apply any active surcharges
      }
    }

    fetchDiscountsAndApplySurcharges()
  }, []) // Only run once on mount

  useEffect(() => {
    const allAreShop = cart.products.length > 0 &&
      cart.products.every(p => p.type === 'shop');
    setRequiresWaiver(!allAreShop);
  }, []);

  useEffect(() => {
    setCart(draft => {
      draft.products.forEach((p) => {
        if (['class', 'course', 'general', 'membership'].includes(p.type)) {
          // All these types now use prices directly on product
          p.prices?.forEach((pr) => {
            const qty = pr.qty ?? 0;
            if (!pr.customers || pr.customers.length !== qty) {
              pr.customers = Array.from({ length: qty }, (_, i) => ({
                customer: pr.customers?.[i]?.customer || null
              }));
            }
          });
        }
      });
    });
  }, []);

  // Handle custom discount application
  const applyCustomDiscount = async () => {
    const amount = customDiscountDollar;
    if (!amount || amount <= 0) return;
    
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
      setPendingDiscountAmount(amount.toString());
      setShowDiscountPinDialog(true);
      return;
    }
    
    // User has permission, apply discount directly
    await executeCustomDiscount(discountAmount);
  };

  // Execute the actual discount application (separated for reuse after PIN verification)
  const executeCustomDiscount = async (discountAmount) => {
    // Apply custom discount through the adjustments API
    await applyAdjustments(null, null, discountAmount);
    
    setCustomDiscountDollar(null);
    setCustomDiscountPercent(null);
    toast.success(`Applied custom discount of $${discountAmount.toFixed(2)}`);
  };
  
  // Calculate percentage from dollar amount
  const updatePercentFromDollar = (dollarAmount) => {
    if (!dollarAmount || dollarAmount <= 0) {
      setCustomDiscountPercent(null);
      return;
    }
    const cartTotal = cart.subtotal + cart.tax;
    if (cartTotal > 0) {
      const percent = (dollarAmount / cartTotal) * 100;
      setCustomDiscountPercent(Math.round(percent * 100) / 100); // Round to 2 decimals
    }
  };
  
  // Calculate dollar amount from percentage
  const updateDollarFromPercent = (percentAmount) => {
    if (!percentAmount || percentAmount <= 0) {
      setCustomDiscountDollar(null);
      return;
    }
    const cartTotal = cart.subtotal + cart.tax;
    const dollarAmount = (percentAmount / 100) * cartTotal;
    setCustomDiscountDollar(Math.round(dollarAmount * 100) / 100); // Round to 2 decimals
  };

  // Handle successful PIN verification for custom discount
  const handleDiscountPinSuccess = async (data) => {
    const discountAmount = parseFloat(pendingDiscountAmount);
    await executeCustomDiscount(discountAmount);
    setPendingDiscountAmount('');
  };

  // Handle sending receipt via email
  const handleSendReceipt = async () => {
    // Validate email using Zod
    try {
      emailSchema.parse(receiptEmail)
    } catch (error) {
      toast.error(error.errors[0]?.message || 'Please enter a valid email address')
      return
    }

    if (!transactionId) {
      toast.error('Transaction ID not found. Please try again.')
      return
    }

    setSendingReceipt(true)
    
    try {
      const response = await fetch('/api/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: receiptEmail,
          transactionId: transactionId
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        toast.success(`Receipt is being sent to ${receiptEmail}`)
        setReceiptEmail('') // Clear the email field
      } else {
        toast.error(result.error || 'Failed to send receipt')
      }
    } catch (error) {
      console.error('Error sending receipt:', error)
      toast.error('Failed to send receipt')
    } finally {
      setSendingReceipt(false)
    }
  }

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
            {/* Show surcharges if any */}
            {(displayCart.adjustments?.totalSurchargeAmount > 0 || appliedAdjustments?.totalSurchargeAmount > 0) && (
              <div className="flex justify-between">
                <span>Surcharges</span>
                <span className="text-right">+${(displayCart.adjustments?.totalSurchargeAmount || appliedAdjustments?.totalSurchargeAmount || 0).toFixed(2)}</span>
              </div>
            )}
            
            {/* Show discounts if any */}
            {(displayCart.adjustments?.totalDiscountAmount > 0 || appliedAdjustments?.totalDiscountAmount > 0) && (
              <div 
                className="flex justify-between px-2 -py-1 rounded -mx-2 cursor-pointer hover:bg-muted/50"
                onClick={() => setDiscountExpanded(!discountExpanded)}
              >
                <div className="flex items-center gap-1">
                  <span>
                    {displayCart.adjustments?.discounts?.[0]?.name || appliedAdjustments?.discounts?.[0]?.name || 'Discount'}
                  </span>
                  {discountExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
                <span className="text-right">
                  -${(displayCart.adjustments?.totalDiscountAmount || appliedAdjustments?.totalDiscountAmount || 0).toFixed(2)}
                </span>
              </div>
            )}
            
            {/* Expanded adjustment details */}
            {discountExpanded && (displayCart.adjustments?.discounts?.length > 0 || appliedAdjustments?.discounts?.length > 0) && (
              <div className="space-y-1 text-sm pl-3 mt-2">
                {(displayCart.adjustments?.discounts?.[0]?.affectedProducts || appliedAdjustments?.discounts?.[0]?.affectedProducts || []).map((product, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{product.productName}</span>
                    <span>-${product.amount.toFixed(2)}</span>
                  </div>
                ))}
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
            <div className="flex flex-row gap-2 items-center">
              <div className="">Discount</div>
              <div className="flex-1" />
              
              {(appliedAdjustments?.totalDiscountAmount > 0 || (cartSnapshot?.adjustments?.totalDiscountAmount > 0 && (paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'))) ? (
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
                        removeAdjustments();
                      }
                    }}
                  />
                  <div className="text-sm">
                    {/* Show discount from snapshot if payment succeeded, otherwise from current cart */}
                    {(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') 
                      ? (cartSnapshot?.adjustments?.discounts?.[0]?.name || 'Custom Discount')
                      : (appliedAdjustments?.discounts?.[0]?.name || 'Custom Discount')
                    }
                  </div>
                </div>
              ) : (
                // Show dropdown for manual selection
                <Select
                  value="none"
                  onValueChange={async (value) => {
                    if (value === "none") {
                      removeAdjustments()
                    } else {
                      const selectedDiscount = discounts.find(d => d._id === value);
                      if (selectedDiscount) {
                        console.log('🎯 [UI] User selected discount:', selectedDiscount.name);
                        await applyAdjustments(null, value, null, selectedDiscount.name);
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
            {(!appliedAdjustments?.totalDiscountAmount || appliedAdjustments?.totalDiscountAmount === 0) && !(cartSnapshot?.adjustments?.totalDiscountAmount > 0 && (paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded')) && (
              <div className="flex flex-row gap-4 items-center mt-2">
                <div className="">Custom Discount</div>
                <div className="flex-1" />
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <NumberInput
                      min={0}
                      max={cart.subtotal + cart.tax}
                      step={0.01}
                      value={customDiscountDollar}
                      onChange={(value) => {
                        setCustomDiscountDollar(value);
                        updatePercentFromDollar(value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          applyCustomDiscount();
                        }
                      }}
                      placeholder="0.00"
                      className="w-18"
                      disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <NumberInput
                      min={0}
                      max={100}
                      step={0.01}
                      value={customDiscountPercent}
                      onChange={(value) => {
                        setCustomDiscountPercent(value);
                        updateDollarFromPercent(value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          applyCustomDiscount();
                        }
                      }}
                      placeholder="0"
                      className="w-18"
                      disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <Button
                    onClick={() => applyCustomDiscount()}
                    disabled={!customDiscountDollar || customDiscountDollar <= 0 || paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                    className="px-2"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}

            <Separator orientation="vertical" className="h-[1px] bg-muted my-2" />

            <div className="flex items-center justify-between mb-2">
              <div>Customers</div>
              {/* Add All Customers Button */}
              {cart.products?.some(p => 
                ['class', 'course', 'general', 'membership'].includes(p.type) && 
                p.prices?.some(price => 
                  price.customers?.some(c => !c.customer)
                )
              ) && (
                <Button
                  size="sm"
                  onClick={() => setShowCustomerSelection(true)}
                  disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                  className="cursor-pointer"
                >
                  <Plus className="size-4" />
                  Select
                </Button>
              )}
            </div>

            {/* CUSTOMERS */}
            {requiresWaiver &&
            <div className="flex flex-col gap-1">
              {(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' ? cartSnapshot?.products : cart.products)?.map((p, pIdx) => {
                // Classes, courses, and general products have prices directly on product
                if (['class', 'course', 'general'].includes(p.type)) {
                  return p.prices?.map((price, priceIdx) =>
                    price.customers?.map((c, cIdx) => (
                      <div className="flex items-center gap-4" key={`${pIdx}-${priceIdx}-${cIdx}`}>
                        <div className="whitespace-nowrap flex items-center gap-1">
                          {cIdx + 1}. {price.name}
                          {p.waiverRequired && (
                            c.customer ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <OctagonAlert className="h-4 w-4 text-chart-4" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Must connect a customer who's signed a waiver</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          )}
                        </div>
                        <div className="flex justify-end w-full text-right">
                          {c.customer ? (
                            <div className="flex items-center gap-1">
                              <div>
                                {c.dependent ? (
                                  <span>{c.dependent.name} <span className="text-xs text-muted-foreground">(via {c.customer.name})</span></span>
                                ) : (
                                  c.customer.name
                                )}
                              </div>
                              <Trash2 
                                className={`size-4 ${
                                  paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' 
                                    ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                                    : 'cursor-pointer hover:text-destructive'
                                }`}
                                onClick={() => {
                                  if (paymentStatus !== 'succeeded' && cardPaymentStatus !== 'succeeded') {
                                    setCart(draft => {
                                      draft.products[pIdx].prices[priceIdx].customers[cIdx].customer = null;
                                      draft.products[pIdx].prices[priceIdx].customers[cIdx].dependent = null;
                                    });
                                    // Update snapshot after removing customer
                                    setTimeout(updateSnapshotCustomers, 50);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Not assigned
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  );
                }
                // Memberships now use prices directly like other products
                else if (p.type === 'membership') {
                  return p.prices?.map((price, priceIdx) => 
                    price.customers?.map((c, cIdx) => (
                      <div className="flex items-center gap-4" key={`${pIdx}-${priceIdx}-${cIdx}`}>
                        <div className="whitespace-nowrap flex items-center gap-1">
                          {cIdx + 1}. {price.name}
                          {p.waiverRequired && (
                            c.customer ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <OctagonAlert className="h-4 w-4 text-chart-4" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Must connect a customer who's signed a waiver</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          )}
                        </div>
                        <div className="flex justify-end w-full text-right">
                          {c.customer ? (
                            <div className="flex items-center gap-1">
                              <div>
                                {c.dependent ? (
                                  <span>{c.dependent.name} <span className="text-xs text-muted-foreground">(via {c.customer.name})</span></span>
                                ) : (
                                  c.customer.name
                                )}
                              </div>
                              <Trash2 
                                className={`size-4 ${
                                  paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' 
                                    ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                                    : 'cursor-pointer hover:text-destructive'
                                }`}
                                onClick={() => {
                                  if (paymentStatus !== 'succeeded' && cardPaymentStatus !== 'succeeded') {
                                    setCart(draft => {
                                      draft.products[pIdx].prices[priceIdx].customers[cIdx].customer = null;
                                      draft.products[pIdx].prices[priceIdx].customers[cIdx].dependent = null;
                                    });
                                    // Update snapshot after removing customer
                                    setTimeout(updateSnapshotCustomers, 50);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Not assigned
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )
                }
                return null;
              })}
            </div>
            }
            {!requiresWaiver &&
              <div className="flex items-center gap-4">
                <div className="whitespace-nowrap">Customer</div>
                <div className="flex justify-end w-full text-right">
                {((paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') ? cartSnapshot?.customer : cart.customer) ? (
                  <div className="flex items-center gap-1">
                    <div>{(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') ? cartSnapshot?.customer?.name : cart.customer.name}</div>
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
                  </div>
                ) : (
                  <Button
                    size="sm" variant="outline"
                    disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                    onClick={() => setShowCustomerSelection(true)}
                  >
                    Connect Customer
                  </Button>
                )}
                </div>
              </div>
            }
            
            {/* Email Receipt Section - Show when payment succeeds and no customer email */}
            {(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') && 
             !((cartSnapshot?.customer || cart.customer)?.email) &&
             !requiresWaiver && (
              <div className="mt-4 space-y-2">
                <Separator orientation="vertical" className="h-[1px] bg-muted" />
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="text-sm">Email Receipt</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={receiptEmail}
                    onChange={(e) => setReceiptEmail(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !sendingReceipt) {
                        handleSendReceipt()
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendReceipt}
                    disabled={sendingReceipt || !isValidEmail}
                    className="cursor-pointer"
                  >
                    {sendingReceipt ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      'Send'
                    )}
                  </Button>
                </div>
              </div>
            )}

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
        
        <TabsContent value="card">
          <Card>
            <CardContent className='h-88 flex flex-col gap-2-'>

              {/* Terminal Status or Setup Button */}
              {stripeEnabled === false ? (
                <div className="flex flex-col gap-2 py-4">
                  <div className="text-sm text-muted-foreground text-center mb-2">
                    Stripe payments not configured
                  </div>
                  <Button
                    onClick={() => router.push('/settings')}
                    className="w-full"
                  >
                    Setup Stripe Payments
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Terminal Status</span>
                  <div className="flex items-center gap-2">
                    {terminalStatus === 'connected' && (
                      <>
                        <Wifi className="size-4 text-primary" />
                        <span className="text-xs text-primary">Ready</span>
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
                        <Loader2 className="size-4 animate-spin text-chart-4" />
                        <span className="text-xs text-chart-4">
                          {terminalStatus === 'discovering' ? 'Discovering...' : 'Connecting...'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Buttons - Only show if Stripe is enabled */}
              {stripeEnabled && (
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

                {/* Return to Shop Button - always visible */}
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
              </div>
              )}

              {/* Capture Payment button - only show in dev mode and if Stripe is enabled */}
              {process.env.NEXT_PUBLIC_IS_DEV === 'true' && stripeEnabled && (
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
                      ) ||
                      // Check for products requiring waivers that don't have all customers assigned
                      cart.products.some(p =>
                        p.waiverRequired && (
                          // For class/course/general products, check prices directly on product
                          (['class', 'course', 'general'].includes(p.type) && 
                            p.prices?.some(price =>
                              price.customers?.some(c => !c.customer?._id)
                            )
                          ) ||
                          // For other products, check variations
                          (p.variations?.some(v =>
                            v.prices?.some(pr =>
                              pr.customers?.some(c => !c.customer?._id)
                            )
                          ))
                        )
                      )
                    }
                    onClick={async () => {
                      setIsProcessingCash(true);
                      try {
                        const tx = await receiveCash({ input: cashInput });
                        // console.log(cart)
                        setPaymentStatus(tx.transaction.status);
                        
                        // Store transaction ID for receipt sending
                        if (tx.transaction && tx.transaction._id) {
                          setTransactionId(tx.transaction._id);
                        }
                        
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

      <CustomerSelectionSheet
        open={showCustomerSelection}
        onOpenChange={setShowCustomerSelection}
        onConfirm={handleCustomerSelection}
        cart={cart}
        requiresWaiver={requiresWaiver}
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
