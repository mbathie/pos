export function useHandler({setProduct}) {

  const setQty = async ({ pIdx, type }) => {
    setProduct(draft => {
      // For general products, prices are at the root level
      const price = draft.prices?.[pIdx];
      if (!price) return;

      if (type === '+') {
        price.qty = (price.qty ?? 0) + 1;
      } else if (type === '-') {
        price.qty = Math.max(0, (price.qty ?? 0) - 1);
      }
    });
  }

  // const setQty = async ({ type }) => {
  //   setProduct(draft => {
  //     if (type === '+') {
  //       draft.qty = (draft.qty ?? 0) + 1;
  //     } else if (type === '-') {
  //       draft.qty = Math.max(0, (draft.qty ?? 0) - 1);
  //     }
  //   });
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

  // const selectPrice = ({ vIdx, pIdx }) => {
  //   setProduct(draft => {
  //     // draft.variations?.forEach(variation => {
  //     //   variation.prices?.forEach(price => {
  //     //     price.selected = false;
  //     //   });
  //     // });

  //     const selectedVariation = draft.variations?.[vIdx];
  //     if (selectedVariation?.prices?.[pIdx]) {
  //       selectedVariation.prices[pIdx].selected = !selectedVariation.prices[pIdx].selected;
  //     }
  //   });
  // };

  return { getProducts, getCategory, setQty }
}