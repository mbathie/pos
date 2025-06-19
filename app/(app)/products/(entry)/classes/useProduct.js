import { useCallback } from 'react';
import { generateObjectId } from '@/lib/utils';

export function useProduct({setProducts, categoryName}) {

  const saveProduct = async ({product, productIdx}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${categoryName}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
    });

    if (res.ok) {
      const savedProduct = await res.json();
      setProducts(draft => {
        draft[productIdx] = savedProduct.product;
      });
      return savedProduct.product
    }
  }

  const updateProduct = (productId, changes, productIdx) => {
    // console.log(changes)
    setProducts(draft => {
      const index = typeof productIdx === 'number' ? productIdx : draft.findIndex(p => p._id === productId);
      Object.assign(draft[index], changes);
      // draft[0].name = changes.name
    });
  }

  const updatePrice = useCallback((productId, priceId, changes) => {
    setProducts(draft => {
      const product = draft.find(p => p._id === productId);
      if (!product) return;

      const price = product.prices.find(pr => pr._id === priceId);
      if (price) {
        Object.assign(price, changes);
      }
    });
  }, [setProducts]);

  const addProduct = () => {
    const newProduct = {
      _id: generateObjectId(),
      name: '',
      categoryId: null,
      type: '',
      duration: { name: 1, unit: 'hour' },
      capacity: 0,
      prices: [],
      times: []
    };

    setProducts(draft => {
      draft.unshift(newProduct);
    });
  }

  const addPrice = useCallback((productId) => {
    setProducts(draft => {
      const product = draft.find(p => p._id === productId);
      if (!product) return;

      product.prices.push({ _id: generateObjectId(),name: "", value: "" });
    });
  }, [setProducts]);

  const addTime = ({productIdx, priceIdx}) => {
    const now = new Date();
    const start = new Date(Math.round(now.getTime() / (1000 * 60 * 5)) * (1000 * 60 * 5));

    setProducts(draft => {
      const price = draft[productIdx].prices[priceIdx];
      if (!price.times) price.times = [];
      price.times.push({ _id: generateObjectId(), start: start.toISOString(), value: "" });
    });
  }

  const updateTime = ({productIdx, priceIdx, timeIdx, changes}) => {
    setProducts(draft => {
      const price = draft[productIdx].prices[priceIdx];
      if (price && price.times && price.times[timeIdx]) {
        Object.assign(price.times[timeIdx], changes);
      }
    });
  }

  return {
    updateProduct,
    updatePrice,
    addPrice,
    saveProduct,
    addTime,
    updateTime,
    addProduct
  };
}