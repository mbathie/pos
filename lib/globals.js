import { create } from 'zustand'
import { persist } from 'zustand/middleware';
import { calcCartTotals, applyDiscountToProduct, calcProductDiscount } from './cart'
import { produce } from 'immer';

// Helper function to check for available discounts for a product
async function checkForEligibleDiscounts(product) {
  try {
    const response = await fetch('/api/discounts?current=true');
    if (!response.ok) return null;
    
    const discounts = await response.json();
    
    // Find the best discount for this product
    let bestDiscount = null;
    let maxDiscountAmount = 0;
    
    for (const discount of discounts) {
      // Check if this product is eligible for the discount
      const isEligible = discount.products && discount.products.includes(product._id);
      if (!isEligible) continue;
      
      // Calculate potential discount amount
      let discountAmount = 0;
      if (discount.type === 'percent') {
        discountAmount = (product.amount?.subtotal || 0) * discount.value / 100;
      } else if (discount.type === 'amount') {
        discountAmount = Math.min(discount.value, product.amount?.subtotal || 0);
      }
      
      // Keep track of the best discount
      if (discountAmount > maxDiscountAmount) {
        maxDiscountAmount = discountAmount;
        bestDiscount = discount;
      }
    }
    
    return bestDiscount;
  } catch (error) {
    console.error('Error checking for eligible discounts:', error);
    return null;
  }
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
    // Check for eligible discounts first
    const eligibleDiscount = await checkForEligibleDiscounts(product);
    
    set((state) => {
      let processedProduct = product;
      let discountToApply = state.cart.discount; // Existing cart discount
      
      // If we found an eligible discount and no discount is currently applied,
      // or if the new discount is better than the current one
      if (eligibleDiscount) {
        if (!discountToApply) {
          // No current discount, apply the eligible one
          discountToApply = eligibleDiscount;
        } else {
          // Compare discounts to see which is better for this product
          const currentDiscountAmount = calcProductDiscount(product, discountToApply);
          const newDiscountAmount = calcProductDiscount(product, eligibleDiscount);
          
          if (newDiscountAmount > currentDiscountAmount) {
            discountToApply = eligibleDiscount;
          }
        }
      }
      
      // Apply the best discount to the product
      if (discountToApply) {
        processedProduct = applyDiscountToProduct(product, discountToApply);
      }
      
      const products = [...state.cart.products, processedProduct];
      
      // If we're applying a new discount, update existing products too
      let finalProducts = products;
      if (discountToApply && discountToApply !== state.cart.discount) {
        finalProducts = products.map(p => 
          p === processedProduct ? p : applyDiscountToProduct(p, discountToApply)
        );
      }
      
      const totals = calcCartTotals(finalProducts);
      const cartLocation = state.cart.location || state.location || null;
      
      console.log('Cart updated with discount:', discountToApply?.name || 'none');
      
      return {
        cart: {
          products: finalProducts,
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
    // Apply discount only to eligible products
    const updatedProducts = state.cart.products.map(product => {
      // Check if this product is eligible for the discount
      // If discount.products is empty/undefined, discount applies to all products
      // If discount.products has items, product must be in the list
      const hasProductRestrictions = discount.products && discount.products.length > 0;
      const isEligible = !hasProductRestrictions || discount.products.includes(product._id);
      
      if (isEligible) {
        return applyDiscountToProduct(product, discount);
      } else {
        // Remove any existing discount from ineligible products
        if (product.amount) {
          const originalSubtotal = product.amount.subtotal + (product.amount.discount || 0);
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
    return {
      cart: {
        ...state.cart,
        products: updatedProducts,
        discount,
        ...totals
      }
    }
  }),
  
  removeDiscount: () => set((state) => {
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
    return {
      cart: {
        ...state.cart,
        products: updatedProducts,
        discount: null,
        ...totals
      }
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

}), {
  name: 'pos', // localStorage key
}));
