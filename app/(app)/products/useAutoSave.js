import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for auto-saving products with a 3-second delay
 * @param {Array} products - Array of products to monitor
 * @param {Function} updateProduct - Function to update a product on the server
 * @param {number} delay - Delay in milliseconds before auto-saving (default: 3000)
 * @returns {Object} - Contains isDirty, saving, isAnySaving, hasAnyUnsaved, and markAsSaved
 */
export function useAutoSave(products, updateProduct, delay = 3000) {
  const originalProducts = useRef({});
  const [isDirty, setIsDirty] = useState({});
  const [saving, setSaving] = useState({});
  const autoSaveTimers = useRef({});

  // Track which products have changed
  useEffect(() => {
    const updatedIsDirty = { ...isDirty };
    
    // Populate the originalProducts hash with _id as the key
    products.forEach((p) => {
      originalProducts.current[p._id] = originalProducts.current[p._id] || JSON.parse(JSON.stringify(p));
    });

    products.forEach((p) => {
      const isProductChanged = JSON.stringify(p) !== JSON.stringify(originalProducts.current[p._id]);
      updatedIsDirty[p._id] = isProductChanged || !p._id;
    });
    setIsDirty(updatedIsDirty);
  }, [products]);

  // Auto-save effect for each dirty product
  useEffect(() => {
    products.forEach((product) => {
      const productId = product._id;
      
      // Skip if product is new (no ID yet) or not dirty
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
          const updated = await updateProduct(product);
          originalProducts.current[productId] = JSON.parse(JSON.stringify(updated));
          setIsDirty(prev => ({ ...prev, [productId]: false }));
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
  }, [products, isDirty, updateProduct, delay]);

  // Check if any product is being saved or has unsaved changes
  const isAnySaving = Object.values(saving).some(s => s);
  const hasAnyUnsaved = Object.values(isDirty).some(d => d);

  // Function to manually mark a product as saved (useful after manual save)
  const markAsSaved = (productId, updatedProduct) => {
    originalProducts.current[productId] = JSON.parse(JSON.stringify(updatedProduct));
    setIsDirty(prev => ({ ...prev, [productId]: false }));
  };

  return {
    isDirty,
    saving,
    isAnySaving,
    hasAnyUnsaved,
    markAsSaved
  };
}