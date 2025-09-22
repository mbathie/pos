'use client'
import { useRef, useState, useEffect } from 'react';
import { loadStripeTerminal } from '@stripe/terminal-js';
import { useGlobals } from '@/lib/globals';

let terminalInstance = null;
let discoveredReaders = [];
let connecting = false

export function useCard({ cart, employee, location }) {
  const { terminalConnection, setTerminalConnection, clearTerminalConnection, isTerminalConnectionValid } = useGlobals();
  const paymentIntentId = useRef()
  const transactionId = useRef()
  const clientSecret = useRef()
  const discoveredReaders = useRef([])
  // Start with 'checking' status to prevent premature initialization
  const [terminalStatus, setTerminalStatus] = useState('checking') // checking, disconnected, discovering, connecting, connected
  const [paymentStatus, setPaymentStatus] = useState(null) // null, collecting, processing, succeeded, failed

  // Check for cached connection on mount and location changes
  useEffect(() => {
    const checkCachedConnection = async () => {
      const currentLocationId = location?._id || employee?.selectedLocationId || employee?.location?._id;
      
      // Check if cached connection is valid AND for the current location
      if (isTerminalConnectionValid() && 
          terminalConnection.locationId === currentLocationId) {
        console.log('🔄 Found valid cached terminal connection for current location:', terminalConnection);
        setTerminalStatus('connecting'); // Show connecting status while checking
        
        // Initialize terminal if not already initialized
        if (!terminalInstance) {
          await initTerminal();
        }
        
        // Check if the cached reader is still connected
        if (terminalInstance) {
          const connected = await terminalInstance.getConnectedReader();
          if (connected && connected.id === terminalConnection.readerId) {
            console.log('✅ Using cached terminal connection:', connected.label);
            setTerminalStatus('connected');
            return;
          } else {
            console.log('⚠️ Cached connection no longer valid, clearing...');
            clearTerminalConnection();
            setTerminalStatus('disconnected');
            // Will trigger the auto-reconnect in payment.js since status is now disconnected
          }
        }
      } else {
        // No cached connection, expired, or different location
        if (terminalConnection.locationId && terminalConnection.locationId !== currentLocationId) {
          console.log('📍 Location changed, disconnecting from previous location terminal...');
          // If there's an active terminal connection for a different location, disconnect it
          if (terminalInstance) {
            const connected = await terminalInstance.getConnectedReader();
            if (connected) {
              console.log('🔌 Disconnecting reader from previous location...');
              await terminalInstance.disconnectReader();
            }
          }
          clearTerminalConnection();
        }
        setTerminalStatus('disconnected');
      }
    };
    
    checkCachedConnection();
  }, [location?._id, employee?.selectedLocationId, employee?.location?._id]); // Re-check when location changes

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
    try {
      setTerminalStatus('discovering')
      const terminal = await initTerminal();

      // Try to discover readers - physical by default, simulated for development
      const isDevMode = process.env.NEXT_PUBLIC_IS_DEV === 'true';
      const config = { simulated: isDevMode };
      
      console.log(`🔍 Discovering ${isDevMode ? 'simulated' : 'physical'} readers...`);
      const result = await terminal.discoverReaders(config);

      if (result.error) {
        console.log('Failed to discover readers:', result.error);
        
        // If in production and physical readers fail, try simulated as fallback
        if (!isDevMode) {
          console.log('📱 Falling back to simulated readers...');
          const simResult = await terminal.discoverReaders({ simulated: true });
          
          if (!simResult.error && simResult.discoveredReaders.length > 0) {
            discoveredReaders.current = simResult.discoveredReaders;
            console.log('📡 Found simulated readers:', simResult.discoveredReaders.length);
            setTerminalStatus('disconnected');
            return;
          }
        }
        
        setTerminalStatus('disconnected');
      } else if (result.discoveredReaders.length === 0) {
        console.log('No readers found');
        setTerminalStatus('disconnected');
      } else {
        discoveredReaders.current = result.discoveredReaders;
        console.log(`📡 Found ${result.discoveredReaders.length} reader(s)`);
        setTerminalStatus('disconnected'); // Ready to connect
      }
    } catch (error) {
      console.log('Terminal discovery error:', error.message || 'Unknown error');
      setTerminalStatus('disconnected');
    }
  };

  const connectReader = async () => {
    try {
      if (!terminalInstance || discoveredReaders.current.length === 0) {
        console.log('Terminal not initialized or no readers discovered.');
        setTerminalStatus('disconnected')
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
        console.log('Terminal connection failed:', result.error);
        connecting = false
        setTerminalStatus('disconnected')
        // Don't throw the error, just return gracefully
        return;
      } else {
        console.log('Connected to reader:', result.reader.label);
        connecting = false
        setTerminalStatus('connected')
        
        // Cache the connection in localStorage via globals with location ID
        const currentLocationId = location?._id || employee?.selectedLocationId || employee?.location?._id;
        setTerminalConnection({
          readerId: result.reader.id,
          readerLabel: result.reader.label,
          isSimulated: result.reader.simulated || false,
          locationId: currentLocationId
        });
        console.log('💾 Terminal connection cached for location:', currentLocationId);
      }
    } catch (error) {
      console.log('Terminal connection error:', error.message || 'Unknown error');
      connecting = false
      setTerminalStatus('disconnected')
      // Don't throw the error, handle it gracefully
      return;
    }
  };

  const collectPayment = async () => {
    try {
      setPaymentStatus('creating')
      
      // Check if cart total is zero (100% discount or full credit coverage)
      const isZeroDollar = cart.total === 0;
      
      // Check if cart contains membership products
      const hasMemberships = cart.products.some(product => product.type === 'membership');
      
      // For zero-dollar transactions, skip card reader entirely
      if (isZeroDollar) {
        console.log('💵 Processing zero-dollar transaction (100% discount/credit)');
        
        // Create transaction directly without payment intent
        const res = await fetch('/api/payments/zero-dollar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            cart,
            customer: cart.customer,
            hasMemberships 
          }),
        });
        const result = await res.json();
        
        if (!res.ok || result.error) {
          console.error('❌ Zero-dollar transaction failed:', result.error)
          setPaymentStatus('failed')
          throw new Error(result.error || 'Failed to process zero-dollar transaction')
        }
        
        console.log('✅ Zero-dollar transaction processed successfully');
        transactionId.current = result.transactionId;
        setPaymentStatus('succeeded');
        
        // Return early - no card collection needed
        return;
      }
      
      let endpoint = '/api/payments/intent';
      let payload = { cart, customer: cart.customer };
      
      // Use subscription endpoint for membership products
      if (hasMemberships) {
        endpoint = '/api/payments/subscription';
        payload = { cart }; // Subscription endpoint extracts customers from products
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const intent = await res.json();
      
      // Check for API errors
      if (!res.ok || intent.error) {
        console.error('❌ Payment creation failed:', intent.error)
        setPaymentStatus('failed')
        throw new Error(intent.error || 'Failed to create payment')
      }
      
      // Handle membership first period charge (terminal payment + manual subscriptions)
      if (intent.isFirstPeriodCharge) {
        console.log('🔄 Processing membership first period charge:', intent.paymentIntentId)
        paymentIntentId.current = intent.paymentIntentId
        transactionId.current = intent.transactionId
        clientSecret.current = intent.clientSecret
        
        console.log('💰 Payment intent created for membership first period:', intent.paymentIntentId)
        
        // Only set simulator configuration for simulated readers
        const connectedReader = await terminalInstance.getConnectedReader();
        if (connectedReader && connectedReader.device_type === 'simulated_wpe') {
          console.log('🧪 Setting simulator configuration for test card')
          terminalInstance.setSimulatorConfiguration({testCardNumber: '4242424242424242'});
        } else {
          console.log('💳 Using physical terminal - no simulator configuration needed')
        }
        
        setPaymentStatus('collecting')
        console.log('💳 Starting payment collection for membership first period...')
        
        const collectResult = await terminalInstance.collectPaymentMethod(intent.clientSecret);
        
        if (collectResult.error) {
          const msg = collectResult.error.message || ''
          const isCancelled = !msg || /cancel(l)?ed/i.test(msg)
          console.error('❌ Payment collection failed:', collectResult.error)
          if (isCancelled) {
            setPaymentStatus('cancelled')
            throw new Error('PAYMENT_CANCELLED')
          }
          setPaymentStatus('failed')
          throw new Error(msg || 'Payment collection failed')
        }
        
        console.log('✅ Payment method collected successfully for membership')
        setPaymentStatus('processing')
        console.log('⚙️ Processing membership first period payment...')
        
        const processResult = await terminalInstance.processPayment(collectResult.paymentIntent);
        
        if (processResult.error) {
          const msg = processResult.error.message || ''
          const isCancelled = /cancel(l)?ed/i.test(msg)
          console.error('❌ Payment processing failed:', processResult.error)
          if (isCancelled) {
            setPaymentStatus('cancelled')
            throw new Error('PAYMENT_CANCELLED')
          }
          setPaymentStatus('failed')
          throw new Error(msg || 'Payment processing failed')
        }
        
        console.log('✅ Membership first period payment processed successfully')
        
        // Now create subscription records for future billing
        const subscriptionRes = await fetch('/api/payments/subscription/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            cart,
            paymentIntentId: intent.paymentIntentId,
            transactionId: intent.transactionId
          }),
        });
        
        const subscriptionResult = await subscriptionRes.json();
        
        if (!subscriptionRes.ok || subscriptionResult.error) {
          console.error('❌ Manual subscription creation failed:', subscriptionResult.error)
          setPaymentStatus('failed')
          throw new Error(subscriptionResult.error || 'Failed to create manual subscriptions')
        }
        
        console.log('✅ Manual subscriptions created successfully:', subscriptionResult.subscriptions)
        setPaymentStatus('succeeded')
        return
      }
      
      // Handle regular payment intent
      paymentIntentId.current = intent.id
      transactionId.current = intent.transactionId
      clientSecret.current = intent.clientSecret
      
      console.log('💰 Payment intent created:', intent.id)
      
      // Only set simulator configuration for simulated readers
      const connectedReader = await terminalInstance.getConnectedReader();
      if (connectedReader && connectedReader.device_type === 'simulated_wpe') {
        console.log('🧪 Setting simulator configuration for test card')
        terminalInstance.setSimulatorConfiguration({testCardNumber: '4242424242424242'});
      } else {
        console.log('💳 Using physical terminal - no simulator configuration needed')
      }
      
      setPaymentStatus('collecting')
      console.log('💳 Starting payment collection...')
      
      const collectResult = await terminalInstance.collectPaymentMethod(intent.clientSecret);
      
      if (collectResult.error) {
        const msg = collectResult.error.message || ''
        const isCancelled = !msg || /cancel(l)?ed/i.test(msg)
        console.error('❌ Payment collection failed:', collectResult.error)
        if (isCancelled) {
          setPaymentStatus('cancelled')
          throw new Error('PAYMENT_CANCELLED')
        }
        setPaymentStatus('failed')
        throw new Error(msg || 'Payment collection failed')
      }
      
      console.log('✅ Payment method collected successfully')
      setPaymentStatus('processing')
      console.log('⚙️ Processing payment...')
      
      const processResult = await terminalInstance.processPayment(collectResult.paymentIntent);
      
      if (processResult.error) {
        const msg = processResult.error.message || ''
        const isCancelled = /cancel(l)?ed/i.test(msg)
        console.error('❌ Payment processing failed:', processResult.error)
        if (isCancelled) {
          setPaymentStatus('cancelled')
          throw new Error('PAYMENT_CANCELLED')
        }
        setPaymentStatus('failed')
        throw new Error(msg || 'Payment processing failed')
      }
      
      console.log('🎉 Payment processed successfully!')
      console.log('Payment Intent Status:', processResult.paymentIntent.status)
      
      if (processResult.paymentIntent.status === 'succeeded') {
        setPaymentStatus('succeeded')
        console.log('✅ Payment completed successfully!')
      } else {
        // If payment needs capture, auto-capture it
        console.log('🔄 Payment requires capture, auto-capturing...')
        const captureResult = await capturePayment()
        if (captureResult && captureResult.status === 'succeeded') {
          setPaymentStatus('succeeded')
          console.log('✅ Payment captured and completed!')
        }
      }
      
      return intent.id
      
    } catch (error) {
      console.error('❌ Payment collection error:', error)
      setPaymentStatus('failed')
      throw error
    }
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

  const disconnectReader = async () => {
    try {
      if (terminalInstance) {
        const connected = await terminalInstance.getConnectedReader();
        if (connected) {
          const result = await terminalInstance.disconnectReader();
          if (result.error) {
            console.error('Failed to disconnect reader:', result.error);
          } else {
            console.log('Reader disconnected successfully');
            clearTerminalConnection();
            setTerminalStatus('disconnected');
          }
        }
      }
    } catch (error) {
      console.error('Error disconnecting reader:', error);
    }
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
    disconnectReader,
    collectPayment,
    capturePayment,
    cancelPayment,
    terminalStatus,
    paymentStatus,
    transactionId: transactionId.current
  };
}
