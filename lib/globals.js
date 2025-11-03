import { create } from 'zustand'
import { persist } from 'zustand/middleware';
import { calcCartTotals } from './cart'
import { produce } from 'immer';
import { generateObjectId } from './utils';

export const useGlobals = create(persist((set, get) => ({
  
  cart: {
    products: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    location: null,
    discount: null,
    discountAmount: 0,
    stale: false
  },
  addToCart: (product) => set((state) => {
    // If cart is stale, clear it before adding new items
    let currentCart = state.cart;
    if (currentCart.stale) {
      console.log('🧹 STALE CART DETECTED - Clearing cart before adding new product');
      console.log('🧹 Previous cart had', currentCart.products.length, 'products:', currentCart.products.map(p => p.name));
      currentCart = {
        products: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        location: currentCart.location,
        discount: null,
        discountAmount: 0,
        stale: false
      };
      console.log('🧹 Cart cleared successfully');
    } else {
      console.log('🛒 Cart is not stale, current products:', currentCart.products.length);
    }

    // Initialize customers array for products that need it
    const processedProduct = { ...product };
    
    // ALWAYS generate new unique IDs for prices, even if they already have one
    if (processedProduct.prices) {
      processedProduct.prices = processedProduct.prices.map(price => {
        // Remove any existing _id and generate a fresh unique ID for this cart instance
        const { _id: oldId, ...priceWithoutId } = price;
        const newPriceId = generateObjectId();
        console.log(`🆔 Generating new price ID: ${newPriceId} for price: ${price.name} (replaced: ${oldId || 'none'})`);
        
        const priceWithId = {
          ...priceWithoutId,
          _id: newPriceId // Always use a new ID to distinguish duplicate products
        };
        
        if (['membership', 'class', 'course', 'general'].includes(processedProduct.type) && price.qty > 0 && !price.customers) {
          return {
            ...priceWithId,
            customers: Array(price.qty).fill(null).map(() => ({}))
          };
        }
        return priceWithId;
      });
    }
    
    // Simply add product to cart without any discount logic
    const products = [...currentCart.products, processedProduct];
    const totals = calcCartTotals(products);
    const cartLocation = currentCart.location || state.location || null;
    
    console.log('🛒 Cart updated:', {
      productAdded: product.name,
      totalProducts: products.length,
      cartTotal: totals.total,
      pricesWithIds: processedProduct.prices?.map(p => ({ name: p.name, _id: p._id }))
    });
    
    return {
      cart: {
        products,
        location: cartLocation,
        stale: false,
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
  setCart: (updater) => set((state) => {
    const updatedCart = produce(state.cart, updater);
    // Recalculate totals after cart update to ensure group pricing is applied
    const totals = calcCartTotals(updatedCart.products);
    return {
      cart: {
        ...updatedCart,
        ...totals
      }
    };
  }),
  
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
      total: 0,
      stale: false
    },
    appliedAdjustments: null
  }),
  markCartAsStale: () => set((state) => {
    console.log('🔒 Marking cart as stale with', state.cart.products.length, 'products');
    return {
      cart: {
        ...state.cart,
        stale: true
      }
    };
  }),

  location: {},
  setLocation: (location) => set({ location }),

  locations: [],
  setLocations: (locations) => set({ locations }),

  employee: {},
  setEmployee: (employee) => set({ employee }),

  device: null,
  setDevice: (device) => set({ device }),

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

  // Stripe Terminal connection state
  terminalConnection: {
    isConnected: false,
    readerId: null,
    readerLabel: null,
    connectionTimestamp: null,
    isSimulated: false,
    locationId: null
  },
  setTerminalConnection: (connectionData) => set({
    terminalConnection: {
      isConnected: true,
      readerId: connectionData.readerId,
      readerLabel: connectionData.readerLabel,
      connectionTimestamp: Date.now(),
      isSimulated: connectionData.isSimulated || false,
      locationId: connectionData.locationId || null
    }
  }),
  clearTerminalConnection: () => set({
    terminalConnection: {
      isConnected: false,
      readerId: null,
      readerLabel: null,
      connectionTimestamp: null,
      isSimulated: false,
      locationId: null
    }
  }),
  isTerminalConnectionValid: () => {
    const state = get();
    if (!state.terminalConnection.isConnected) return false;

    // Consider connection valid if it's less than 24 hours old
    const MAX_CONNECTION_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const connectionAge = Date.now() - (state.terminalConnection.connectionTimestamp || 0);
    return connectionAge < MAX_CONNECTION_AGE;
  },

  // Transaction filters state (persisted across page navigations)
  transactionFilters: {
    status: 'all',
    paymentMethod: 'all',
    dateRange: '24',
    searchQuery: '',
    selectedLocation: null,
    sortConfig: { key: 'createdAt', direction: 'desc' },
    currentPage: 1
  },
  setTransactionFilters: (filters) => set((state) => ({
    transactionFilters: {
      ...state.transactionFilters,
      ...filters
    }
  })),
  clearTransactionFilters: () => set({
    transactionFilters: {
      status: 'all',
      paymentMethod: 'all',
      dateRange: '24',
      searchQuery: '',
      selectedLocation: null,
      sortConfig: { key: 'createdAt', direction: 'desc' },
      currentPage: 1
    }
  }),

}), {
  name: 'pos', // localStorage key
  onRehydrateStorage: () => (state) => {
    // Clear stale carts on app startup/reload
    if (state?.cart?.stale) {
      console.log('🧹 Clearing stale cart on app rehydration');
      state.cart = {
        products: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        location: state.cart.location,
        discount: null,
        discountAmount: 0,
        stale: false
      };
    }
  }
}));
