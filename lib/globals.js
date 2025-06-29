import { create } from 'zustand'
import { persist } from 'zustand/middleware';
import { calcCartTotals } from './cart'

export const useGlobals = create(persist((set) => ({
  
  cart: {
    products: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    location: null
  },
  addToCart: (product) => set((state) => {
    const products = [...state.cart.products, product];
    const totals = calcCartTotals(products);
    const cartLocation = state.cart.location || state.location || null;
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
  }),

  location: {},
  setLocation: (location) => set({ location }),

  employee: {},
  setEmployee: (employee) => set({ employee }),

}), {
  name: 'pos', // localStorage key
}));
