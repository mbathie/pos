'use client'
import { useRef, useState } from 'react';
import { loadStripeTerminal } from '@stripe/terminal-js';

let terminalInstance = null;
let discoveredReaders = [];
let connecting = false

export function useCard({ cart }) {
  const paymentIntentId = useRef()
  const transactionId = useRef()
  const clientSecret = useRef()
  const discoveredReaders = useRef([])
  // const [ connecting, setConnecting ] = useState(false)

  const initTerminal = async () => {
    if (!terminalInstance && typeof window !== 'undefined') {
      const StripeTerminal = await loadStripeTerminal();
      if (!StripeTerminal) {
        throw new Error('StripeTerminal failed to load.');
      }

      terminalInstance = StripeTerminal.create({
        onFetchConnectionToken: async () => {
          const res = await fetch('/api/payments/token', { method: 'POST' });
          const data = await res.json();
          if (!res.ok || !data.secret) {
            throw new Error(data.error || 'Failed to fetch connection token');
          }
          console.log('Token fetched:', data);
          return data.secret;
        },
        onUnexpectedReaderDisconnect: () => {
          console.warn('Reader disconnected unexpectedly');
        },
      });
    }
    return terminalInstance;
  };

  const discoverReaders = async () => {
    const terminal = await initTerminal();

    const config = { simulated: true };
    const result = await terminal.discoverReaders(config);

    if (result.error) {
      console.error('Failed to discover readers:', result.error);
    } else if (result.discoveredReaders.length === 0) {
      console.log('No available readers.');
    } else {
      discoveredReaders.current = result.discoveredReaders;
      console.log('Discovered Readers:', discoveredReaders);
    }
  };

  const connectReader = async () => {
    if (!terminalInstance || discoveredReaders.current.length === 0) {
      console.error('Terminal not initialized or no readers discovered.');
      return;
    }

    const connected = await terminalInstance.getConnectedReader();
    console.log(connecting)
    if (connected) {
      console.log('Already connected to a reader.');
      return;
    }

    if (connecting) {
      console.log('Already Connecting')
      return
    }

    connecting = true

    const selectedReader = discoveredReaders.current[0];
    const result = await terminalInstance.connectReader(selectedReader);

    if (result.error) {
      console.error('Failed to connect:', result.error);
      connecting = false
    } else {
      console.log('Connected to reader:', result.reader.label);
      connecting = false
    }
  };

  const collectPayment = async () => {
    const res = await fetch('/api/payments/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart }),
    });
    const intent = await res.json();
    paymentIntentId.current = intent.id
    transactionId.current = intent.transactionId
    clientSecret.current = intent.clientSecret
    terminalInstance.setSimulatorConfiguration({testCardNumber: '4242424242424242'});
    terminalInstance.collectPaymentMethod(intent.clientSecret).then(function(result) {
      if (result.error) {
        // Placeholder for handling result.error
      } else {
          // log('terminal.collectPaymentMethod', result.paymentIntent);
          terminalInstance.processPayment(result.paymentIntent).then(function(result) {
          if (result.error) {
            console.log(result.error)
          } else if (result.paymentIntent) {
              // paymentIntentId.current = result.paymentIntent.id;
              // log('terminal.processPayment', result.paymentIntent);
          }
        });
      }
    });

    return intent.id

  };

  const capturePayment = async () => {

    const res = await fetch('/api/payments/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId: paymentIntentId.current,
        transactionId: transactionId.current
      }),
    });
    const intent = await res.json()
    return intent
  };

  return {
    discoverReaders,
    connectReader,
    collectPayment,
    capturePayment
  };
}
