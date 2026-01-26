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
      // Process tags to extract IDs if they are populated objects
      const productData = {
        ...product,
        tags: (product.tags || []).map(t => t._id || t),
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productData }),
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
    // Import generateObjectId at the top of this file
    const { generateObjectId } = require('@/lib/utils');
    
    // Prevent adding a new product if name is empty or if createProduct is being used
    if (!name) return;

    const newProductId = generateObjectId();
    const newProduct = {
      _id: newProductId,
      name,
      type,
      isNew: true, // Flag to identify new products
    };

    // Initialize with prices array for general products, variations for others
    if (type === 'general') {
      newProduct.prices = [];
    } else {
      newProduct.variations = [];
    }

    setProducts(prev => [newProduct, ...prev]);
    return newProductId; // Return the ID so the caller can use it
  }, [setProducts]);

  const createProduct = async (categoryName, product) => {
    try {
      // Process tags to extract IDs if they are populated objects
      const productData = {
        ...product,
        tags: (product.tags || []).map(t => t._id || t),
      };

      // Create product directly without category (products are organized via POS interfaces now)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productData }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create product: ${res.statusText}`);
      }

      const created = await res.json();
      return created.product;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return { updateProduct, updateProductKey, addProduct, createProduct };
}