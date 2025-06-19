'use client'
import { useRef, useState } from 'react';

export function useCash({ cart }) {

  const calcChange = async ({ input }) => {
    const received = parseFloat(input) || 0;
    const change = Math.max(0, received - cart.total);
    return {
      received: received.toFixed(2),
      change: change.toFixed(2),
    };
  }

  const receiveCash = async ({ input, customer }) => {
    const received = parseFloat(input) || 0;
    const change = Math.max(0, received - cart.total);

    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments/cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({received, change, cart, customer}),
    });

    if (!res.ok) {
      throw new Error('Failed to process cash payment');
    }

    const transaction = await res.json();
    console.log(transaction)
    return transaction;
  };

  return {
    calcChange,
    receiveCash,
  };
}