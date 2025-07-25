export async function cleanupProduct({product}) {
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
    price: null
  };

  if (product?.variations?.length) {
    product.variations.forEach(v => {
      v.prices?.forEach(price => {
        const qty = price.qty ?? 0;
        if (qty > 0) {
        // if (price.selected) {
        //   const qty = price.qty ?? 0;
          amount.subtotal += qty * (parseFloat(price.value) || 0);
          item.price = price;
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


export async function calcCartValueClass({ product }) {
  // console.log(product)
  const amount = {
    subtotal: 0,
    tax: 0,
    total: 0,
    discount: 0
  };

  const item = {
    price: null,
    selectedTime: null
  };

  if (product?.variations?.length) {
    product.variations.forEach(v => {
      v.prices?.forEach(price => {
        const qty = price.qty ?? 0;
        // Count selected times
        const selectedTimeCount = v.timesCalc?.filter(t => t.selected)?.length || 0;
        amount.subtotal += qty * (parseFloat(price.value) || 0) * selectedTimeCount;
        item.price = price;
        item.selectedTime = price.selectedTime;
      });
    });
  }

  // amount.subtotal *= product.qty || 0;
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
    price: null
  };

  if (product?.variations?.length) {
    product.variations.forEach(v => {
      v.prices?.forEach(price => {
        const qty = price.qty ?? 0;
        if (qty > 0) {
          amount.subtotal += qty * (parseFloat(price.value) || 0);
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

export async function calcCartValueShop({product}) {
  const amount = {
    subtotal: 0,
    tax: 0,
    total: 0,
    discount: 0
  };

  const item = {
    variation: "",
    modCats: [],
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

  // Add selected modifiers to subtotal and collect in item.modCats and item.mods
  if (product?.modCats) {
    product.modCats.forEach(cat => {
      const selectedMods = cat.mods?.filter(mod => mod.selected);
      if (selectedMods?.length) {
        selectedMods.forEach(mod => {
          amount.subtotal += parseFloat(mod.amount) || 0;
        });
        item.modCats.push({
          ...cat,
          mods: selectedMods
        });
        item.mods.push(...selectedMods);
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