import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for auto-saving products with a 3-second delay
 * @param {Array} products - Array of products to monitor
 * @param {Function} setProducts - Function to update products state
 * @param {Function} updateProduct - Function to update a product on the server
 * @param {Function} createProduct - Function to create a product on the server (optional)
 * @param {string} categoryName - Category name for creating products (optional)
 * @param {number} delay - Delay in milliseconds before auto-saving (default: 3000)
 * @param {Function} onProductCreated - Callback when a new product is created (optional)
 * @returns {Object} - Contains isDirty, saving, isAnySaving, hasAnyUnsaved, and markAsSaved
 */
export function useAutoSave(products, setProducts, updateProduct, createProduct = null, categoryName = null, delay = 3000, onProductCreated = null) {
  const originalProducts = useRef({});
  const [isDirty, setIsDirty] = useState({});
  const [saving, setSaving] = useState({});
  const autoSaveTimers = useRef({});

  // Track which products have changed
  useEffect(() => {
    const updatedIsDirty = { ...isDirty };
    
    // Populate the originalProducts hash with _id as the key
    products.forEach((p) => {
      if (p && p._id) {
        originalProducts.current[p._id] = originalProducts.current[p._id] || JSON.parse(JSON.stringify(p));
      }
    });

    products.forEach((p) => {
      if (!p || !p._id) {
        // New products without ID are always considered dirty
        return;
      }
      const isProductChanged = JSON.stringify(p) !== JSON.stringify(originalProducts.current[p._id]);
      updatedIsDirty[p._id] = isProductChanged;
    });
    setIsDirty(updatedIsDirty);
  }, [products]);

  // Auto-save effect for each dirty product
  useEffect(() => {
    products.forEach((product, index) => {
      const productId = product._id;
      
      // Skip if not dirty
      if (!productId || !isDirty[productId]) {
        // Clear any existing timer for this product
        if (autoSaveTimers.current[productId]) {
          clearTimeout(autoSaveTimers.current[productId]);
          delete autoSaveTimers.current[productId];
        }
        return;
      }

      // Clear existing timer if any
      if (autoSaveTimers.current[productId]) {
        clearTimeout(autoSaveTimers.current[productId]);
      }

      // Set new auto-save timer
      autoSaveTimers.current[productId] = setTimeout(async () => {
        setSaving(prev => ({ ...prev, [productId]: true }));
        
        try {
          let updated;
          
          // If product is new, create it; otherwise update it
          if (product.isNew && createProduct && categoryName) {
            // Remove the isNew flag and temporary _id before creating
            const { isNew, _id, ...productToCreate } = product;
            updated = await createProduct(categoryName, productToCreate);
            
            // Update the product in the array with the server response
            if (updated && updated._id) {
              // Replace the temporary product with the created one
              setProducts(draft => {
                const idx = draft.findIndex(p => p._id === productId);
                if (idx !== -1) {
                  draft[idx] = updated;
                }
              });
              
              // Notify parent component about the new product ID
              if (onProductCreated) {
                onProductCreated(productId, updated._id);
              }
            }
          } else {
            updated = await updateProduct(product);
          }
          
          if (updated) {
            originalProducts.current[updated._id] = JSON.parse(JSON.stringify(updated));
            setIsDirty(prev => ({ ...prev, [productId]: false, [updated._id]: false }));
          }
        } catch (error) {
          console.error('Auto-save error:', error);
        } finally {
          setSaving(prev => ({ ...prev, [productId]: false }));
        }
      }, delay);
    });

    // Cleanup timers on unmount
    return () => {
      Object.values(autoSaveTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, [products, isDirty, updateProduct, createProduct, categoryName, delay, setProducts, onProductCreated]);

  // Check if any product is being saved or has unsaved changes
  const isAnySaving = Object.values(saving).some(s => s);
  const hasAnyUnsaved = Object.values(isDirty).some(d => d);

  // Function to manually mark a product as saved (useful after manual save)
  const markAsSaved = (productId, updatedProduct) => {
    if (productId && updatedProduct) {
      originalProducts.current[productId] = JSON.parse(JSON.stringify(updatedProduct));
      setIsDirty(prev => ({ ...prev, [productId]: false }));
    }
  };

  return {
    isDirty,
    saving,
    isAnySaving,
    hasAnyUnsaved,
    markAsSaved
  };
}