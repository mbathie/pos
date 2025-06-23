// import { useCallback } from 'react';

export function useHandler({product, setProduct}) {

  const setQty = async ({ type }) => {
    setProduct(draft => {
      if (type === '+') {
        draft.qty = (draft.qty ?? 0) + 1;
      } else if (type === '-') {
        draft.qty = Math.max(0, (draft.qty ?? 0) - 1);
      }
    });
  }

  // const getCategories = async ({menu}) => {
  //   const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?${menu}`)
  //   const categories = await res.json()
  //   return categories
  // }

  const getCategory = async ({name}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${name}`)
    const cat = await res.json()
    return cat
  }

  const getProducts = async ({category}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${category._id}/products`)
    const products = await res.json()
    return products
  }

  const selectPrice = ({ vIdx, pIdx }) => {
    setProduct(draft => {
      draft.variations?.forEach(variation => {
        variation.prices?.forEach(price => {
          price.selected = false;
        });
      });

      const selectedVariation = draft.variations?.[vIdx];
      if (selectedVariation?.prices?.[pIdx]) {
        selectedVariation.prices[pIdx].selected = true;
      }
    });
  };

  // const selectMod = async ({ setProduct, mcIdx, mIdx, mName }) => {
  //   setProduct(draft => {
  //     const modCat = draft.modCats?.[mcIdx];
  //     const selectedMod = modCat?.mods?.[mIdx];

  //     if (!modCat || !selectedMod) return;

  //     if (!modCat.multi) {
  //       modCat.mods.forEach((mod, index) => {
  //         if (!mod.enabled)
  //           return
  //         if (mName == mod.name)
  //           mod.selected = !mod.selected
  //         else
  //           mod.selected = false
  //       });
  //     } else {
  //       // Multi-select: toggle normally
  //       selectedMod.selected = !selectedMod.selected;
  //     }
  //   });
  // };

  // const getProductTotal = ({ product }) => {
  //   let total = 0;

  //   // Sum selected variation values
  //   if (product?.variations) {
  //     product.variations.forEach(v => {
  //       if (v.selected) {
  //         total += parseFloat(v.amount) || 0;
  //       }
  //     });
  //   }

  //   // Sum enabled modifiers
  //   if (product?.modCats) {
  //     product.modCats.forEach(cat => {
  //       cat.mods?.forEach(mod => {
  //         if (mod.selected) {
  //           total += parseFloat(mod.amount) || 0;
  //         }
  //       });
  //     });
  //   }

    // Multiply by quantity (default to 1 if undefined)
    // return total * (product.qty || 1);
  // };

  return { getProducts, getCategory, selectPrice, setQty }
}