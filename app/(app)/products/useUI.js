import { useEffect, useState } from 'react';

export function useUI({products, contentRefs}) {
  const [productsUI, setProductsUI] = useState({});

  const toggleExpanded = (productId) => {
    setProductsUI((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        expanded: !prev[productId]?.expanded,
      },
    }));
  };

  const toggleAll = () => {
    const allExpanded = products.every(p => productsUI[p._id]?.expanded);
    const newUI = {};
    products.forEach((p) => {
      newUI[p._id] = {
        ...productsUI[p._id],
        expanded: !allExpanded,
      };
    });
    setProductsUI(newUI);
  };

  useEffect(() => {
    const updatedUI = { ...productsUI };
    products.forEach((p) => {
      const el = contentRefs.current[p._id];
      if (el) {
        updatedUI[p._id] = updatedUI[p._id] || { expanded: false, height: 0 };
        updatedUI[p._id].height = el.scrollHeight;
      }
    });
    if (products[0]) {
      updatedUI[products[0]._id] = {
        ...updatedUI[products[0]._id],
        expanded: true,
      };
    }
    setProductsUI(updatedUI);
  }, [products]);

  return { productsUI, toggleExpanded, toggleAll };
}