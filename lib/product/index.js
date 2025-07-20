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