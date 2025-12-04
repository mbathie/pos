/**
 * Calculate the derived price for a group from its base and variation products
 * @param {Array} baseProducts - Array of base product objects or IDs
 * @param {Array} variationProducts - Array of variation product objects or IDs
 * @param {Array} availableProducts - Array of all available products to look up prices (optional)
 * @returns {number} - Total derived price
 */
export function calculateDerivedPrice(baseProducts, variationProducts, availableProducts = []) {
  let total = 0;

  // Add base products prices
  (baseProducts || []).forEach(p => {
    const product = availableProducts.find(ap => ap._id === (p._id || p).toString()) || p;
    const price = product.variations?.[0]?.amount ?? product.amount ?? product.value ?? product.price ?? 0;
    total += Number(price) || 0;
  });

  // Add variation products prices
  (variationProducts || []).forEach(p => {
    const product = availableProducts.find(ap => ap._id === (p._id || p).toString()) || p;
    const price = product.variations?.[0]?.amount ?? product.amount ?? product.value ?? product.price ?? 0;
    total += Number(price) || 0;
  });

  return total;
}

export async function cleanupProduct({product}) {
  // For new structure (classes/courses with prices array)
  if (product.prices && !product.variations) {
    return {
      ...product,
      prices: product.prices?.filter(price => (price.qty ?? 0) > 0) || []
    };
  }
  
  // For old structure (variations) - keeping for other product types
  return {
    ...product,
    variations: product.variations?.map(v => ({
      ...v,
      prices: v.prices?.filter(price => (price.qty ?? 0) > 0) || []
    }))
  };
}

export async function calcCartValueCourse({ product }) {
  const amount = {
    subtotal: 0,
    tax: 0,
    total: 0,
    discount: 0
  };

  const item = {
    prices: []
  };

  // New structure: prices directly on product (courses are a flat fee, not per-session)
  if (product?.prices?.length) {
    product.prices.forEach(price => {
      const qty = price.qty ?? 0;
      if (qty > 0) {
        amount.subtotal += qty * (parseFloat(price.value) || 0);
        item.prices.push(price);
      }
    });
  }

  amount.tax = +(amount.subtotal * 0.10).toFixed(2);
  amount.total = +(amount.subtotal + amount.tax).toFixed(2);

  return {
    ...product,
    amount,
    item
  };
}


export async function calcCartValueClass({ product }) {
  const amount = {
    subtotal: 0,
    tax: 0,
    total: 0,
    discount: 0
  };

  const item = {
    prices: [],
    selectedTimes: []
  };

  // New structure: prices and selectedTimes directly on product
  if (product?.prices?.length) {
    product.prices.forEach(price => {
      const qty = price.qty ?? 0;
      if (qty > 0) {
        // Count selected times (if any selected, multiply by the count, otherwise just the base price)
        const selectedTimeCount = product.selectedTimes?.length || 1;
        amount.subtotal += qty * (parseFloat(price.value) || 0) * selectedTimeCount;
        item.prices.push(price);
      }
    });
    
    // Store selected times
    if (product.selectedTimes?.length) {
      item.selectedTimes = product.selectedTimes;
    }
  }

  amount.tax = +(amount.subtotal * 0.10).toFixed(2);
  amount.total = +(amount.subtotal + amount.tax).toFixed(2);

  return {
    ...product,
    amount,
    item
  };
}

export async function calcCartValueCasual({ product }) {
  const amount = {
    subtotal: 0,
    tax: 0,
    total: 0,
    discount: 0
  };

  const item = {
    variation: "",
    unit: "",
    price: null
  };

  if (product?.variations?.length) {
    product.variations.forEach(v => {
      v.prices?.forEach(price => {
        const qty = price.qty ?? 0;
        if (qty > 0) {
          amount.subtotal += qty * (parseFloat(price.value) || 0);
          item.price = price;
          item.variation = v.name;
          item.unit = v.unit;
        }
      });
    });
  }

  amount.tax = +(amount.subtotal * 0.10).toFixed(2);
  amount.total = +(amount.subtotal + amount.tax).toFixed(2);

  return {
    ...product,
    amount,
    item
  };
}

export async function calcCartValueGeneral({ product }) {
  const amount = {
    subtotal: 0,
    tax: 0,
    total: 0,
    discount: 0
  };

  const item = {
    prices: []
  };

  // Calculate from simple prices array for general products
  if (product?.prices?.length) {
    product.prices.forEach(price => {
      const qty = price.qty ?? 0;
      if (qty > 0) {
        amount.subtotal += qty * (parseFloat(price.value) || 0);
        
        // Initialize customers array with empty customer objects based on quantity
        const priceWithCustomers = {
          ...price,
          customers: price.customers || Array(qty).fill().map(() => ({ customer: null }))
        };
        
        item.prices.push(priceWithCustomers);
      }
    });
  }

  amount.tax = +(amount.subtotal * 0.10).toFixed(2);
  amount.total = +(amount.subtotal + amount.tax).toFixed(2);

  // Return the product with properly initialized customers in prices
  return {
    ...product,
    prices: item.prices, // Override prices with the ones that have customers initialized
    amount,
    item
  };
}

export async function calcCartValueMembership({ product }) {
  const amount = {
    subtotal: 0,
    tax: 0,
    total: 0,
    discount: 0
  };

  const item = {
    variation: "",
    unit: "",
    price: null
  };

  // Calculate subtotal from variations and prices with quantities
  if (product?.variations?.length) {
    product.variations.forEach(v => {
      v.prices?.forEach(price => {
        const qty = price.qty ?? 0;
        amount.subtotal += qty * (parseFloat(price.value) || 0);
        if (qty > 0) {
          item.price = price;
          item.variation = v.name;
          item.unit = v.unit;
        }
      });
    });
  }

  // Calculate tax and total
  amount.tax = +(amount.subtotal * 0.10).toFixed(2);
  amount.total = +(amount.subtotal + amount.tax).toFixed(2);

  return {
    ...product,
    amount,
    item
  };
}

export async function calcCartValueShop({product}) {
  const amount = {
    subtotal: 0,
    tax: 0,
    total: 0,
    discount: 0
  };

  const item = {
    variation: "",
    modGroups: [],
    mods: []
  };

  // Add selected variation to subtotal and set item.variation
  if (product?.variations) {
    product.variations.forEach(v => {
      if (v.selected) {
        const variationAmount = parseFloat(v.amount) || 0;
        amount.subtotal += variationAmount;
        item.variation = v.name;
      }
    });
  }

  // Add modifiers with qty > 0 from modGroupsData - snapshot the full data
  if (product?.modGroupsData) {
    product.modGroupsData.forEach(group => {
      const modsWithQty = group.mods?.filter(mod => (mod.qty || 0) > 0);
      if (modsWithQty?.length) {
        modsWithQty.forEach(mod => {
          amount.subtotal += (parseFloat(mod.price) || 0) * (mod.qty || 0);
          item.mods.push({
            ...mod,
            groupName: group.name
          });
        });
        // Store the entire group with mods for cart snapshot
        item.modGroups.push({
          _id: group._id,
          name: group.name,
          allowMultiple: group.allowMultiple,
          required: group.required,
          mods: group.mods.map(mod => ({
            _id: mod._id,
            name: mod.name,
            price: mod.price,
            qty: mod.qty || 0,
            isDefault: mod.isDefault
          }))
        });
      }
    });
  }

  amount.subtotal *= product.qty || 1;

  // Calculate tax and total
  amount.tax = +(amount.subtotal * 0.10).toFixed(2); // 10% GST
  amount.total = +(amount.subtotal + amount.tax).toFixed(2);

  return {
    ...product,
    amount,
    item
  };
}

export async function updateProductQuantities(cartProducts) {
  const { Product } = await import('@/models');
  
  try {
    // Process each product in the cart
    for (const cartProduct of cartProducts || []) {
      if (!cartProduct._id || !cartProduct.qty || cartProduct.qty <= 0) {
        continue; // Skip if no product ID or no quantity to deduct
      }

      // Find the product in the database
      const product = await Product.findById(cartProduct._id);
      
      if (!product) {
        console.warn(`Product not found: ${cartProduct._id}`);
        continue;
      }

      // Check if product has qty field and it's not null/undefined
      if (product.qty !== null && product.qty !== undefined && product.qty > 0) {
        const newQty = Math.max(0, product.qty - cartProduct.qty);
        
        await Product.findByIdAndUpdate(cartProduct._id, {
          qty: newQty
        });

        console.log(`Updated product ${product.name}: ${product.qty} -> ${newQty} (reduced by ${cartProduct.qty})`);
      }
    }
  } catch (error) {
    console.error('Error updating product quantities:', error);
    // Don't throw error to avoid breaking the payment flow
  }
}