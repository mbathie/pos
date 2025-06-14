import { create } from 'zustand'
import { persist } from 'zustand/middleware';
import { calcCartTotals } from './cart'

export const useGlobals = create(persist((set) => ({
  
  cart: {
    products: [],
    subtotal: 0,
    tax: 0,
    total: 0
  },
  addToCart: (product) => set((state) => {
    const products = [...state.cart.products, product]
    const totals = calcCartTotals(products)
    return {
      cart: {
        products,
        ...totals
      }
    }
  }),
  removeFromCart: (productId) => set((state) => {
    const filteredProducts = state.cart.products.filter(item => item._id !== productId);
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

}), {
  name: 'pos', // localStorage key
}));
