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
  const [terminalStatus, setTerminalStatus] = useState('disconnected') // disconnected, connecting, connected

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
    setTerminalStatus('discovering')
    const terminal = await initTerminal();

    const config = { simulated: true };
    const result = await terminal.discoverReaders(config);

    if (result.error) {
      console.error('Failed to discover readers:', result.error);
      setTerminalStatus('disconnected')
    } else if (result.discoveredReaders.length === 0) {
      console.log('No available readers.');
      setTerminalStatus('disconnected')
    } else {
      discoveredReaders.current = result.discoveredReaders;
      console.log('Discovered Readers:', discoveredReaders);
      setTerminalStatus('disconnected') // Ready to connect
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
      setTerminalStatus('connected')
      return;
    }

    if (connecting) {
      console.log('Already Connecting')
      return
    }

    connecting = true
    setTerminalStatus('connecting')

    const selectedReader = discoveredReaders.current[0];
    const result = await terminalInstance.connectReader(selectedReader);

    if (result.error) {
      console.error('Failed to connect:', result.error);
      connecting = false
      setTerminalStatus('disconnected')
    } else {
      console.log('Connected to reader:', result.reader.label);
      connecting = false
      setTerminalStatus('connected')
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

  const cancelPayment = async () => {
    // First try to cancel any active terminal collection
    if (terminalInstance) {
      try {
        console.log('🚫 Attempting to cancel terminal collection...')
        const cancelResult = await terminalInstance.cancelCollectPaymentMethod()
        if (cancelResult.error) {
          console.warn('Terminal cancellation warning:', cancelResult.error.message)
          // Don't throw here - the error might just mean no active collection
        } else {
          console.log('✅ Terminal collection cancelled')
        }
      } catch (error) {
        console.warn('Terminal cancellation error (continuing):', error.message)
        // Continue to server-side cancellation even if terminal cancel fails
      }
    }

    // Then cancel the payment intent on the server if we have one
    if (paymentIntentId.current) {
      const res = await fetch('/api/payments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId.current
        }),
      });

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to cancel payment')
      }

      const result = await res.json()
      console.log('✅ Payment intent cancelled:', result)
      return result
    }

    // If no payment intent, just return success (terminal was cancelled above)
    return { message: 'Collection cancelled' }
  };

  return {
    discoverReaders,
    connectReader,
    collectPayment,
    capturePayment,
    cancelPayment,
    terminalStatus
  };
}