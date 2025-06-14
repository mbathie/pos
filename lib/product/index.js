export async function calcCartValueShop({product}) {
  const amount = {
    subtotal: 0,
    tax: 0,
    total: 0
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