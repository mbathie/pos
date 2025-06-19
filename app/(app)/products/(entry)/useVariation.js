import { useCallback } from 'react'

export function useEffectHook(setProducts) {
  const updateVariations = useCallback((updater) => {
    setProducts((draft) => {
      updater(draft);
    });
  }, [setProducts]);

  const changeName = (productIdx, variationIdx, value) => {
    updateVariations((draft) => {
      draft[productIdx].variations[variationIdx].name = value;
    });
  };

  const changeUnit = (productIdx, variationIdx, unit) => {
    updateVariations((draft) => {
      draft[productIdx].variations[variationIdx].unit = unit;
    });
  };

  const addVariation = (productIdx) => {
    updateVariations((draft) => {
      const product = draft[productIdx];

      if (!Array.isArray(product.variations))
        product.variations = []

      const basePrices =
        product.variations[0]?.prices?.map((p) => ({ ...p, value: 0 })) || [];

      product.variations.push({
        name: '',
        unit: '',
        prices: basePrices,
      });
    });
  };

  const saveVariation = (productIdx, variationIdx, updated) => {
    updateVariations((draft) => {
      draft[productIdx].variations[variationIdx] = { ...draft[productIdx].variations[variationIdx], ...updated };
    });
  };

  const deleteVariation = async (productIdx, variationIdx, product) => {
    const updatedProduct = {
      ...product,
      variations: product.variations.filter((_, i) => i !== variationIdx),
    };

    updateVariations((draft) => {
      draft[productIdx].variations.splice(variationIdx, 1);
    });

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${product._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: updatedProduct }),
    });
  };

  const addPrice = (productIdx, name) => {
    updateVariations((draft) => {
      const variations = draft[productIdx].variations;
      variations.forEach(variation => {
        variation.prices.push({
          name,
          value: 0
        });
      });
    });
  };

  return {
    changeName,
    changeUnit,
    addVariation,
    saveVariation,
    deleteVariation,
    addPrice
  };
}