'use client'
import { useRef, useState } from 'react';
import { useGlobals } from '@/lib/globals'

export function useCustomer({}) {
  const { cart, setCart } = useGlobals()

  const setCustomer = ({ pIdx, vIdx, priceIdx, customer }) => {
    setCart((draft) => {
      draft.products[pIdx].variations[vIdx].prices[priceIdx].customer = customer
    })
  }

  const getCustomers = async () => {
    const result = [];

    cart.products.forEach((product, pIdx) => {
      if (product.type === 'class' || product.type === 'course') {
        product.variations?.forEach((variation, vIdx) => {
          variation.prices?.forEach((price, priceIdx) => {
            result.push({
              pIdx,
              vIdx,
              priceIdx,
              name: price.name,
              customer: price.customer
            });
          });
        });
      }
    });

    return result;
  };

  return {
    getCustomers,
    setCustomer
  };
}