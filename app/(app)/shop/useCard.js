'use client'
import { useRef, useState, useEffect } from 'react';
import { loadStripeTerminal } from '@stripe/terminal-js';

let terminalInstance = null;
let connecting = false

export function useCard({ cart }) {
  const paymentIntentId = useRef()
  const transactionId = useRef()
  const clientSecret = useRef()
  const discoveredReaders = useRef([])
  const [availableTerminals, setAvailableTerminals] = useState([])
  const [connectedReader, setConnectedReader] = useState(null)
  const [terminalStatus, setTerminalStatus] = useState('disconnected') // disconnected, discovering, connecting, connected
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [autoCapture, setAutoCapture] = useState(true) // Auto-capture when payment is ready
  const pollingInterval = useRef(null)

  // Fetch available terminals from database
  const fetchAvailableTerminals = async () => {
    try {
      const res = await fetch('/api/terminals/available')
      if (res.ok) {
        const terminals = await res.json()
        setAvailableTerminals(terminals)
        console.log('📱 Available terminals:', terminals)
        return terminals
      }
    } catch (error) {
      console.error('Failed to fetch available terminals:', error)
    }
    return []
  }

  // Initialize terminal instance
  const initTerminal = async () => {
    if (!terminalInstance && typeof window !== 'undefined') {
      console.log('🔧 Initializing Stripe Terminal...')
      const StripeTerminal = await loadStripeTerminal();
      if (!StripeTerminal) {
        throw new Error('StripeTerminal failed to load.');
      }

      terminalInstance = StripeTerminal.create({
        onFetchConnectionToken: async () => {
          console.log('🔑 Fetching connection token...')
          const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments/token', { method: 'POST' });
          const data = await res.json();
          if (!res.ok || !data.secret) {
            throw new Error(data.error || 'Failed to fetch connection token');
          }
          console.log('✅ Connection token fetched')
          return data.secret;
        },
        onUnexpectedReaderDisconnect: () => {
          console.warn('⚠️ Reader disconnected unexpectedly');
          setConnectedReader(null)
          setTerminalStatus('disconnected')
        },
        onReaderReconnectStarted: () => {
          console.log('🔄 Reader reconnection started...')
          setTerminalStatus('connecting')
        },
        onReaderReconnectSucceeded: () => {
          console.log('✅ Reader reconnected successfully')
          setTerminalStatus('connected')
        },
      });
      
      console.log('✅ Stripe Terminal initialized')
    }
    return terminalInstance;
  };

  // Discover readers (both simulated and physical)
  const discoverReaders = async (usePhysical = true) => {
    console.log(`🔍 Discovering ${usePhysical ? 'physical' : 'simulated'} readers...`)
    setTerminalStatus('discovering')
    
    const terminal = await initTerminal();

    // Configure discovery based on type
    const config = usePhysical 
      ? { 
          simulated: false,
          location: null // Let Stripe find all physical readers
        }
      : { 
          simulated: true 
        };

    const result = await terminal.discoverReaders(config);

    if (result.error) {
      console.error('❌ Failed to discover readers:', result.error);
      setTerminalStatus('disconnected')
      return []
    } else if (result.discoveredReaders.length === 0) {
      console.log('📭 No available readers found');
      setTerminalStatus('disconnected')
      return []
    } else {
      discoveredReaders.current = result.discoveredReaders;
      console.log('📡 Discovered readers:', result.discoveredReaders.map(r => ({
        id: r.id,
        label: r.label,
        device_type: r.device_type,
        status: r.status
      })));
      setTerminalStatus('disconnected') // Ready to connect
      return result.discoveredReaders
    }
  };

  // Connect to a specific reader
  const connectReader = async (readerId = null) => {
    console.log('🔌 Attempting to connect to reader...')
    
    if (!terminalInstance) {
      console.error('❌ Terminal not initialized')
      return false
    }

    // Check if already connected
    const connected = await terminalInstance.getConnectedReader();
    if (connected) {
      console.log('✅ Already connected to reader:', connected.label);
      setConnectedReader(connected)
      setTerminalStatus('connected')
      return true;
    }

    if (connecting) {
      console.log('⏳ Already connecting...')
      return false
    }

    if (discoveredReaders.current.length === 0) {
      console.error('❌ No readers discovered. Run discoverReaders first.')
      return false
    }

    connecting = true
    setTerminalStatus('connecting')

    try {
      // Select reader to connect to
      let selectedReader
      if (readerId) {
        selectedReader = discoveredReaders.current.find(r => r.id === readerId)
        if (!selectedReader) {
          console.error('❌ Reader with ID not found:', readerId)
          return false
        }
      } else {
        selectedReader = discoveredReaders.current[0] // Connect to first available
      }

      console.log('🔗 Connecting to reader:', selectedReader.label)
      const result = await terminalInstance.connectReader(selectedReader);

      if (result.error) {
        console.error('❌ Failed to connect:', result.error);
        setTerminalStatus('disconnected')
        return false
      } else {
        console.log('✅ Connected to reader:', result.reader.label);
        setConnectedReader(result.reader)
        setTerminalStatus('connected')
        return true
      }
    } finally {
      connecting = false
    }
  };

  // Connect to a specific terminal by ID from globals
  const connectToLinkedTerminal = async (terminalId) => {
    if (!terminalId) {
      console.log('📭 No linked terminal found')
      return false
    }

    console.log('🎯 Connecting to linked terminal:', terminalId)
    
    // First, fetch available terminals to find our specific one
    const terminals = await fetchAvailableTerminals()
    const linkedTerminal = terminals.find(t => t._id === terminalId)
    
    if (!linkedTerminal) {
      console.log('❌ Linked terminal not found in available terminals')
      return false
    }

    if (!linkedTerminal.availableForPayment) {
      console.log('❌ Linked terminal is not available for payment (offline)')
      return false
    }

    console.log('✅ Found linked terminal:', linkedTerminal.label, linkedTerminal.type)

    // Discover readers based on terminal type
    const usePhysical = linkedTerminal.type === 'physical'
    const discoveredReaders = await discoverReaders(usePhysical)
    
    if (discoveredReaders.length === 0) {
      console.log('❌ No readers discovered for linked terminal')
      return false
    }

    // Try to find the specific reader by stripeTerminalId
    let targetReader = null
    if (linkedTerminal.stripeTerminalId) {
      targetReader = discoveredReaders.find(r => r.id === linkedTerminal.stripeTerminalId)
    }
    
    // If we can't find the specific reader, use the first available one of the same type
    if (!targetReader && discoveredReaders.length > 0) {
      targetReader = discoveredReaders[0]
      console.log('⚠️ Using first available reader instead of specific terminal')
    }

    if (!targetReader) {
      console.log('❌ No suitable reader found for linked terminal')
      return false
    }

    // Connect to the specific reader
    const success = await connectReader(targetReader.id)
    if (success) {
      console.log('✅ Successfully connected to linked terminal:', linkedTerminal.label)
      return true
    }

    console.log('❌ Failed to connect to linked terminal')
    return false
  }

  // Auto-discover and connect to physical terminals
  const autoConnectPhysical = async () => {
    console.log('🚀 Auto-connecting to physical terminals...')
    
    // First, fetch available terminals from database
    const terminals = await fetchAvailableTerminals()
    const physicalTerminals = terminals.filter(t => t.type === 'physical' && t.availableForPayment)
    
    if (physicalTerminals.length === 0) {
      console.log('📭 No physical terminals available, falling back to simulated')
      return await discoverAndConnectSimulated()
    }

    // Discover physical readers
    const discoveredPhysical = await discoverReaders(true)
    
    if (discoveredPhysical.length > 0) {
      // Try to connect to the first physical reader
      const success = await connectReader()
      if (success) {
        console.log('✅ Successfully connected to physical terminal')
        return true
      }
    }

    console.log('⚠️ Failed to connect to physical terminal, falling back to simulated')
    return await discoverAndConnectSimulated()
  }

  // Discover and connect to simulated readers
  const discoverAndConnectSimulated = async () => {
    const discoveredSimulated = await discoverReaders(false)
    if (discoveredSimulated.length > 0) {
      return await connectReader()
    }
    return false
  }

  // Collect payment with connected reader
  const collectPayment = async () => {
    console.log('💳 Starting payment collection...')
    
    // Ensure we have a connected reader
    if (!connectedReader) {
      console.log('🔌 No reader connected, attempting auto-connect...')
      const connected = await autoConnectPhysical()
      if (!connected) {
        throw new Error('No terminal connected. Please connect a terminal first.')
      }
    }

    // Create payment intent
    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart }),
    });
    
    if (!res.ok) {
      throw new Error('Failed to create payment intent')
    }
    
    const intent = await res.json();
    paymentIntentId.current = intent.id
    transactionId.current = intent.transactionId
    clientSecret.current = intent.clientSecret

    console.log('💰 Payment intent created:', intent.id)

    // Configure simulator if using simulated terminal
    if (connectedReader.device_type?.includes('simulated')) {
      console.log('🧪 Configuring simulated terminal')
      terminalInstance.setSimulatorConfiguration({testCardNumber: '4242424242424242'});
    }

    // Collect payment method
    console.log('📥 Collecting payment method...')
    const collectResult = await terminalInstance.collectPaymentMethod(intent.clientSecret)
    
    if (collectResult.error) {
      // Handle cancellation gracefully - this is expected when user cancels
      if (collectResult.error.code === 'canceled' || collectResult.error.message?.includes('canceled')) {
        console.log('🚫 Payment collection was cancelled by user')
        throw new Error('PAYMENT_CANCELLED')
      }
      
      console.error('❌ Failed to collect payment method:', collectResult.error)
      throw new Error(`Payment collection failed: ${collectResult.error.message}`)
    }

    console.log('✅ Payment method collected, processing...')
    
    // Process payment
    const processResult = await terminalInstance.processPayment(collectResult.paymentIntent)
    
    if (processResult.error) {
      console.error('❌ Failed to process payment:', processResult.error)
      throw new Error(`Payment processing failed: ${processResult.error.message}`)
    }

    console.log('🎉 Payment processed successfully!')
    
    // Start polling for payment status if auto-capture is enabled
    if (autoCapture) {
      startPollingPaymentStatus(intent.id)
    }
    
    return intent.id
  };

  // Capture payment
  const capturePayment = async () => {
    console.log('🎯 Capturing payment...')
    
    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId: paymentIntentId.current,
        transactionId: transactionId.current
      }),
    });
    
    if (!res.ok) {
      throw new Error('Failed to capture payment')
    }
    
    const intent = await res.json()
    console.log('✅ Payment captured:', intent.status)
    return intent
  };

  // Cancel payment
  const cancelPayment = async () => {
    console.log('❌ Cancelling payment...')
    
    if (!paymentIntentId.current) {
      throw new Error('No payment to cancel')
    }

    try {
      // Cancel on Stripe Terminal
      if (terminalInstance) {
        const cancelResult = await terminalInstance.cancelCollectPaymentMethod()
        if (cancelResult.error) {
          console.warn('⚠️ Terminal cancel failed:', cancelResult.error.message)
        } else {
          console.log('✅ Terminal payment collection cancelled')
        }
      }

      // Cancel the payment intent on the server
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/payments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId.current
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to cancel payment on server')
      }
      
      const result = await res.json()
      console.log('✅ Payment cancelled on server:', result.status)
      
      // Clear local state
      paymentIntentId.current = null
      transactionId.current = null
      setPaymentStatus(null)
      stopPollingPaymentStatus()
      
      return result
    } catch (error) {
      console.error('❌ Error cancelling payment:', error)
      throw error
    }
  };

  // Poll payment status when we have a payment intent
  const startPollingPaymentStatus = (paymentIntentId) => {
    console.log('🔄 Starting payment status polling for:', paymentIntentId)
    
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current)
    }

    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status?paymentIntentId=${paymentIntentId}`)
        if (res.ok) {
          const status = await res.json()
          console.log('📊 Payment status update:', status.status)
          
          setPaymentStatus(status)

          // Auto-capture if payment is ready and auto-capture is enabled
          if (autoCapture && status.needsCapture && status.readyForCapture) {
            console.log('🎯 Payment ready for capture - auto-capturing...')
            stopPollingPaymentStatus()
            
            // Store the payment intent ID for the final status check
            const currentPaymentIntentId = status.id
            
            // Auto-capture the payment
            try {
              const capturedIntent = await capturePayment()
              console.log('✅ Auto-captured payment:', capturedIntent.status)
              
              // Do one final status check to get the latest from Stripe
              setTimeout(async () => {
                try {
                  console.log('🔄 Doing final status check for:', currentPaymentIntentId)
                  const finalRes = await fetch(`/api/payments/status?paymentIntentId=${currentPaymentIntentId}`)
                  if (finalRes.ok) {
                    const finalStatus = await finalRes.json()
                    console.log('✅ Final status check after auto-capture:', finalStatus.status)
                    setPaymentStatus(finalStatus)
                  }
                } catch (finalError) {
                  console.error('❌ Error getting final status:', finalError)
                }
              }, 1000) // Wait 1 second then get final status
              
              // Update payment status immediately with captured result
              setPaymentStatus({
                ...status,
                status: capturedIntent.status,
                needsCapture: false,
                readyForCapture: false
              })
              
              // Trigger success callback if provided
              if (window.onPaymentSuccess) {
                window.onPaymentSuccess(capturedIntent)
              }
            } catch (captureError) {
              console.error('❌ Auto-capture failed:', captureError)
              // Continue polling if auto-capture failed
              // Don't stop polling in case of error
            }
          }

          // Stop polling if payment is in final state
          if (['succeeded', 'canceled', 'payment_failed'].includes(status.status)) {
            console.log('🏁 Payment reached final state, stopping polling')
            stopPollingPaymentStatus()
          }
        }
      } catch (error) {
        console.error('❌ Error polling payment status:', error)
      }
    }, 2000) // Poll every 2 seconds
  }

  const stopPollingPaymentStatus = () => {
    if (pollingInterval.current) {
      console.log('⏹️ Stopping payment status polling')
      clearInterval(pollingInterval.current)
      pollingInterval.current = null
    }
  }

  // Load available terminals on mount
  useEffect(() => {
    fetchAvailableTerminals()
    
    // Cleanup polling on unmount
    return () => {
      stopPollingPaymentStatus()
    }
  }, [])

      return {
      // Discovery and connection
      discoverReaders,
      connectReader,
      autoConnectPhysical,
      connectToLinkedTerminal,
      fetchAvailableTerminals,
      
      // Payment processing
      collectPayment,
      capturePayment,
      cancelPayment,
      startPollingPaymentStatus,
      stopPollingPaymentStatus,
      
      // State
      availableTerminals,
      connectedReader,
      terminalStatus,
      paymentStatus,
      autoCapture,
      setAutoCapture,
      discoveredReaders: discoveredReaders.current
    };
}
