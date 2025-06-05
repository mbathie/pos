import { useCallback } from 'react';

export function useProduct(setProducts) {
  const updateProductState = useCallback((updater) => {
    setProducts((draft) => {
      updater(draft);
    });
  }, [setProducts]);

  const updateProduct = async (product) => {
    try {
      const res = await fetch(`/api/products/${product._id}`, {
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

  const addProduct = useCallback((name) => {
    // Prevent adding a new product if name is empty or if createProduct is being used
    if (!name) return;

    setProducts(prev => [
      {
        // id: `${crypto.randomUUID()}`,
        name,
        variations: [],
      },
      ...prev
    ]);
  }, [setProducts]);

  const createProduct = async (categoryName, product) => {
    try {
      const res = await fetch(`/api/categories/${categoryName}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });

      // return created;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return { updateProduct, addProduct, createProduct };
}