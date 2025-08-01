export function useMembership({product, setProduct}) {

  const setQty = (variationIdx, priceIdx, qty) => {
    setProduct(draft => {
      if (draft?.variations?.[variationIdx]?.prices?.[priceIdx]) {
        draft.variations[variationIdx].prices[priceIdx].qty = qty;
        
        // Update total product quantity
        let totalQty = 0;
        draft.variations.forEach(v => {
          v.prices?.forEach(p => {
            totalQty += p.qty || 0;
          });
        });
        draft.qty = totalQty;
      }
    });
  };

  return {
    setQty
  }
}