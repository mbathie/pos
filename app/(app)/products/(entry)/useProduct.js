import { useCallback } from 'react';

export function useProduct(setProducts) {
  const updateProductState = useCallback((updater) => {
    setProducts((draft) => {
      updater(draft);
    });
  }, [setProducts]);

  const updateProductKey = ({ pIdx, key, value }) => {

    setProducts(draft => {
      const product = draft[pIdx];
      if (!product) return;

      product[key] = value;
      product.updated = true;
    });
  }

  const updateProduct = async (product) => {
    console.log(product)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });

      if (!res.ok)
        throw new Error(`Failed to update product: ${res.statusText}`);

      const updated = await res.json();

      updateProductState((draft) => {
        const index = draft.findIndex((p) => p._id === updated._id);
        if (index !== -1) {
          draft[index] = updated;
        }
      });

      return updated;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const addProduct = useCallback((name, type) => {
    // Prevent adding a new product if name is empty or if createProduct is being used
    if (!name) return;

    const newProduct = {
      name,
      type,
    };

    // Initialize with prices array for general products, variations for others
    if (type === 'general') {
      newProduct.prices = [];
    } else {
      newProduct.variations = [];
    }

    setProducts(prev => [newProduct, ...prev]);
  }, [setProducts]);

  const createProduct = async (categoryName, product) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${categoryName}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });

      const created = await res.json();
      // console.log(created.product)
      return created.product;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return { updateProduct, updateProductKey, addProduct, createProduct };
}