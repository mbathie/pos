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
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, ChevronUp, Wifi, WifiOff, Loader2, Trash2, Mail, Plus, OctagonAlert, Check, Building2, ChevronsUpDown, User } from "lucide-react";
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from "@/lib/utils";

import CustomerSelectionSheet from './customerSelectionSheet'
import DiscountPinDialog from '@/components/pin-dialog-discount'
import { AddCompanySheet } from '@/components/add-company-sheet'
import { hasPermission } from '@/lib/permissions'
// import { User } from "lucide-react";

// Email validation schema
const emailSchema = z.string().email('Please enter a valid email address');

const keypad = ['1','2','3','4','5','6','7','8','9','.','0','AC'];

export default function Page() {
  const { getCurrentCart, resetCart, markCartAsStale, setCart, employee, setEmployee, location, appliedAdjustments, setAppliedAdjustments, clearAppliedAdjustments } = useGlobals();
  const cart = getCurrentCart();
  const [mounted, setMounted] = useState(false);
  const [cashInput, setCashInput] = useState('0');
  const [tab, setTab] = useState('card');
  const router = useRouter();
  const pathname = usePathname();
  const hasSuccessfulPayment = useRef(false);
  const isAttemptingConnection = useRef(false);
  const [stripeEnabled, setStripeEnabled] = useState(null);
  const [hasTerminals, setHasTerminals] = useState(false);
  const [terminalRetryCount, setTerminalRetryCount] = useState(0);
  const [terminalRetryExhausted, setTerminalRetryExhausted] = useState(false);
  const {
    discoverReaders,
    connectReader,
    disconnectReader,
    collectPayment,
    cancelPayment,
    terminalStatus,
    paymentStatus: cardPaymentStatus,
    transactionId: cardTransactionId
  } = useCard({cart, employee, location})
  const { calcChange, receiveCash } = useCash({cart})

  const [changeInfo, setChangeInfo] = useState({ received: "0.00", change: "0.00" });

  const [ paymentIntentId, setPaymentIntentId ] = useState(0)
  const [ transactionId, setTransactionId ] = useState(null)
  const [ paymentStatus, setPaymentStatus ] = useState("")
  const [ isCollectingPayment, setIsCollectingPayment ] = useState(false)
  const [ isProcessingCash, setIsProcessingCash ] = useState(false)
  // Snapshot removed

  const [ showCustomerSelection, setShowCustomerSelection ] = useState(false)
  const [ selectedSlot, setSelectedSlot ] = useState(null)
  const [ requiresCustomerAssignment, setRequiresCustomerAssignment ] = useState(false)
  
  // Discount state
  const [discounts, setDiscounts] = useState([])
  const [loadingDiscounts, setLoadingDiscounts] = useState(false)
  const [discountExpanded, setDiscountExpanded] = useState(false)
  const [customDiscountDollar, setCustomDiscountDollar] = useState(null)
  const [customDiscountPercent, setCustomDiscountPercent] = useState(null)
  const [showDiscountPinDialog, setShowDiscountPinDialog] = useState(false)
  const [pendingDiscountAmount, setPendingDiscountAmount] = useState('')
  
  // Surcharge state  
  const [surchargeExpanded, setSurchargeExpanded] = useState(false)
  
  // Email receipt state
  const [receiptEmail, setReceiptEmail] = useState('')
  const [sendingReceipt, setSendingReceipt] = useState(false)
  const [isValidEmail, setIsValidEmail] = useState(false)
  
  // Customer credits state
  const [customerCredits, setCustomerCredits] = useState(null)

  // Company/Individual payment selection state
  const [paymentType, setPaymentType] = useState('individual') // 'individual' or 'group'
  const [groupPayerType, setGroupPayerType] = useState('company') // 'company' or 'customer' - who pays for group
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [selectedGroupCustomer, setSelectedGroupCustomer] = useState(null) // Customer paying for group
  const [companies, setCompanies] = useState([])
  const [companySearchOpen, setCompanySearchOpen] = useState(false)
  const [companySearchQuery, setCompanySearchQuery] = useState('')
  const [groupCustomerSheetOpen, setGroupCustomerSheetOpen] = useState(false)
  const [addCompanySheetOpen, setAddCompanySheetOpen] = useState(false)

  // Organization settings state
  const [orgSettings, setOrgSettings] = useState({})

  // Check if cart contains membership products
  const hasMembershipProducts = cart.products.some(product => product.type === 'membership')

  // Check if cart contains only shop products
  const hasOnlyShopProducts = cart.products.length > 0 && cart.products.every(product => product.type === 'shop')

  // Check if any products in cart require a waiver
  const hasWaiverRequiredProducts = cart.products.some(product => product.waiverRequired === true)

  // Check if all required customers are assigned for products with waivers
  const needsCustomerAssignment = cart.products.some(product => {
    console.log('🔍 Checking product:', product.name, {
      type: product.type,
      waiverRequired: product.waiverRequired,
      hasCustomer: !!cart.customer?._id,
      isGrouped: !!product.gId
    })

    if (!product.waiverRequired) {
      console.log('  ✅ No waiver required, skipping')
      return false
    }

    // For class, course, membership - check if all slots have customers
    if (['class', 'course', 'membership'].includes(product.type)) {
      const missingCustomers = product.prices?.some(price => {
        const hasMissing = price.customers?.some(c => !c.customer?._id)
        console.log('  📋 Price:', price.name, {
          qty: price.qty,
          customers: price.customers?.length,
          hasMissing,
          customerDetails: price.customers?.map(c => ({ hasCustomer: !!c?.customer?._id, customerName: c?.customer?.name }))
        })
        return hasMissing
      })
      console.log('  🎯 Missing customers:', missingCustomers)
      return missingCustomers
    }

    // For shop items with waiver requirement, check if cart has a customer
    if (product.type === 'shop') {
      const needsCustomer = !cart.customer?._id
      console.log('  🛒 Shop item needs customer:', needsCustomer)
      return needsCustomer
    }

    console.log('  ⚠️ Unknown type, returning false')
    return false
  })

  console.log('🚦 Final needsCustomerAssignment:', needsCustomerAssignment)

  // Set mounted to true on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Auto-switch to invoice tab for group payments, back to card for individual
  useEffect(() => {
    if (paymentType === 'group') {
      setTab('invoice')
    } else if (tab === 'invoice') {
      setTab('card')
    }
  }, [paymentType])

  // Fetch customer credits when a customer is selected
  useEffect(() => {
    const fetchCustomerCredits = async () => {
      if (cart.customer?._id) {
        try {
          const response = await fetch(`/api/customers/${cart.customer._id}`)
          if (response.ok) {
            const customerData = await response.json()
            setCustomerCredits(customerData.credits || { balance: 0 })
            
            // Update cart customer with credits data
            setCart(draft => {
              if (draft.customer) {
                draft.customer.credits = customerData.credits || { balance: 0 }
              }
            })
          }
        } catch (error) {
          console.error('Error fetching customer credits:', error)
        }
      } else {
        setCustomerCredits(null)
      }
    }
    
    fetchCustomerCredits()
  }, [cart.customer?._id])

  // Fetch companies when payment type is 'group' and groupPayerType is 'company'
  useEffect(() => {
    const fetchCompanies = async () => {
      if (paymentType === 'group' && groupPayerType === 'company') {
        try {
          const params = new URLSearchParams();
          if (companySearchQuery) {
            params.append('search', companySearchQuery);
          }
          const response = await fetch(`/api/companies?${params}`);
          if (response.ok) {
            const data = await response.json();
            setCompanies(data.companies || []);
          }
        } catch (error) {
          console.error('Error fetching companies:', error);
        }
      }
    };

    fetchCompanies();
  }, [paymentType, groupPayerType, companySearchQuery]);


  useEffect(() => {
    console.log(cart)
  },[cart])

  // Fetch organization settings
  useEffect(() => {
    const fetchOrgSettings = async () => {
      try {
        const response = await fetch('/api/orgs')
        if (response.ok) {
          const data = await response.json()
          setOrgSettings(data.org || {})
        }
      } catch (error) {
        console.error('Error fetching org settings:', error)
      }
    }
    fetchOrgSettings()
  }, [])

  // Pre-populate email receipt when payment succeeds for shop-only transactions
  useEffect(() => {
    // Check if payment succeeded
    const isPaymentSuccessful = paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'

    if (isPaymentSuccessful && hasOnlyShopProducts && !orgSettings.autoReceiptShop && cart.customer?.email) {
      // Pre-populate the email field with customer's email
      setReceiptEmail(cart.customer.email)
      console.log('📧 Pre-populating receipt email for manual send:', cart.customer.email)
    }
  }, [paymentStatus, cardPaymentStatus, hasOnlyShopProducts, orgSettings.autoReceiptShop, cart.customer?.email])

  // Update receive amount when card payment succeeds
  useEffect(() => {
    if (cardPaymentStatus === 'succeeded' && tab === 'card') {
      const amountPaid = (cart.total || 0).toFixed(2)
      setChangeInfo({ received: amountPaid, change: "0.00" })
      if (cardTransactionId) setTransactionId(cardTransactionId)
    }
  }, [cardPaymentStatus, tab, cart.total, cardTransactionId])

  // Handle single customer selection for a specific slot
  const handleCustomerSelection = async (selectedCustomer) => {
    console.log('🎯 handleCustomerSelection called with:', {
      selectedCustomer: selectedCustomer?.customer?.name,
      selectedSlot: selectedSlot
    })
    
    if (!selectedSlot) {
      console.log('❌ Missing selectedCustomer or selectedSlot')
      return
    }

    // Handle shop customer connection (no specific slot assignment)
    if (selectedSlot.isShopCustomer) {
      console.log('🛒 Connecting shop customer:', selectedCustomer?.customer?.name)
      setCart(draft => {
        draft.customer = selectedCustomer.customer
      })
      
      // Clear the selected slot
      setSelectedSlot(null)
      setShowCustomerSelection(false)
      
      // Re-apply adjustments with the new customer, preserving any existing discount
      if (selectedCustomer.customer) {
        setTimeout(() => {
          // Check if there's already a discount applied
          const existingDiscount = appliedAdjustments?.discounts?.items?.[0]
          
          if (existingDiscount) {
            // If there's an existing custom discount, re-apply it with the new customer
            if (existingDiscount.name === 'Custom Discount') {
              applyAdjustments(null, null, existingDiscount.value, 'Custom Discount', selectedCustomer.customer, false)
            } else {
              // Re-apply the existing regular discount with the new customer
              applyAdjustments(null, existingDiscount.id, null, existingDiscount.name, selectedCustomer.customer, false)
            }
          } else {
            // No existing discount, try auto-applying eligible discounts
            applyAdjustments(null, null, null, null, selectedCustomer.customer, true)
          }
        }, 120)
      }
      return
    }
    
    const { priceId, slotIdx, isMinor } = selectedSlot
    
    console.log('📍 Assigning to specific slot:', {
      priceId: priceId,
      slotIndex: slotIdx,
      customerName: selectedCustomer.customer?.name,
      customerId: selectedCustomer.customer?._id,
      dependent: selectedCustomer.dependent?.name,
      isMinor: selectedCustomer.isMinor
    })
    
    setCart(draft => {
      console.log('📦 Current cart products:', draft.products.length)

      // Find the product and price by the unique price ID (all products are now flat)
      let targetProductIdx = -1
      let targetPriceIdx = -1

      console.log('🔍 Searching for price ID:', priceId)
      console.log('🔍 Cart products:', draft.products.map((p, idx) => ({
        idx,
        name: p.name,
        type: p.type,
        isGrouped: !!p.gId,
        groupName: p.groupName,
        priceIds: p.prices?.map(pr => pr._id)
      })))

      for (let pIdx = 0; pIdx < draft.products.length; pIdx++) {
        const product = draft.products[pIdx]
        if (product.prices) {
          const priceIdx = product.prices.findIndex(p => p._id === priceId)
          if (priceIdx !== -1) {
            targetProductIdx = pIdx
            targetPriceIdx = priceIdx
            console.log(`✅ Found price at product[${pIdx}].prices[${priceIdx}]${product.gId ? ` [grouped: ${product.groupName}]` : ''}`)
            break
          }
        }
      }

      if (targetProductIdx === -1 || targetPriceIdx === -1) {
        console.log('❌ Price not found in cart with ID:', priceId)
        return
      }

      const targetProduct = draft.products[targetProductIdx]

      console.log('📦 Target product index:', targetProductIdx)
      console.log('📦 Target product:', targetProduct?.name)
      console.log('📦 Target price ID:', priceId)
      console.log('📦 Target price:', targetProduct?.prices?.[targetPriceIdx]?.name)
      console.log('📦 Is grouped:', !!targetProduct.gId)

      // Initialize customers array if needed
      if (!targetProduct.prices[targetPriceIdx].customers) {
        const qty = targetProduct.prices[targetPriceIdx].qty || 0
        console.log(`📦 Initializing customers array with ${qty} slots`)
        targetProduct.prices[targetPriceIdx].customers = Array(qty).fill(null).map(() => ({
          customer: null,
          dependent: null
        }))
      }

      console.log('📦 Before assignment - customers at this price:',
        targetProduct.prices[targetPriceIdx].customers?.map((c, i) =>
          `Slot ${i}: ${c?.customer?.name || 'empty'}`
        )
      )
      
      // Multi-minor selection handling
      if (selectedCustomer?.minors && Array.isArray(selectedCustomer.minors) && selectedCustomer.minors.length > 0) {
        let i = 0
        const productRef = targetProduct
        // Determine where to place minors: if current price is minor, fill here; else fill all sibling minor prices
        const fillTargets = []
        if (productRef.prices[targetPriceIdx].minor) {
          fillTargets.push(productRef.prices[targetPriceIdx])
        } else {
          productRef.prices?.forEach(pr => { if (pr.minor) fillTargets.push(pr) })
        }

        for (const pr of fillTargets) {
          if (!pr.customers) {
            const qty = pr.qty || 0
            pr.customers = Array(qty).fill(null).map(() => ({ customer: null, dependent: null }))
          }
          for (let s = 0; s < pr.customers.length; s++) {
            const slot = pr.customers[s] || {}
            if (!slot.customer && !slot.dependent && i < selectedCustomer.minors.length) {
              const m = selectedCustomer.minors[i]
              pr.customers[s] = { customer: m.customer, dependent: m.dependent }
              i++
            }
          }
          if (i >= selectedCustomer.minors.length) break
        }

        // If this selection was started from an ADULT slot, also assign the adult there
        if (!productRef.prices[targetPriceIdx].minor && typeof slotIdx === 'number') {
          if (!productRef.prices[targetPriceIdx].customers) {
            const qty = productRef.prices[targetPriceIdx].qty || 0
            productRef.prices[targetPriceIdx].customers = Array(qty).fill(null).map(() => ({ customer: null, dependent: null }))
          }
          productRef.prices[targetPriceIdx].customers[slotIdx] = {
            customer: selectedCustomer.customer,
            dependent: null
          }
        }
      } else {
        // Single assignment (adult or single dependent)
        targetProduct.prices[targetPriceIdx].customers[slotIdx] = {
          customer: selectedCustomer.customer,
          dependent: selectedCustomer.dependent || null
        }
      }

      console.log('📦 After assignment - customers at this price:',
        targetProduct.prices[targetPriceIdx].customers?.map((c, i) =>
          `Slot ${i}: ${c?.customer?.name || 'empty'}`
        )
      )
      
      // Set main cart customer for discount eligibility if this is the first customer
      if (!draft.customer && selectedCustomer.customer) {
        draft.customer = selectedCustomer.customer
      }
    })
    
    // Log the entire cart state after assignment
    setCart(draft => {
      console.log('🔍 Final cart state check:')
      draft.products.forEach((product, pIdx) => {
        if (product.prices) {
          product.prices.forEach((price, priceIdx) => {
            if (price.customers) {
              console.log(`  Product ${pIdx} (${product.name})${product.gId ? ` [grouped: ${product.groupName}]` : ''}, Price ${priceIdx} (${price.name}):`)
              price.customers.forEach((cust, slotIdx) => {
                console.log(`    Slot ${slotIdx}: ${cust?.customer?.name || 'empty'} (ID: ${cust?.customer?._id || 'none'})`)
              })
            }
          })
        }
      })
      return draft
    })
    
    // Snapshot removed – nothing else to update here
    
    toast.success('Customer assigned successfully')
    
    // Clear the selected slot
    setSelectedSlot(null)
    setShowCustomerSelection(false)
    
    // Auto-apply eligible discounts when customer is assigned (adult or first minor guardian)
    if (selectedCustomer.customer) {
      // Defer to allow the state update to commit so merge uses latest customers
      setTimeout(() => {
        applyAdjustments(null, null, null, null, selectedCustomer.customer, true)
      }, 120)
    }
  }

  // Helper: merge previously assigned customers back into updated products
  const mergeCustomersIntoProducts = (prevProducts, nextProducts) => {
    try {
      // Build a lookup map from unique price ID -> customers array
      const priceIdToCustomers = new Map();

      prevProducts.forEach((prod) => {
        // Prices at root
        prod.prices?.forEach((price) => {
          if (price?._id) {
            priceIdToCustomers.set(price._id, Array.isArray(price.customers) ? JSON.parse(JSON.stringify(price.customers)) : undefined);
          }
        });
        // Legacy variations support
        prod.variations?.forEach((variation) => {
          variation.prices?.forEach((price) => {
            if (price?._id) {
              priceIdToCustomers.set(price._id, Array.isArray(price.customers) ? JSON.parse(JSON.stringify(price.customers)) : undefined);
            }
          });
        });
      });

      // Walk nextProducts and inject customers by matching price IDs
      return nextProducts.map((nextProd) => {
        // Prices at root level
        if (Array.isArray(nextProd.prices)) {
          nextProd.prices = nextProd.prices.map((nextPrice) => {
            const prevCustomers = priceIdToCustomers.get(nextPrice?._id);
            if (!prevCustomers) return nextPrice;

            const expectedLen = (typeof nextPrice.qty === 'number')
              ? nextPrice.qty
              : (Array.isArray(nextPrice.customers) ? nextPrice.customers.length : prevCustomers.length);

            const mergedCustomers = Array.from({ length: expectedLen }, (_, i) => {
              const prevCust = prevCustomers?.[i];
              const nextCust = nextPrice.customers?.[i];
              return prevCust ? JSON.parse(JSON.stringify(prevCust)) : (nextCust ? JSON.parse(JSON.stringify(nextCust)) : {});
            });

            return { ...nextPrice, customers: mergedCustomers };
          });
        }

        // Legacy variations support
        if (Array.isArray(nextProd.variations)) {
          nextProd.variations = nextProd.variations.map((nextVar) => {
            if (Array.isArray(nextVar.prices)) {
              nextVar.prices = nextVar.prices.map((nextPrice) => {
                const prevCustomers = priceIdToCustomers.get(nextPrice?._id);
                if (!prevCustomers) return nextPrice;

                const expectedLen = (typeof nextPrice.qty === 'number')
                  ? nextPrice.qty
                  : (Array.isArray(nextPrice.customers) ? nextPrice.customers.length : prevCustomers.length);

                const mergedCustomers = Array.from({ length: expectedLen }, (_, i) => {
                  const prevCust = prevCustomers?.[i];
                  const nextCust = nextPrice.customers?.[i];
                  return prevCust ? JSON.parse(JSON.stringify(prevCust)) : (nextCust ? JSON.parse(JSON.stringify(nextCust)) : {});
                });

                return { ...nextPrice, customers: mergedCustomers };
              });
            }
            return nextVar;
          });
        }

        return nextProd;
      });
    } catch (e) {
      console.error('mergeCustomersIntoProducts failed:', e);
      return nextProducts;
    }
  };

  // Apply adjustments to cart when discount is applied
  const applyAdjustments = async (discountCode = null, discountId = null, customDiscountAmount = null, discountName = null, explicitCustomer = null, autoApply = false, isManualSelection = false) => {
    try {
      console.log('🎁 [UI] Requesting adjustments:', { discountCode, discountId, customDiscountAmount, discountName, hasExplicitCustomer: !!explicitCustomer, autoApply, isManualSelection });
      
      const response = await fetch('/api/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          customer: explicitCustomer || cart.customer,
          discountCode,
          discountId,
          customDiscountAmount,
          autoApply,
          isManualSelection
        })
      });

      if (response.ok) {
        const updatedCart = await response.json();
        
        console.log('🎁 [UI] Received adjustments:', {
          discounts: updatedCart.adjustments?.discounts?.items?.length || 0,
          surcharges: updatedCart.adjustments?.surcharges?.items?.length || 0,
          totalDiscount: updatedCart.adjustments?.discounts?.total,
          error: updatedCart.adjustments?.discountError
        });
        
        // Handle discount application feedback (skip for custom discounts)
        if (updatedCart.adjustments?.discountError && !customDiscountAmount) {
          // Discount was not applied - show detailed error (but not for custom discounts)
          toast.error(
            <div>
              <div className="font-semibold">Discount Not Applied</div>
              <div className="text-sm mt-1">{updatedCart.adjustments.discountError}</div>
            </div>,
            { duration: 5000 }
          );
          
          // Don't update cart if discount wasn't applied
          return null;
        } else if (updatedCart.adjustments?.discounts?.items?.length > 0) {
          // Discount was successfully applied
          const discount = updatedCart.adjustments.discounts.items[0];
          const affectedCount = discount.affectedProducts?.length || 0;
          
          toast.success(
            <div>
              <div className="font-semibold">Discount Applied</div>
              <div className="text-sm mt-1">
                {discount.name}: -${discount.amount.toFixed(2)} on {affectedCount} item{affectedCount !== 1 ? 's' : ''}
              </div>
            </div>,
            { duration: 4000 }
          );
          
          // Update the cart with adjusted values (preserve customer assignments)
          setCart(draft => {
            draft.subtotal = updatedCart.subtotal;
            draft.tax = updatedCart.tax;
            draft.total = updatedCart.total;
            draft.adjustments = updatedCart.adjustments; // Store the adjustments in cart
            const merged = mergeCustomersIntoProducts(draft.products, JSON.parse(JSON.stringify(updatedCart.products)));
            draft.products = merged;
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
          // Update the cart with adjusted values (preserve customer assignments)
          setCart(draft => {
            draft.subtotal = updatedCart.subtotal;
            draft.tax = updatedCart.tax;
            draft.total = updatedCart.total;
            draft.adjustments = updatedCart.adjustments; // Store the adjustments in cart
            const merged = mergeCustomersIntoProducts(draft.products, JSON.parse(JSON.stringify(updatedCart.products)));
            draft.products = merged;
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

  // Remove discount only (preserve surcharges)
  const removeAdjustments = async () => {
    console.log('🗑️ [UI] Removing discount (preserving surcharges)');
    
    // Recalculate adjustments without any discount (but keep surcharges)
    // This will update the appliedAdjustments state with just surcharges
    await applyAdjustments(null, null, null, null, cart.customer || null, false, false);
    
    // Don't clear appliedAdjustments - it now contains the surcharges
    
    toast.info(
      <div>
        <div className="font-semibold">Discount Removed</div>
        <div className="text-sm mt-1">Surcharges still apply if applicable</div>
      </div>,
      { duration: 3000 }
    );
  };

  // Check if Stripe is configured and terminals exist
  useEffect(() => {
    const checkStripeAndTerminals = async () => {
      console.log('🔍 Checking terminals - Employee object:', employee);
      console.log('🔍 Checking terminals - Cart object:', cart);

      // Reset retry count and attempting flag when location changes
      setTerminalRetryCount(0);
      setTerminalRetryExhausted(false);
      isAttemptingConnection.current = false;

      try {
        // Check Stripe status
        const stripeRes = await fetch('/api/payments');
        const stripeData = await stripeRes.json();
        setStripeEnabled(stripeData.charges_enabled || false);

        // Use the location from globals which is updated by the location switcher
        const currentLocationId = location?._id || employee?.selectedLocationId || employee?.location?._id;

        if (stripeData.charges_enabled && currentLocationId) {
          const terminalsRes = await fetch('/api/terminals');
          const terminals = await terminalsRes.json();
          console.log('🔍 All terminals from API:', terminals);
          console.log('📍 Current location ID (using selectedLocationId):', currentLocationId);

          // Filter terminals for the current location only
          const locationTerminals = terminals?.filter(t => {
            const locationMatch = t.location?._id === currentLocationId ||
                                 t.location === currentLocationId;
            console.log(`  Terminal ${t.label}: location ${t.location?._id || t.location} === ${currentLocationId}? ${locationMatch}`);
            return locationMatch;
          }) || [];

          setHasTerminals(locationTerminals.length > 0);
          console.log(`📍 Found ${locationTerminals.length} terminal(s) for location ${currentLocationId}:`, locationTerminals);

          // If no terminals for this location, ensure we disconnect any existing connection
          if (locationTerminals.length === 0 && terminalStatus === 'connected') {
            console.log('📍 No terminals at new location, disconnecting...');
            if (disconnectReader) {
              await disconnectReader();
            }
          }
        } else {
          console.log('❌ Cannot check terminals:', {
            stripeEnabled: stripeData.charges_enabled,
            hasLocation: !!currentLocationId
          });
          setHasTerminals(false);

          // Disconnect if we have no location
          if (terminalStatus === 'connected' && disconnectReader) {
            console.log('📍 No location selected, disconnecting terminal...');
            await disconnectReader();
          }
        }
      } catch (error) {
        console.error('Error checking Stripe/terminal status:', error);
        setStripeEnabled(false);
        setHasTerminals(false);
      }
    };
    checkStripeAndTerminals();
  }, [location?._id, employee?.selectedLocationId, employee?.location?._id]); // Re-check when location changes

  // Only attempt terminal connection if terminals are actually configured
  useEffect(() => {
    const MAX_RETRIES = 3;
    
    // Early check: if already attempting, skip immediately to prevent re-entry
    if (isAttemptingConnection.current) {
      console.log('⏭️ Already attempting connection, skipping...');
      return;
    }
    
    console.log('🔄 Terminal auto-connect check:', {
      stripeEnabled,
      hasTerminals,
      terminalStatus,
      retryCount: terminalRetryCount,
      retryExhausted: terminalRetryExhausted,
      isAttempting: isAttemptingConnection.current,
      locationId: location?._id || employee?.selectedLocationId || employee?.location?._id
    });

    // Reset retry count when terminal connects successfully
    if (terminalStatus === 'connected') {
      if (terminalRetryCount > 0 || terminalRetryExhausted) {
        setTerminalRetryCount(0);
        setTerminalRetryExhausted(false);
      }
      isAttemptingConnection.current = false;
      return;
    }

    // Only try to initialize if:
    // 1. Stripe is enabled
    // 2. Terminals are configured in the system
    // 3. Terminal is currently disconnected
    // 4. Haven't exceeded max retries
    // 5. Not currently attempting a connection
    if (stripeEnabled && hasTerminals && terminalStatus === 'disconnected' && !terminalRetryExhausted && !isAttemptingConnection.current) {
      console.log('✅ Conditions met for auto-connect, initializing terminal...');

      // Mark that we're attempting a connection to prevent re-entry
      isAttemptingConnection.current = true;

      // Async function to handle retry logic
      const attemptConnectionWithRetries = async () => {
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            // Discover readers
            console.log(`🔍 Discovering readers... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
            await discoverReaders();

            // Minimal delay to ensure discovery completes
            await new Promise(resolve => setTimeout(resolve, 100));

            // Connect to the discovered reader
            console.log('🔌 Connecting to reader...');
            const connectionResult = await connectReader();

            // Check if connection failed
            if (connectionResult?.error) {
              throw new Error(connectionResult.error.message);
            }

            // Success - reset attempting flag and exit retry loop
            isAttemptingConnection.current = false;
            setTerminalRetryCount(0);
            setTerminalRetryExhausted(false);
            console.log('✅ Terminal connected successfully');
            return;
          } catch (error) {
            console.warn(`⚠️ Terminal initialization error (Attempt ${attempt + 1}/${MAX_RETRIES}):`, error.message);

            // Check if this was the last attempt
            if (attempt === MAX_RETRIES - 1) {
              console.warn(`⚠️ Terminal connection failed after ${MAX_RETRIES} attempts. Card payments unavailable.`);
              setTerminalRetryCount(MAX_RETRIES);
              setTerminalRetryExhausted(true);
              isAttemptingConnection.current = false;
              return;
            } else {
              // Not the last attempt, continue retrying
              setTerminalRetryCount(attempt + 1);
              // Wait before next retry
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          }
        }
      };

      // Start the retry sequence after a short delay
      const timer = setTimeout(attemptConnectionWithRetries, 200);
      return () => {
        clearTimeout(timer);
      };
    } else {
      console.log('⏭️ Skipping auto-connect:', {
        stripeNotEnabled: !stripeEnabled,
        noTerminals: !hasTerminals,
        notDisconnected: terminalStatus !== 'disconnected',
        retryExhausted: terminalRetryExhausted,
        isAttempting: isAttemptingConnection.current
      });
    }
  }, [stripeEnabled, hasTerminals, terminalStatus, terminalRetryExhausted, location?._id, employee?.selectedLocationId, employee?.location?._id]); // Also trigger when location changes

  // Always use live cart for display
  const displayCart = cart

  // Reset cart when payment succeeds (but keep UI in completed state)
  useEffect(() => {
    if (paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') {
      // Stop the collecting/loading state
      setIsCollectingPayment(false)

      // Mark cart as stale after successful card payment (keep totals visible for POS operator)
      if ((paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') && cart.products.length > 0) {
        console.log('✅ Card payment succeeded, marking cart as stale')
        markCartAsStale()
      }

      // Auto-redirect to shop after a short delay
      const timeout = setTimeout(() => {
        toast.success('Payment completed successfully')
        router.push('/shop')
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [paymentStatus, cardPaymentStatus, cart.products.length, markCartAsStale, router])


  // Clear adjustments when navigating away or when returning to shop
  useEffect(() => {
    const handleRouteChange = () => {
      // Clear adjustments when leaving payment page
      clearAppliedAdjustments()
    }

    // Clear snapshot when user navigates away
    return () => {
      if (pathname !== '/shop/payment') {
        handleRouteChange()
      }
    }
  }, [pathname, clearAppliedAdjustments])

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
          // Filter out surcharges - only show discounts in the dropdown
          const discountsOnly = data.filter(d => d.mode !== 'surcharge')
          console.log(`📋 [UI] Found ${discountsOnly.length} available discount(s) (filtered out surcharges):`, discountsOnly.map(d => ({
            name: d.name,
            code: d.code,
            type: d.type,
            value: d.value,
            mode: d.mode
          })))
          setDiscounts(discountsOnly)
        }
      } catch (error) {
        console.error('❌ [UI] Error fetching discounts:', error)
      } finally {
        setLoadingDiscounts(false)
      }
      
      // Apply surcharges and re-apply any existing discount if cart has products
      if (cart.products.length > 0) {
        console.log('🔄 [UI] Checking for adjustments on cart...')
        
        // Check if cart has a previously applied discount
        if (cart.adjustments?.discounts?.items?.length > 0) {
          const discount = cart.adjustments.discounts.items[0];

          // Check if it's a custom discount
          if (discount.name === 'Custom Discount') {
            console.log(`🔄 [UI] Re-applying custom discount: $${discount.amount}`)
            await applyAdjustments(null, null, discount.amount, 'Custom Discount');
          } else {
            console.log(`🔄 [UI] Re-applying previous discount: ${discount.id}`)
            await applyAdjustments(null, discount.id);
          }
        } else if (cart.customer) {
          // Check if there's already a custom discount applied in the cart
          const existingCustomDiscount = cart.adjustments?.discounts?.items?.find(d => d.name === 'Custom Discount');

          // If customer is already set, check for auto-applicable discounts
          console.log('🔄 [UI] Customer found, checking for auto-applicable discounts...')
          if (existingCustomDiscount) {
            // Re-apply the custom discount to avoid validation errors
            console.log('🔄 [UI] Re-applying existing custom discount:', existingCustomDiscount.amount)
            await applyAdjustments(null, null, existingCustomDiscount.amount, 'Custom Discount', cart.customer, false);
          } else {
            await applyAdjustments(null, null, null, null, cart.customer, true);
          }
        } else {
          // Check if there's already a custom discount applied in the cart
          const existingCustomDiscount = cart.adjustments?.discounts?.items?.find(d => d.name === 'Custom Discount');

          // Just check for surcharges
          if (existingCustomDiscount) {
            // Re-apply the custom discount to avoid validation errors
            console.log('🔄 [UI] Re-applying existing custom discount:', existingCustomDiscount.amount)
            await applyAdjustments(null, null, existingCustomDiscount.amount, 'Custom Discount');
          } else {
            await applyAdjustments();
          }
        }
      }
    }

    fetchDiscountsAndApplySurcharges()
  }, []) // Only run once on mount

  // Check if customer assignment is required (waiver products, class/course, or group products)
  useEffect(() => {
    // Check if any product requires a waiver, is a class/course, or is part of a group
    const hasWaiverProduct = cart.products.some(p => p.waiverRequired === true)
    const hasClassOrCourse = cart.products.some(p => ['class', 'course'].includes(p.type))
    const hasGroupProduct = cart.products.some(p => p.gId)
    setRequiresCustomerAssignment(hasWaiverProduct || hasClassOrCourse || hasGroupProduct)
  }, [cart.products])

  // Check if all products are shop or general items (customer is optional)
  const isShopOnly = cart.products.length > 0 &&
    cart.products.every(p => (p.type === 'shop' || p.type === 'general') && !p.waiverRequired)

  // Initialize customer slots for products that need them
  useEffect(() => {
    console.log('🔧 Initializing customer slots for cart products...')
    setCart(draft => {
      draft.products.forEach((product, pIdx) => {
        if (['class', 'course', 'membership'].includes(product.type)) {
          console.log(`  🎯 Product "${product.name}" (${product.type})${product.gId ? ` [grouped: ${product.groupName}]` : ''} needs customer slots`)
          product.prices?.forEach((price, priceIdx) => {
            const qty = price.qty || 0

            if (!draft.products[pIdx].prices[priceIdx].customers) {
              console.log(`    ➕ Creating customers array for "${price.name}" (qty: ${qty})`)
              draft.products[pIdx].prices[priceIdx].customers = []
            }

            const currentLength = draft.products[pIdx].prices[priceIdx].customers.length

            if (currentLength < qty) {
              // Add empty slots
              console.log(`    ➕ Adding ${qty - currentLength} empty customer slots`)
              for (let i = currentLength; i < qty; i++) {
                draft.products[pIdx].prices[priceIdx].customers.push({customer: null, dependent: null})
              }
            } else if (currentLength > qty) {
              // Remove excess slots
              console.log(`    ➖ Removing ${currentLength - qty} excess customer slots`)
              draft.products[pIdx].prices[priceIdx].customers =
                draft.products[pIdx].prices[priceIdx].customers.slice(0, qty)
            }
          })
        }
      })
    })
  }, [cart.products.length])

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
    console.log('🎯 [UI] Applying custom discount:', discountAmount);
    
    // Apply custom discount through the adjustments API with proper name
    const result = await applyAdjustments(null, null, discountAmount, 'Custom Discount');
    
    console.log('🎯 [UI] Custom discount result:', result);
    console.log('🎯 [UI] Applied adjustments after custom discount:', appliedAdjustments);
    
    setCustomDiscountDollar(null);
    setCustomDiscountPercent(null);
    
    // Only show success toast if discount was actually applied
    if (result && result.adjustments?.discounts?.total > 0) {
      // Success message already shown by applyAdjustments
    } else if (!result) {
      toast.error('Failed to apply custom discount');
    }
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

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

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
            {(displayCart.adjustments?.surcharges?.total > 0 || appliedAdjustments?.surcharges?.total > 0) && (
              <>
                <div 
                  className="flex justify-between px-2 -py-1 rounded -mx-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => setSurchargeExpanded(!surchargeExpanded)}
                >
                  <div className="flex items-center gap-1">
                    <span>
                      {displayCart.adjustments?.surcharges?.items?.[0]?.name || appliedAdjustments?.surcharges?.items?.[0]?.name || 'Surcharges'}
                    </span>
                    {surchargeExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </div>
                  <span className="text-right">
                    +${(displayCart.adjustments?.surcharges?.total || appliedAdjustments?.surcharges?.total || 0).toFixed(2)}
                  </span>
                </div>
                
                {/* Expanded surcharge details */}
                {surchargeExpanded && (
                  <div className="text-sm text-muted-foreground pl-4 mt-1 space-y-1">
                    {displayCart.products?.map((product, index) => {
                      if (product.adjustments?.surcharges?.total > 0) {
                        const surchargePercent = (displayCart.adjustments?.surcharges?.items?.[0]?.type === 'percent' || appliedAdjustments?.surcharges?.items?.[0]?.type === 'percent') 
                          ? `${displayCart.adjustments?.surcharges?.items?.[0]?.value || appliedAdjustments?.surcharges?.items?.[0]?.value}% ` 
                          : '';
                        return (
                          <div key={index} className="flex justify-between">
                            <span>{surchargePercent}{product.name}</span>
                            <span>+${product.adjustments.surcharges.total.toFixed(2)}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </>
            )}
            
            {/* Show discounts if any */}
            {(displayCart.adjustments?.discounts?.total > 0 || appliedAdjustments?.discounts?.total > 0) && (
              <>
                <div 
                  className="flex justify-between px-2 -py-1 rounded -mx-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => setDiscountExpanded(!discountExpanded)}
                >
                  <div className="flex items-center gap-1">
                    <span>
                      {displayCart.adjustments?.discounts?.items?.[0]?.name || appliedAdjustments?.discounts?.items?.[0]?.name || 'Discount'}
                    </span>
                    {discountExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </div>
                  <span className="text-right">
                    -${(displayCart.adjustments?.discounts?.total || appliedAdjustments?.discounts?.total || 0).toFixed(2)}
                  </span>
                </div>
                
                {/* Expanded discount details */}
                {discountExpanded && (
                  <div className="text-sm text-muted-foreground pl-4 mt-1 space-y-1">
                    {displayCart.products?.map((product, index) => {
                      if (product.adjustments?.discounts?.total > 0) {
                        const discountPercent = (displayCart.adjustments?.discounts?.items?.[0]?.type === 'percent' || appliedAdjustments?.discounts?.items?.[0]?.type === 'percent') 
                          ? `${displayCart.adjustments?.discounts?.items?.[0]?.value || appliedAdjustments?.discounts?.items?.[0]?.value}% ` 
                          : '';
                        return (
                          <div key={index} className="flex justify-between">
                            <span>{discountPercent}{product.name}</span>
                            <span>-${product.adjustments.discounts.total.toFixed(2)}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </>
            )}
            
            {/* Show credits if any are applied */}
            {displayCart.adjustments?.credits?.amount > 0 && (
              <div className="flex justify-between">
                <span>Credit</span>
                <span className="text-right">-${displayCart.adjustments.credits.amount.toFixed(2)}</span>
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
              
            {appliedAdjustments?.discounts?.total > 0 ? (
                // Show applied discount with remove button (disabled after payment)
                <div className="flex items-center gap-1">
                  <div>{appliedAdjustments?.discounts?.items?.[0]?.name || 'Custom Discount'}</div>
                  <Trash2 
                    className={`size-4 ${
                      paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' 
                        ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                        : 'cursor-pointer hover:text-destructive'
                    }`}
                    onClick={async () => {
                      if (paymentStatus !== 'succeeded' && cardPaymentStatus !== 'succeeded') {
                        await removeAdjustments();
                      }
                    }}
                  />
                </div>
              ) : (
                // Show dropdown for manual selection
                <Select
                  value={appliedAdjustments?.discounts?.items?.[0]?.id || "none"}
                  onValueChange={async (value) => {
                    if (value === "none") {
                      await removeAdjustments()
                    } else {
                      const selectedDiscount = discounts.find(d => d._id === value);
                      if (selectedDiscount) {
                        console.log('🎯 [UI] User selected discount:', selectedDiscount.name);
                        await applyAdjustments(null, value, null, selectedDiscount.name, null, false, true); // isManualSelection = true
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
            {(!appliedAdjustments?.discounts?.total || appliedAdjustments?.discounts?.total === 0) && (
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

            {/* PAYMENT TYPE SELECTION - Regular or Group */}
            {requiresCustomerAssignment && (
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="">Payment Type</div>
                  <div className="flex-1" />
                  <RadioGroup
                    value={paymentType}
                    onValueChange={(value) => {
                      setPaymentType(value);
                      if (value === 'individual') {
                        setSelectedCompany(null);
                        setSelectedGroupCustomer(null);
                      }
                    }}
                    className="flex gap-4"
                    disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual" className="cursor-pointer">Regular</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="group" id="group" />
                      <Label htmlFor="group" className="cursor-pointer">Group</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Group Payer Type Selection - Company or Customer */}
                {paymentType === 'group' && (
                  <div className="flex items-center gap-4">
                    <span>Payer</span>
                    <div className="flex-1" />
                    <RadioGroup
                      value={groupPayerType}
                      onValueChange={(value) => {
                        setGroupPayerType(value);
                        if (value === 'company') {
                          setSelectedGroupCustomer(null);
                        } else {
                          setSelectedCompany(null);
                        }
                      }}
                      className="flex gap-4"
                      disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="company" id="payer-company" />
                        <Label htmlFor="payer-company" className="cursor-pointer">Company</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="customer" id="payer-customer" />
                        <Label htmlFor="payer-customer" className="cursor-pointer">Customer</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Company Selection Combobox */}
                {paymentType === 'group' && groupPayerType === 'company' && (
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Popover open={companySearchOpen} onOpenChange={setCompanySearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={companySearchOpen}
                            className="w-full justify-between cursor-pointer"
                            disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                          >
                            {selectedCompany ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span>{selectedCompany.name}</span>
                              </div>
                            ) : (
                              "Select company..."
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput
                              placeholder="Search companies..."
                              value={companySearchQuery}
                              onValueChange={setCompanySearchQuery}
                            />
                            <CommandList>
                              <CommandEmpty>No company found.</CommandEmpty>
                              <CommandGroup>
                                {companies.map((company) => (
                                  <CommandItem
                                    key={company._id}
                                    value={company.name}
                                    onSelect={() => {
                                      setSelectedCompany(company);
                                      setCompanySearchOpen(false);
                                      setCompanySearchQuery('');
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCompany?._id === company._id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{company.name}</span>
                                      {company.abn && (
                                        <span className="text-xs text-muted-foreground">ABN: {company.abn}</span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setAddCompanySheetOpen(true)}
                      disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                      className="cursor-pointer"
                      title="Add new company"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Customer Selection Button (for group payments by customer) */}
                {paymentType === 'group' && groupPayerType === 'customer' && (
                  <Button
                    variant="outline"
                    className="w-full justify-between cursor-pointer"
                    disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                    onClick={() => setGroupCustomerSheetOpen(true)}
                  >
                    {selectedGroupCustomer ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{selectedGroupCustomer.name}</span>
                      </div>
                    ) : (
                      "Select customer..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                )}

                {/* Group Info Message - Company */}
                {paymentType === 'group' && groupPayerType === 'company' && selectedCompany && (
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-md text-sm">
                    <OctagonAlert className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <div className="font-medium">Group Purchase for {selectedCompany.name}</div>
                      <div className="text-muted-foreground text-xs">
                        Customer assignments will be completed after payment via a shareable waiver link sent to {selectedCompany.contactEmail}.
                      </div>
                    </div>
                  </div>
                )}

                {/* Group Info Message - Customer */}
                {paymentType === 'group' && groupPayerType === 'customer' && selectedGroupCustomer && (
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-md text-sm">
                    <OctagonAlert className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <div className="font-medium">Group Purchase by {selectedGroupCustomer.name}</div>
                      <div className="text-muted-foreground text-xs">
                        Customer assignments will be completed after payment via a shareable waiver link sent to {selectedGroupCustomer.email}.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CUSTOMER ASSIGNMENTS - Show for products requiring waiver */}
            {requiresCustomerAssignment && paymentType === 'individual' && (
              <div className="flex flex-col gap-2">
                {(cart.products || []).flatMap((product, pIdx) => {
                  // Only show products that require waiver
                  if (!product.waiverRequired) return []
                  
                  // For class, course, membership, general - show each customer slot based on quantity
                  if (['class', 'course', 'membership', 'general'].includes(product.type)) {
                    return product.prices?.flatMap((price, priceIdx) => {
                      const qty = price.qty || 1
                      const isMinorPrice = (price.minor === true) && !(/adult/i.test(price.name || ''))
                      if (isMinorPrice) {
                        const assigned = price.customers || []
                        const remaining = Math.max(0, qty - assigned.filter(s => s && s.customer && s.dependent).length)

                      const assignedEntries = (price.customers || []).filter(c => c?.customer && c?.dependent)
                      const headerRow = (
                        <div className="flex items-center gap-2" key={`${pIdx}-${priceIdx}-minor-header`}>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-sm font-medium">{product.name}</span>
                            <span className="text-sm text-muted-foreground">({price.name})</span>
                            <div className="flex-1 border-b border-dotted border-muted-foreground/30" />
                          </div>
                          <div className="flex items-center gap-2">
                            {assignedEntries.length > 0 ? (
                              <>
                                <span className="text-sm">
                                  {assignedEntries.map((e, idx) => (
                                    <span key={idx}>
                                      {idx > 0 ? ', ' : ''}{e.dependent?.name}
                                    </span>
                                  ))}
                                  {assignedEntries.length > 0 && assignedEntries[0]?.customer?.name && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      (via {assignedEntries[0].customer.name})
                                    </span>
                                  )}
                                </span>
                                <Trash2
                                  className={`size-4 ${paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' ? 'text-muted-foreground cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-destructive'}`}
                                  onClick={() => {
                                    if (paymentStatus !== 'succeeded' && cardPaymentStatus !== 'succeeded') {
                                      setCart(draft => {
                                        // Find the product by price ID (all products are flat now)
                                        for (let prodIdx = 0; prodIdx < draft.products.length; prodIdx++) {
                                          const dProd = draft.products[prodIdx]
                                          const dPriceIndex = dProd.prices?.findIndex(p => p._id === price._id)
                                          if (dPriceIndex !== -1) {
                                            const count = dProd.prices[dPriceIndex].customers?.length || 0
                                            dProd.prices[dPriceIndex].customers = Array(count).fill(null).map(() => ({}))
                                            return
                                          }
                                        }
                                      })
                                    }
                                  }}
                                />
                              </>
                            ) : (
                              remaining > 0 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="cursor-pointer h-7"
                                  disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                                  onClick={() => {
                                    setSelectedSlot({ priceId: price._id, isMinor: true, multi: true, remaining })
                                    setShowCustomerSelection(true)
                                  }}
                                >
                                  {remaining} to assign
                                </Button>
                              ) : (
                                <span className="text-sm text-muted-foreground">All assigned</span>
                              )
                            )}
                          </div>
                        </div>
                      )

                      const slotRows = Array.from({ length: qty }, (_, slotIdx) => {
                        const customerSlot = price.customers && price.customers[slotIdx] ? price.customers[slotIdx] : {}
                        const customerData = customerSlot.customer || null
                        const dependentData = customerSlot.dependent || null
                        if (!(customerData && dependentData)) return null // hide unassigned rows
                        return (
                          <div className="flex items-center gap-2" key={`${pIdx}-${priceIdx}-minor-${slotIdx}`}>
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Minor {slotIdx + 1}</span>
                              <div className="flex-1 border-b border-dotted border-muted-foreground/30" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{dependentData.name}<span className="text-xs text-muted-foreground ml-1">(via {customerData.name})</span></span>
                              <Trash2
                                className={`size-4 ${paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' ? 'text-muted-foreground cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-destructive'}`}
                                onClick={() => {
                                  if (paymentStatus !== 'succeeded' && cardPaymentStatus !== 'succeeded') {
                                    setCart(draft => {
                                      // Find the product by price ID (all products are flat now)
                                      for (let prodIdx = 0; prodIdx < draft.products.length; prodIdx++) {
                                        const dProd = draft.products[prodIdx]
                                        const dPriceIndex = dProd.prices?.findIndex(p => p._id === price._id)
                                        if (dPriceIndex !== -1) {
                                          dProd.prices[dPriceIndex].customers[slotIdx] = {}
                                          return
                                        }
                                      }
                                    })
                                  }
                                }}
                              />
                            </div>
                          </div>
                        )
                      }).filter(Boolean)

                      // Only show the single youth line; hide per-slot rows
                      return [headerRow]
                      }

                      // Adult slots stay with + Customer
                      return Array.from({ length: qty }, (_, slotIdx) => {
                        console.log(`🎨 Rendering customer slot for ${product.name} (${price.name}) slot ${slotIdx}:`, {
                          hasCustomersArray: !!price.customers,
                          customersLength: price.customers?.length,
                          slotData: price.customers?.[slotIdx],
                          customerName: price.customers?.[slotIdx]?.customer?.name
                        })
                        const customerSlot = price.customers && price.customers[slotIdx] ? price.customers[slotIdx] : {}
                        const customerData = customerSlot.customer || null
                        console.log(`  👤 Customer data:`, customerData?.name || 'NO CUSTOMER')
                        return (
                          <div className="flex items-center gap-2" key={`${pIdx}-${priceIdx}-${slotIdx}`}>
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-sm font-medium">{product.name}</span>
                              <span className="text-sm text-muted-foreground">({price.name}{qty > 1 ? ` - Slot ${slotIdx + 1}` : ''})</span>
                              <div className="flex-1 border-b border-dotted border-muted-foreground/30" />
                            </div>
                            <div className="flex items-center gap-2">
                              {customerData ? (
                                <>
                                  <span className="text-sm">{customerData.name}</span>
                                  <Trash2
                                    className={`size-4 ${paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' ? 'text-muted-foreground cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-destructive'}`}
                                    onClick={() => {
                                      if (paymentStatus !== 'succeeded' && cardPaymentStatus !== 'succeeded') {
                                        setCart(draft => {
                                          // Find the product by price ID (all products are flat now)
                                          for (let prodIdx = 0; prodIdx < draft.products.length; prodIdx++) {
                                            const dProd = draft.products[prodIdx]
                                            const dPriceIndex = dProd.prices?.findIndex(p => p._id === price._id)
                                            if (dPriceIndex !== -1) {
                                              dProd.prices[dPriceIndex].customers[slotIdx] = {}
                                              return
                                            }
                                          }
                                        })
                                      }
                                    }}
                                  />
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedSlot({ priceId: price._id, slotIdx, isMinor: false })
                                    setShowCustomerSelection(true)
                                  }}
                                  disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                                  className="cursor-pointer h-7 text-xs"
                                >
                                  <Plus className="size-3" />
                                  Customer
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })
                  }
                  return []
                })}

                {/* Show main customer if there are shop items with waiver requirement */}
                {cart.products.some(p => p.type === 'shop' && p.waiverRequired) && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm font-medium">Shop Items</span>
                      <span className="text-sm text-muted-foreground">(Customer)</span>
                      <div className="flex-1 border-b border-dotted border-muted-foreground/30" />
                    </div>
                    <div className="flex items-center gap-2">
                      {cart.customer ? (
                        <>
                          <span className="text-sm">{cart.customer.name}</span>
                          <Trash2 
                            className={`size-4 ${
                              paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' 
                                ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                                : 'cursor-pointer hover:text-destructive'
                            }`}
                            onClick={() => {
                              if (paymentStatus !== 'succeeded' && cardPaymentStatus !== 'succeeded') {
                                setCart(draft => {
                                  draft.customer = null
                                })
                                // Snapshot removed
                              }
                            }}
                          />
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not assigned</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SHOP/GENERAL CUSTOMER CONNECTION - Show for shop/general products (no waiver required) */}
            {isShopOnly && !requiresCustomerAssignment && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="font-medium">Customer</span>
                    <div className="flex-1 border-b border-dotted border-muted-foreground/30" />
                  </div>
                  <div className="flex items-center gap-2">
                    {cart.customer ? (
                      <>
                        <span>
                          {cart.customer.name}
                        </span>
                        <Trash2
                          className={`size-4 ${paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' ? 'text-muted-foreground cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-destructive'}`}
                          onClick={() => {
                            if (paymentStatus !== 'succeeded' && cardPaymentStatus !== 'succeeded') {
                              setCart(draft => {
                                draft.customer = null
                              })
                            }
                          }}
                        />
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSlot({ isShopCustomer: true })
                          setShowCustomerSelection(true)
                        }}
                        disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                        className="cursor-pointer h-7 text-xs"
                      >
                        <Plus className="size-3" />
                        Customer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Credit Section - Show when customer has credit balance */}
            {cart.customer && ((customerCredits?.balance || cart.customer?.credits?.balance || 0) > 0 || cart.adjustments?.credits?.amount > 0) && (
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex flex-row gap-4 items-center">
                  <div className="">Credit (${(customerCredits?.balance || cart.customer?.credits?.balance || 0).toFixed(2)})</div>
                  <div className="flex-1" />
                  <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <NumberInput
                        min={0}
                        max={(() => {
                          const availableCredits = customerCredits?.balance || cart.customer?.credits?.balance || 0;
                          const subtotalAfterDiscounts = cart.subtotal - (cart.adjustments?.discounts?.total || 0) + (cart.adjustments?.surcharges?.total || 0);
                          return Math.min(availableCredits, subtotalAfterDiscounts);
                        })()}
                        step={0.01}
                        value={cart.adjustments?.credits?.amount}
                        onChange={(value) => {
                          // Update credit amount in cart adjustments
                          const creditAmount = value === null || value === undefined ? null : value;
                          setCart(draft => {
                            if (!draft.adjustments) {
                              draft.adjustments = {};
                            }
                            if (!draft.adjustments.credits) {
                              draft.adjustments.credits = {
                                customerId: cart.customer._id,
                                amount: null
                              };
                            }
                            draft.adjustments.credits.amount = creditAmount;
                            
                            // Recalculate totals with credit applied to subtotal before tax
                            const subtotalAfterDiscounts = draft.subtotal - (draft.adjustments?.discounts?.total || 0) + (draft.adjustments?.surcharges?.total || 0);
                            const subtotalAfterCredits = Math.max(0, subtotalAfterDiscounts - (creditAmount || 0));
                            const newTax = subtotalAfterCredits * 0.1; // 10% GST
                            draft.tax = parseFloat(newTax.toFixed(2));
                            draft.total = subtotalAfterCredits + draft.tax;
                          });
                        }}
                        placeholder="0.00"
                        className="w-24"
                        disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        const availableCredits = customerCredits?.balance || cart.customer?.credits?.balance || 0;
                        // Calculate the actual subtotal after discounts/surcharges to determine max credit
                        const subtotalAfterDiscounts = cart.subtotal - (cart.adjustments?.discounts?.total || 0) + (cart.adjustments?.surcharges?.total || 0);
                        // Max credit is either available balance or the subtotal after discounts (can't exceed what needs to be paid)
                        const maxCredit = Math.min(availableCredits, subtotalAfterDiscounts);
                        
                        setCart(draft => {
                          if (!draft.adjustments) {
                            draft.adjustments = {};
                          }
                          if (!draft.adjustments.credits) {
                            draft.adjustments.credits = {
                              customerId: cart.customer._id,
                              amount: 0
                            };
                          }
                          draft.adjustments.credits.amount = maxCredit;
                          
                          // Recalculate totals with max credit applied to subtotal before tax
                          const draftSubtotalAfterDiscounts = draft.subtotal - (draft.adjustments?.discounts?.total || 0) + (draft.adjustments?.surcharges?.total || 0);
                          const subtotalAfterCredits = Math.max(0, draftSubtotalAfterDiscounts - maxCredit);
                          const newTax = subtotalAfterCredits * 0.1; // 10% GST
                          draft.tax = parseFloat(newTax.toFixed(2));
                          draft.total = subtotalAfterCredits + draft.tax;
                        });
                        
                        toast.success(`Applied $${maxCredit.toFixed(2)} in credits`);
                      }}
                      disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
                      className="px-3"
                    >
                      Max
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Email Receipt Section - Show when payment succeeds and either no customer email OR shop-only with auto receipt disabled */}
            {/* Hide for invoice payments since invoice is already emailed to customer */}
            {(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') &&
             tab !== 'invoice' &&
             (
               // Show if no customer email
               (!cart.customer?.email) ||
               // OR if shop-only products with auto receipt disabled and customer has email
               (hasOnlyShopProducts && !orgSettings.autoReceiptShop && cart.customer?.email)
             ) &&
             !requiresCustomerAssignment && (
              <div className="mt-4 space-y-2">
                <Separator orientation="vertical" className="h-[1px] bg-muted" />
                <div className="flex items-center gap-2">
                  <span>Email Receipt</span>
                  <Mail className="size-4 text-muted-foreground" />
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
            disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' || paymentType === 'group'}
            className={paymentType === 'group' ? 'opacity-50 cursor-not-allowed' : ''}
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
              disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded' || hasMembershipProducts || paymentType === 'group'}
              className={hasMembershipProducts || paymentType === 'group' ? 'opacity-50 cursor-not-allowed' : ''}
              onClick={() => setCashInput(0.00)}
            >
              Cash
            </TabsTrigger>
            {hasMembershipProducts && !(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') && (
              <div className="absolute inset-0 cursor-not-allowed" />
            )}
          </div>
          <TabsTrigger
            value="invoice"
            disabled={paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded'}
          >
            Invoice
          </TabsTrigger>
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
                        <span className="text-xs text-primary">Connected</span>
                      </>
                    )}
                    {terminalStatus === 'disconnected' && (
                      <>
                        <WifiOff className="size-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">No Terminal</span>
                      </>
                    )}
                    {(terminalStatus === 'checking' || terminalStatus === 'discovering' || terminalStatus === 'connecting') && (
                      <>
                        <Loader2 className="size-4 animate-spin text-chart-4" />
                        <span className="text-xs text-chart-4">
                          {terminalStatus === 'checking' ? 'Checking...' : 
                           terminalStatus === 'discovering' ? 'Discovering...' : 'Connecting...'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Buttons - Show for zero-dollar even without Stripe */}
              {(stripeEnabled || cart.total === 0) && (
              <div className="flex flex-col gap-2">
                <Button
                  disabled={
                    // For zero-dollar transactions, only check basic conditions
                    cart.total === 0 ? (
                      paymentStatus === 'succeeded' || 
                      cardPaymentStatus === 'succeeded' || 
                      isCollectingPayment || 
                      cart.products.length === 0 || 
                      needsCustomerAssignment
                    ) : (
                      // For regular transactions, require terminal connection
                      terminalStatus === 'checking' ||
                      terminalStatus === 'discovering' ||
                      terminalStatus === 'connecting' ||
                      // Only disable if not disconnected AND one of these conditions is true
                      (terminalStatus !== 'disconnected' && (
                        terminalStatus !== 'connected' || 
                        paymentStatus === 'succeeded' || 
                        cardPaymentStatus === 'succeeded' || 
                        isCollectingPayment || 
                        cart.products.length === 0 || 
                        needsCustomerAssignment
                      ))
                    )
                  }
                  onClick={async () => {
                    // For zero-dollar transactions, skip terminal checks
                    if (cart.total === 0) {
                      try {
                        setIsCollectingPayment(true)
                        await collectPayment(); // This will detect $0 and use zero-dollar endpoint
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
                      return;
                    }
                    
                    // If no terminals configured, navigate to terminal settings
                    if (!hasTerminals) {
                      router.push('/manage/terminals');
                      return;
                    }
                    
                    // If terminal is disconnected and terminals exist, retry connection
                    if (terminalStatus === 'disconnected') {
                      // Reset retry counter and attempting flag on manual retry
                      setTerminalRetryCount(0);
                      setTerminalRetryExhausted(false);
                      isAttemptingConnection.current = false;

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
                    cart.total === 0 ? 'Process Free Transaction' :
                    terminalStatus === 'connected' ?
                      (cardPaymentStatus === 'collecting' ? 'Waiting for Card...' :
                       cardPaymentStatus === 'processing' ? 'Processing...' :
                       cardPaymentStatus === 'creating' ? 'Creating Payment...' :
                       isCollectingPayment ? 'Starting...' : 'Collect Payment') :
                      terminalStatus === 'checking' ? 'Checking...' :
                      terminalStatus === 'connecting' ? 'Connecting...' :
                      terminalStatus === 'discovering' ? 'Discovering...' :
                      !hasTerminals ? 'Setup Terminal' :
                      terminalRetryExhausted ? 'Connection Failed - Setup Terminal' :
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

                {/* Return to Shop Button - only enabled after successful payment */}
                <Button
                  className="cursor-pointer"
                  onClick={() => {
                    router.push('/shop')
                  }}
                  disabled={
                    !(paymentStatus === 'succeeded' || cardPaymentStatus === 'succeeded') ||
                    (cardPaymentStatus === 'succeeded' && !transactionId) // Still finalizing
                  }
                >
                  Return to Shop
                </Button>
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
                  {/* Debug logging for Accept button */}
                  {console.log('💰 Accept button disabled check:', {
                    noProducts: cart.products.length === 0,
                    insufficientCash: parseFloat(changeInfo.received) < cart.total,
                    cashReceived: changeInfo.received,
                    total: cart.total,
                    alreadySucceeded: paymentStatus === 'succeeded',
                    processing: isProcessingCash,
                    needsCustomer: needsCustomerAssignment,
                    paymentType,
                    isCompany: paymentType === 'company',
                    hasCompany: !!selectedCompany,
                    FINAL_DISABLED: cart.products.length === 0 ||
                      parseFloat(changeInfo.received) < cart.total ||
                      paymentStatus === 'succeeded' ||
                      isProcessingCash ||
                      needsCustomerAssignment
                  })}
                  <Button
                    className="w-full h-12"
                    disabled={
                      cart.products.length === 0 ||
                      // For company payments, skip the cash requirement check
                      (paymentType !== 'company' && parseFloat(changeInfo.received) < cart.total) ||
                      // For company payments, require a company to be selected
                      (paymentType === 'company' && !selectedCompany) ||
                      paymentStatus === 'succeeded' ||
                      isProcessingCash ||
                      // For company payments, skip customer assignment requirement
                      (paymentType !== 'company' && needsCustomerAssignment)
                    }
                    onClick={async () => {
                      setIsProcessingCash(true);
                      try {
                        let tx;

                        if (paymentType === 'company') {
                          // Company payment - zero payment upfront
                          const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments/company', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              cart,
                              company: selectedCompany,
                              paymentType: 'company'
                            }),
                          });

                          if (!res.ok) {
                            throw new Error('Failed to process company payment');
                          }

                          tx = await res.json();
                        } else {
                          // Regular cash payment
                          tx = await receiveCash({ input: cashInput });
                        }

                        // console.log(cart)
                        setPaymentStatus(tx.transaction.status);

                        // Store transaction ID for receipt sending
                        if (tx.transaction && tx.transaction._id) {
                          setTransactionId(tx.transaction._id);
                        }

                        // Mark that we have a successful payment (PIN will be removed on navigation)
                        if (tx.transaction.status === 'succeeded') {
                          hasSuccessfulPayment.current = true;
                          if (paymentType === 'company') {
                            toast.success(`Company purchase recorded! Waiver link sent to ${selectedCompany.contactEmail}`);
                          }
                        }

                        markCartAsStale();
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
                     className="w-full h-12 cursor-pointer"
                     onClick={() => {
                       router.push('/shop')
                     }}
                     disabled={
                       isProcessingCash ||
                       paymentStatus === 'processing' ||
                       (paymentStatus === 'succeeded' && !transactionId) // Still finalizing
                     }
                   >
                     Return to Shop
                   </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="invoice">
          <Card>
            <CardContent className="flex flex-col gap-2">
              <div className="text-center py-2">
                <div className="text-sm font-medium">Invoice</div>
                <div className="text-xs text-muted-foreground">
                  Invoice will be emailed to the customer for payment online.
                </div>
              </div>

              <div className="bg-muted rounded-md p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">
                    {paymentType === 'group'
                      ? (groupPayerType === 'company'
                          ? (selectedCompany?.name || 'Not selected')
                          : (selectedGroupCustomer?.name || 'Not selected'))
                      : (cart.customer?.name || 'Not selected')
                    }
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Contact:</span>
                  <span className="font-medium">
                    {paymentType === 'group'
                      ? (groupPayerType === 'company'
                          ? (selectedCompany?.contactEmail || '-')
                          : (selectedGroupCustomer?.email || '-'))
                      : (cart.customer?.email || '-')
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">${cart.total?.toFixed(2) || '0.00'}</span>
                </div>
              </div>

              <Button
                className="w-full cursor-pointer"
                disabled={
                  cart.products.length === 0 ||
                  (paymentType === 'group'
                    ? (groupPayerType === 'company' ? !selectedCompany : !selectedGroupCustomer)
                    : !cart.customer?._id
                  ) ||
                  paymentStatus === 'succeeded' ||
                  isProcessingCash
                }
                onClick={async () => {
                  setIsProcessingCash(true);
                  try {
                    let recipientEmail, recipientName, invoiceCustomer, invoiceCompany, invoicePaymentType;

                    if (paymentType === 'group') {
                      recipientEmail = groupPayerType === 'company'
                        ? selectedCompany?.contactEmail
                        : selectedGroupCustomer?.email;
                      recipientName = groupPayerType === 'company'
                        ? selectedCompany?.name
                        : selectedGroupCustomer?.name;
                      invoiceCompany = groupPayerType === 'company' ? selectedCompany : null;
                      invoiceCustomer = groupPayerType === 'customer' ? selectedGroupCustomer : null;
                      invoicePaymentType = groupPayerType === 'company' ? 'company' : 'customer-invoice';
                    } else {
                      // Individual payment - use cart customer
                      recipientEmail = cart.customer?.email;
                      recipientName = cart.customer?.name;
                      invoiceCompany = null;
                      invoiceCustomer = cart.customer;
                      invoicePaymentType = 'customer-invoice';
                    }

                    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments/company', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        cart,
                        company: invoiceCompany,
                        customer: invoiceCustomer,
                        paymentType: invoicePaymentType
                      }),
                    });

                    if (!res.ok) {
                      throw new Error('Failed to process invoice');
                    }

                    const tx = await res.json();
                    setPaymentStatus(tx.transaction.status);

                    if (tx.transaction && tx.transaction._id) {
                      setTransactionId(tx.transaction._id);
                    }

                    if (tx.transaction.status === 'succeeded') {
                      hasSuccessfulPayment.current = true;
                      toast.success(`Invoice created! Invoice sent to ${recipientEmail}`);
                    }

                    markCartAsStale();
                  } catch (error) {
                    console.error('Invoice processing failed:', error);
                    toast.error(`Invoice failed: ${error.message}`);
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
                  'Invoice Created'
                ) : (
                  'Create Invoice'
                )}
              </Button>
              <Button
                className="cursor-pointer"
                onClick={() => router.push('/shop')}
                disabled={
                  isProcessingCash ||
                  paymentStatus === 'processing' ||
                  (paymentStatus === 'succeeded' && !transactionId)
                }
              >
                Return to Shop
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CustomerSelectionSheet
        open={showCustomerSelection}
        onOpenChange={setShowCustomerSelection}
        onConfirm={handleCustomerSelection}
        selectedSlot={selectedSlot}
        singleSelection={true}
        waiverRequired={hasWaiverRequiredProducts}
      />

      {/* Customer Selection Sheet for Group Payments */}
      <CustomerSelectionSheet
        open={groupCustomerSheetOpen}
        onOpenChange={setGroupCustomerSheetOpen}
        onConfirm={(selection) => {
          setSelectedGroupCustomer(selection.customer);
          setGroupCustomerSheetOpen(false);
        }}
        selectedSlot={{ isMinor: false }}
        singleSelection={true}
        waiverRequired={false}
      />

      <DiscountPinDialog
        open={showDiscountPinDialog}
        onOpenChange={setShowDiscountPinDialog}
        onSuccess={handleDiscountPinSuccess}
        permission="discount:custom"
      />

      <AddCompanySheet
        open={addCompanySheetOpen}
        setOpen={setAddCompanySheetOpen}
        onCompanyAdded={(company) => {
          setSelectedCompany(company);
          setAddCompanySheetOpen(false);
          setCompanies(prev => [company, ...prev]); // Add to list
        }}
      />

    </div>
  )
}
