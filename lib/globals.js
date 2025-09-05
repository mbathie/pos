import { create } from 'zustand'
import { persist } from 'zustand/middleware';
import { calcCartTotals } from './cart'
import { produce } from 'immer';

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
  addToCart: (product) => set((state) => {
    // Simply add product to cart without any discount logic
    const products = [...state.cart.products, product];
    const totals = calcCartTotals(products);
    const cartLocation = state.cart.location || state.location || null;
    
    console.log('🛒 Cart updated:', {
      productAdded: product.name,
      totalProducts: products.length,
      cartTotal: totals.total
    });
    
    return {
      cart: {
        products,
        location: cartLocation,
        ...totals
      }
    }
  }),
  removeFromCart: (pIdx) => set((state) => {
    const filteredProducts = state.cart.products.filter((_, idx) => idx !== pIdx);
    const totals = calcCartTotals(filteredProducts);
    return {
      cart: {
        products: filteredProducts,
        ...totals
      }
    }
  }),
  setCart: (updater) => set((state) => ({
    cart: produce(state.cart, updater),
  })),
  
  // Adjustment state - used only for display on payment page
  appliedAdjustments: null,
  setAppliedAdjustments: (adjustments) => set({ appliedAdjustments: adjustments }),
  clearAppliedAdjustments: () => set({ appliedAdjustments: null }),

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
      total: 0
    },
    appliedAdjustments: null
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
