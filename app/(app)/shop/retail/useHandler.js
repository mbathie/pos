export function useHandler() {

  const setQty = async ({ setProduct, type }) => {
    setProduct(draft => {
      if (type === 'increment') {
        draft.qty = (draft.qty ?? 1) + 1;
      } else if (type === 'decrement') {
        draft.qty = Math.max(1, (draft.qty ?? 1) - 1);
      }
    });
  }

  const getCategories = async ({menu}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?${menu}`)
    const categories = await res.json()
    return categories
  }

  const getProducts = async ({category}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${category._id}/products`)
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

  const selectMod = async ({ setProduct, mcIdx, mIdx, mName }) => {
    setProduct(draft => {
      const modCat = draft.modCats?.[mcIdx];
      const selectedMod = modCat?.mods?.[mIdx];

      if (!modCat || !selectedMod) return;

      if (!modCat.multi) {
        modCat.mods.forEach((mod, index) => {
          if (!mod.enabled)
            return
          if (mName == mod.name)
            mod.selected = !mod.selected
          else
            mod.selected = false
        });
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

    // Sum selected modifiers from modGroupsData
    if (product?.modGroupsData) {
      product.modGroupsData.forEach(group => {
        group.mods?.forEach(mod => {
          if (mod.selected) {
            total += parseFloat(mod.price) || 0;
          }
        });
      });
    }

    // Multiply by quantity (default to 1 if undefined)
    return total * (product.qty || 1);
  };

  return { getCategories, getProducts, selectVariation, selectMod, getProductTotal, setQty }
}