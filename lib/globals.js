import { create } from 'zustand'
import { persist } from 'zustand/middleware';
import { calcCartTotals } from './cart'
import { produce } from 'immer';

export const useGlobals = create(persist((set) => ({
  
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
    const products = [...state.cart.products, product];
    const totals = calcCartTotals(products, state.cart.discount);
    const cartLocation = state.cart.location || state.location || null;
    console.log(cartLocation)
    return {
      cart: {
        products,
        location: cartLocation,
        discount: state.cart.discount,
        ...totals
      }
    }
  }),
  removeFromCart: (pIdx) => set((state) => {
    const filteredProducts = state.cart.products.filter((_, idx) => idx !== pIdx);
    const totals = calcCartTotals(filteredProducts, state.cart.discount);
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
    const totals = calcCartTotals(state.cart.products, discount);
    return {
      cart: {
        ...state.cart,
        discount,
        ...totals
      }
    }
  }),
  
  removeDiscount: () => set((state) => {
    const totals = calcCartTotals(state.cart.products, null);
    return {
      cart: {
        ...state.cart,
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
