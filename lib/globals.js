import { create } from 'zustand'
import { persist } from 'zustand/middleware';
import { calcCartTotals, applyDiscountToProduct, calcProductDiscount } from './cart'
import { produce } from 'immer';

/*
 * DISCOUNT APPLICATION LOGIC:
 * 
 * AUTOMATIC APPLICATION (when adding products to cart):
 * - Only applies discounts with specific product restrictions (discount.products[] must contain product ID)
 * - Ignores "global" discounts (where discount.products[] is empty) - these are manual-only
 * - Only applies if no discount is currently active on the cart
 * 
 * MANUAL APPLICATION (payment page):
 * - Applies discounts with specific product restrictions to matching products only
 * - Applies "global" discounts (where discount.products[] is empty) to ALL products in cart
 * - Can replace existing discounts (one discount per cart rule)
 */

// Helper function to get all active discounts
async function getActiveDiscounts() {
  try {
    const response = await fetch('/api/discounts?current=true');
    if (!response.ok) return [];
    
    const discounts = await response.json();
    return discounts || [];
  } catch (error) {
    console.error('Error fetching active discounts:', error);
    return [];
  }
}

// Helper function to check if a product is eligible for a specific discount
function isProductEligibleForDiscount(product, discount, isAutomatic = false) {
  // If discount.products is empty or undefined
  if (!discount.products || discount.products.length === 0) {
    // For automatic application (adding to cart), ignore global discounts
    if (isAutomatic) {
      return false;
    }
    // For manual application (payment page), apply to all products
    return true;
  }
  
  // If discount.products has items, product must be in the list
  return discount.products.includes(product._id);
}

// Helper function to find the best discount for a product from a list of discounts
function findBestDiscountForProduct(product, discounts, isAutomatic = false) {
  let bestDiscount = null;
  let maxDiscountAmount = 0;
  
  for (const discount of discounts) {
    // Check if this product is eligible for the discount
    if (!isProductEligibleForDiscount(product, discount, isAutomatic)) continue;
    
    // Calculate potential discount amount using the existing function
    const discountAmount = calcProductDiscount(product, discount);
    
    // Keep track of the best discount
    if (discountAmount > maxDiscountAmount) {
      maxDiscountAmount = discountAmount;
      bestDiscount = discount;
    }
  }
  
  return bestDiscount;
}

export const useGlobals = create(persist((set, get) => ({
  
  cart: {
    products: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    location: null,
    discount: null,
    discountAmount: 0
  },
  addToCart: async (product) => {
    // Get all active discounts to check for automatic application
    const activeDiscounts = await getActiveDiscounts();
    
    set((state) => {
      let processedProduct = product;
      let discountToApply = state.cart.discount; // Existing cart discount
      
      // Only check for automatic discount if no discount is currently applied
      if (!discountToApply && activeDiscounts.length > 0) {
        // Find the best eligible discount for this product (automatic mode)
        discountToApply = findBestDiscountForProduct(product, activeDiscounts, true);
        
        if (discountToApply) {
          console.log(`🎯 Auto-applying discount "${discountToApply.name}" to new product "${product.name}"`);
        }
      }
      
      // Add the product to cart first
      let products = [...state.cart.products, product];
      
      // If we have a discount to apply (existing or new), apply it to all eligible products
      if (discountToApply) {
        const isNewDiscount = discountToApply !== state.cart.discount;
        products = products.map(p => {
          // Check if this product is eligible for the discount
          // Use automatic mode only if this is a newly found discount
          const eligibilityMode = isNewDiscount;
          if (isProductEligibleForDiscount(p, discountToApply, eligibilityMode)) {
            return applyDiscountToProduct(p, discountToApply);
          } else {
            // If product is not eligible, make sure it has no discount applied
            if (p.amount && p.amount.discount > 0) {
              const originalSubtotal = p.amount.subtotal + p.amount.discount;
              const newTax = +(originalSubtotal * 0.10).toFixed(2);
              const newTotal = +(originalSubtotal + newTax).toFixed(2);
              
              return {
                ...p,
                amount: {
                  ...p.amount,
                  discount: 0,
                  tax: newTax,
                  total: newTotal
                }
              };
            }
            return p;
          }
        });
      }
      
      const totals = calcCartTotals(products);
      const cartLocation = state.cart.location || state.location || null;
      
      console.log('🛒 Cart updated:', {
        productAdded: product.name,
        discountApplied: discountToApply?.name || 'none',
        totalProducts: products.length,
        cartTotal: totals.total
      });
      
      return {
        cart: {
          products,
          location: cartLocation,
          discount: discountToApply,
          ...totals
        }
      }
    });
  },
  removeFromCart: (pIdx) => set((state) => {
    const filteredProducts = state.cart.products.filter((_, idx) => idx !== pIdx);
    const totals = calcCartTotals(filteredProducts);
    return {
      cart: {
        products: filteredProducts,
        discount: state.cart.discount,
        ...totals
      }
    }
  }),
  setCart: (updater) => set((state) => ({
    cart: produce(state.cart, updater),
  })),
  
  applyDiscount: (discount) => set((state) => {
    console.log(`📋 Manually applying discount "${discount.name}" to cart`);
    
    // First, check if any products in the cart are eligible for this discount
    const eligibleProducts = state.cart.products.filter(product => 
      isProductEligibleForDiscount(product, discount, false)
    );
    
    if (eligibleProducts.length === 0) {
      console.log(`❌ No products in cart are eligible for discount "${discount.name}"`);
      
      // Return current state unchanged with error info
      return {
        ...state,
        _lastDiscountError: `Discount "${discount.name}" doesn't apply to any products in your cart.`
      };
    }
    
    // Apply discount to all eligible products in the cart
    const updatedProducts = state.cart.products.map(product => {
      // Check if this product is eligible for the discount using our helper function
      // Manual application allows global discounts (isAutomatic = false)
      if (isProductEligibleForDiscount(product, discount, false)) {
        return applyDiscountToProduct(product, discount);
      } else {
        // Remove any existing discount from ineligible products
        if (product.amount && product.amount.discount > 0) {
          const originalSubtotal = product.amount.subtotal + product.amount.discount;
          const newTax = +(originalSubtotal * 0.10).toFixed(2);
          const newTotal = +(originalSubtotal + newTax).toFixed(2);
          
          return {
            ...product,
            amount: {
              ...product.amount,
              discount: 0,
              tax: newTax,
              total: newTotal
            }
          };
        }
        return product;
      }
    });
    
    const totals = calcCartTotals(updatedProducts);
    
    console.log(`✅ Discount applied:`, {
      discountName: discount.name,
      discountType: discount.type,
      discountValue: discount.value,
      eligibleProducts: eligibleProducts.length,
      totalDiscountAmount: totals.discountAmount,
      cartTotal: totals.total
    });
    
    return {
      cart: {
        ...state.cart,
        products: updatedProducts,
        discount,
        ...totals
      },
      _lastDiscountSuccess: {
        name: discount.name,
        productCount: eligibleProducts.length
      },
      _lastDiscountError: null
    }
  }),
  
  removeDiscount: () => set((state) => {
    const discountName = state.cart.discount?.name || 'unknown';
    console.log(`🗑️ Removing discount "${discountName}" from cart`);
    
    // Remove discount from all products
    const updatedProducts = state.cart.products.map(product => ({
      ...product,
      amount: {
        ...product.amount,
        discount: 0,
        tax: +(product.amount.subtotal * 0.10).toFixed(2),
        total: +(product.amount.subtotal + (product.amount.subtotal * 0.10)).toFixed(2)
      }
    }));
    
    const totals = calcCartTotals(updatedProducts);
    
    console.log(`✅ Discount removed. New cart total: $${totals.total.toFixed(2)}`);
    
    return {
      cart: {
        ...state.cart,
        products: updatedProducts,
        discount: null,
        ...totals
      },
      _lastDiscountRemoved: discountName,
      _lastDiscountSuccess: null,
      _lastDiscountError: null
    }
  }),

  breadcrumb: [],
  pushBreadcrumb: (item) => set((state) => {
    const exists = state.breadcrumb.some(b => b.href === item.href);
    if (exists) return { breadcrumb: state.breadcrumb };
    return { breadcrumb: [...state.breadcrumb, item] };
  }),
  resetBreadcrumb: (item) => set({ breadcrumb: item ? [item] : [] }),
  clearBreadcrumb: () => set({ breadcrumb: [] }),
  resetCart: () => set({
    cart: {
      products: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      discount: null,
      discountAmount: 0
    },
  }),

  location: {},
  setLocation: (location) => set({ location }),

  locations: [],
  setLocations: (locations) => set({ locations }),

  employee: {},
  setEmployee: (employee) => set({ employee }),

  // Terminal linking
  terminal: null, // Stores the linked terminal._id
  setTerminal: (terminal) => set({ terminal }),
  clearTerminal: () => set({ terminal: null }),

  // Discount feedback (for UI to handle toasts)
  _lastDiscountSuccess: null,
  _lastDiscountError: null,
  _lastDiscountRemoved: null,
  getLastDiscountFeedback: () => {
    const state = get();
    return {
      success: state._lastDiscountSuccess,
      error: state._lastDiscountError,
      removed: state._lastDiscountRemoved
    };
  },
  clearDiscountFeedback: () => set({
    _lastDiscountSuccess: null,
    _lastDiscountError: null,
    _lastDiscountRemoved: null
  }),

  // Low stock tracking
  hasLowStock: false,
  lowStockCount: 0,
  lowStockProducts: [],
  setLowStockData: ({ hasLowStock, lowStockCount, lowStockProducts = [] }) => set({
    hasLowStock,
    lowStockCount,
    lowStockProducts
  }),
  clearLowStockData: () => set({
    hasLowStock: false,
    lowStockCount: 0,
    lowStockProducts: []
  }),

}), {
  name: 'pos', // localStorage key
}));
