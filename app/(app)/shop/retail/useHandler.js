// import { useCallback } from 'react';

export function useHandler() {

  const setQty = async ({ setProduct, type }) => {
    setProduct(draft => {
      if (type === 'increment') {
        draft.qty = (draft.qty ?? 0) + 1;
      } else if (type === 'decrement') {
        draft.qty = Math.max(0, (draft.qty ?? 0) - 1);
      }
    });
  }

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
      const modCat = draft.modCats?.[mcIdx];
      const selectedMod = modCat?.mods?.[mIdx];
      if (!modCat || !selectedMod) return;

      if (!modCat.multi) {
        if (selectedMod.selected) {
          // Toggle off if already selected
          selectedMod.selected = false;
        } else {
          // Select this mod and deselect others
          modCat.mods.forEach((mod, index) => {
            mod.selected = index === mIdx;
          });
        }
      } else {
        // Multi-select: toggle normally
        selectedMod.selected = !selectedMod.selected;
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

    // Multiply by quantity (default to 1 if undefined)
    return total * (product.qty || 1);
  };

  return { getCategories, getProducts, selectVariation, selectMod, getProductTotal, setQty }
}