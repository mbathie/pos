// import { useCallback } from 'react';

export function useHandler() {

  const getCategories = async ({menu}) => {
    const res = await fetch(`/api/categories?${menu}`)
    const categories = await res.json()
    return categories
  }

  const getProducts = async ({category}) => {
    const res = await fetch(`/api/categories/${category._id}/products`)
    const products = await res.json()
    return products
  }

  const selectVariation = async ({ setProduct, vIdx }) => {
    setProduct(draft => {
      draft.variations.forEach((v, i) => {
        v.selected = i === vIdx ? !v.selected : false;
      });
    });
  };

  const selectMod = async ({ setProduct, mcIdx, mIdx }) => {
    setProduct(draft => {
      const mod = draft.modCats?.[mcIdx]?.mods?.[mIdx];
      if (mod) {
        mod.selected = !mod.selected;
      }
    });
  };

  const getProductTotal = ({ product }) => {
    let total = 0;

    // Sum selected variation values
    if (product?.variations) {
      product.variations.forEach(v => {
        if (v.selected) {
          total += parseFloat(v.amount) || 0;
        }
      });
    }

    // Sum enabled modifiers
    if (product?.modCats) {
      product.modCats.forEach(cat => {
        cat.mods?.forEach(mod => {
          if (mod.selected) {
            total += parseFloat(mod.amount) || 0;
          }
        });
      });
    }

    return total;
  };

  return { getCategories, getProducts, selectVariation, selectMod, getProductTotal }
}