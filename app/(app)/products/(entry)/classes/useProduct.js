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

  const updateProductKey = ({ pIdx, key, value }) => {
    console.log(pIdx)
    console.log(key)
    console.log(value)

    setProducts(draft => {
      const product = draft[pIdx];
      if (!product) return;

      product[key] = value;
      product.updated = true;
    });
  }

  const updateVariation = useCallback((productId, priceId, changes) => {
    setProducts(draft => {
      const product = draft.find(p => p._id === productId);
      if (!product) return;

      const price = product.variations.find(pr => pr._id === priceId);
      if (price) {
        Object.assign(price, changes);
      }
    });
  }, [setProducts]);

  const addProduct = () => {
    console.log(type)
    const newProduct = {
      _id: generateObjectId(),
      name: '',
      categoryId: null,
      type: '',
      duration: { name: 1, unit: 'hour' },
      capacity: 0,
      variations: [],
    };

    setProducts(draft => {
      draft.unshift(newProduct);
    });
  }

  const addVariation = useCallback((productId) => {
    setProducts(draft => {
      const product = draft.find(p => p._id === productId);
      if (!product) return;

      product.variations.push({ _id: generateObjectId(), prices: [{ name: '', value: '' }] });
    });
  }, [setProducts]);

  const addTime = ({productIdx, variationIdx}) => {
    const now = new Date();
    const start = new Date(Math.round(now.getTime() / (1000 * 60 * 5)) * (1000 * 60 * 5));

    setProducts(draft => {
      const variation = draft[productIdx].variations[variationIdx];
      if (!variation.times) variation.times = [];
      variation.times.push({ _id: generateObjectId(), start: start.toISOString(), value: "" });
    });
  }

  const updateTime = ({productIdx, variationIdx, timeIdx, changes}) => {
    setProducts(draft => {
      const variation = draft[productIdx].variations[variationIdx];
      if (variation && variation.times && variation.times[timeIdx]) {
        Object.assign(variation.times[timeIdx], changes);
      }
    });
  }

  // Add a new price to a variation at [productIdx][variationIdx]
  const addPrice = (productIdx, variationIdx) => {
    setProducts(draft => {
      const variation = draft[productIdx]?.variations?.[variationIdx];
      if (!variation) return;
      if (!variation.prices) variation.prices = [];
      variation.prices.push({ name: '', value: '' });
    });
  }

  const updatePrice = (productId, variationId, priceIdx, key, value) => {
    setProducts(draft => {
      const product = draft.find(p => p._id === productId);
      if (!product) return;
      const variation = product.variations.find(v => v._id === variationId);
      if (!variation) return;
      if (!variation.prices || !variation.prices[priceIdx]) return;

      variation.prices[priceIdx][key] = value;
    });
  };

  const deletePrice = (productIdx, variationIdx, priceIdx) => {
    setProducts(draft => {
      const variation = draft[productIdx]?.variations?.[variationIdx];
      if (!variation || !variation.prices) return;
      variation.prices.splice(priceIdx, 1);
    });
  };

  return {
    updateProduct,
    updateProductKey,
    updateVariation,
    updatePrice,
    addVariation,
    saveProduct,
    addTime,
    updateTime,
    addProduct,
    addPrice,
    deletePrice
  };
}