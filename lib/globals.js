import { create } from 'zustand'
import { persist } from 'zustand/middleware';
import { calcCartTotals } from './cart'
import { produce } from 'immer';
import { generateObjectId } from './utils';

export const useGlobals = create(persist((set, get) => ({

  // Multi-cart system: array of carts with index tracking
  carts: [{
    products: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    location: null,
    discount: null,
    discountAmount: 0,
    stale: false,
    savedAt: null, // timestamp when cart was saved
    editingTransactionId: null // ID of transaction being edited (if any)
  }],
  currentCartIndex: 0,

  // Helper to get current cart (for backward compatibility)
  getCurrentCart: () => {
    const state = get();
    return state.carts[state.currentCartIndex] || state.carts[0];
  },
  addToCart: (product) => set((state) => {
    // If cart is stale, clear it before adding new items
    const currentIdx = state.currentCartIndex;
    let currentCart = state.carts[currentIdx];

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
        stale: false,
        savedAt: null
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

    const newCarts = [...state.carts];
    newCarts[currentIdx] = {
      products,
      location: cartLocation,
      stale: false,
      savedAt: currentCart.savedAt,
      editingTransactionId: currentCart.editingTransactionId, // Preserve editing state
      ...totals
    };

    return { carts: newCarts }
  }),
  removeFromCart: (pIdx) => set((state) => {
    const currentIdx = state.currentCartIndex;
    const currentCart = state.carts[currentIdx];
    const filteredProducts = currentCart.products.filter((_, idx) => idx !== pIdx);
    const totals = calcCartTotals(filteredProducts);

    const newCarts = [...state.carts];
    newCarts[currentIdx] = {
      ...currentCart,
      products: filteredProducts,
      ...totals
    };

    return { carts: newCarts }
  }),
  setCart: (updater) => set((state) => {
    const currentIdx = state.currentCartIndex;
    const updatedCart = produce(state.carts[currentIdx], updater);
    // Recalculate totals after cart update to ensure group pricing is applied
    const totals = calcCartTotals(updatedCart.products);

    const newCarts = [...state.carts];
    newCarts[currentIdx] = {
      ...updatedCart,
      ...totals
    };

    return { carts: newCarts };
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
  resetCart: () => set((state) => {
    const currentIdx = state.currentCartIndex;
    const newCarts = [...state.carts];
    newCarts[currentIdx] = {
      products: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      stale: false,
      savedAt: null,
      editingTransactionId: null
    };

    return {
      carts: newCarts,
      appliedAdjustments: null
    };
  }),

  // Load a group from a transaction into the cart for editing
  loadGroupForEditing: (groupProducts, transactionId) => set((state) => {
    const currentIdx = state.currentCartIndex;
    const currentCart = state.carts[currentIdx];

    // Clear existing cart if not empty
    let products = [];
    if (currentCart.stale || currentCart.products.length > 0) {
      console.log('🧹 Clearing cart before loading group for editing');
    } else {
      products = [...currentCart.products];
    }

    // Add all products from the group to cart
    groupProducts.forEach(product => {
      products.push(product);
    });

    const totals = calcCartTotals(products);
    const cartLocation = currentCart.location || state.location || null;

    console.log('📝 Loaded group for editing:', {
      transactionId,
      productCount: groupProducts.length,
      products: groupProducts.map(p => p.name)
    });

    const newCarts = [...state.carts];
    newCarts[currentIdx] = {
      products,
      location: cartLocation,
      stale: false,
      savedAt: null,
      editingTransactionId: transactionId, // Store transaction ID being edited
      ...totals
    };

    return { carts: newCarts };
  }),
  markCartAsStale: () => set((state) => {
    const currentIdx = state.currentCartIndex;
    const currentCart = state.carts[currentIdx];
    console.log('🔒 Marking cart as stale with', currentCart.products.length, 'products');

    const newCarts = [...state.carts];
    newCarts[currentIdx] = {
      ...currentCart,
      stale: true
    };

    return { carts: newCarts };
  }),

  // Multi-cart management methods
  saveCart: () => set((state) => {
    const currentIdx = state.currentCartIndex;
    const currentCart = state.carts[currentIdx];

    // Don't save empty carts
    if (currentCart.products.length === 0) {
      console.log('🚫 Cannot save empty cart');
      return state;
    }

    // Mark current cart as saved with timestamp
    const newCarts = [...state.carts];
    newCarts[currentIdx] = {
      ...currentCart,
      savedAt: Date.now()
    };

    // Add a new empty cart at position 0
    newCarts.unshift({
      products: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      location: state.location,
      discount: null,
      discountAmount: 0,
      stale: false,
      savedAt: null,
      editingTransactionId: null
    });

    console.log(`💾 Cart saved with ${currentCart.products.length} products. New blank cart created.`);

    // Switch to the new blank cart (now at index 0)
    return {
      carts: newCarts,
      currentCartIndex: 0
    };
  }),

  switchCart: (index) => set((state) => {
    if (index < 0 || index >= state.carts.length) {
      console.log(`🚫 Invalid cart index: ${index}`);
      return state;
    }

    console.log(`🔄 Switching to cart ${index}`);
    return { currentCartIndex: index };
  }),

  deleteCart: (index) => set((state) => {
    // Don't delete if it's the last cart
    if (state.carts.length === 1) {
      console.log('🚫 Cannot delete the last cart');
      return state;
    }

    const newCarts = state.carts.filter((_, idx) => idx !== index);
    let newCurrentIndex = state.currentCartIndex;

    // Adjust current index if needed
    if (index === state.currentCartIndex) {
      // If deleting current cart, switch to cart 0
      newCurrentIndex = 0;
    } else if (index < state.currentCartIndex) {
      // If deleting a cart before current, adjust index
      newCurrentIndex = state.currentCartIndex - 1;
    }

    console.log(`🗑️ Deleted cart ${index}`);

    return {
      carts: newCarts,
      currentCartIndex: newCurrentIndex
    };
  }),

  location: {},
  setLocation: (location) => set({ location }),

  locations: [],
  setLocations: (locations) => set({ locations }),

  employee: {},
  setEmployee: (employee) => set({ employee }),

  // POS setup complete flag (cached from org.posSetupComplete)
  posSetupComplete: false,
  setPosSetupComplete: (value) => set({ posSetupComplete: value }),

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
    if (!state) return;

    // Migration: Convert old single cart to carts array
    if (state.cart && !state.carts) {
      console.log('🔄 Migrating old cart structure to multi-cart system');
      state.carts = [state.cart];
      state.currentCartIndex = 0;
      delete state.cart;
    }

    // Ensure carts array exists
    if (!state.carts || !Array.isArray(state.carts)) {
      state.carts = [{
        products: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        location: null,
        discount: null,
        discountAmount: 0,
        stale: false,
        savedAt: null,
        editingTransactionId: null
      }];
      state.currentCartIndex = 0;
    }

    // Clear stale carts on app startup/reload
    state.carts = state.carts.map(cart => {
      if (cart.stale) {
        console.log('🧹 Clearing stale cart on app rehydration');
        return {
          products: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          location: cart.location,
          discount: null,
          discountAmount: 0,
          stale: false,
          savedAt: null,
          editingTransactionId: null
        };
      }
      return cart;
    });

    // Ensure currentCartIndex is valid
    if (state.currentCartIndex >= state.carts.length) {
      state.currentCartIndex = 0;
    }
  }
}));
