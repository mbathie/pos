import { create } from 'zustand'
import { persist } from 'zustand/middleware';
import { calcCartTotals, applyDiscountToProduct } from './cart'
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
    // If there's an active discount, apply it to the product
    let processedProduct = product;
    if (state.cart.discount) {
      processedProduct = applyDiscountToProduct(product, state.cart.discount);
    }
    
    const products = [...state.cart.products, processedProduct];
    const totals = calcCartTotals(products);
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
    // Apply discount to each eligible product
    const updatedProducts = state.cart.products.map(product => 
      applyDiscountToProduct(product, discount)
    );
    
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
