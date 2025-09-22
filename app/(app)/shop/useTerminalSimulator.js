import { useState } from 'react';
import { toast } from 'sonner';

export function useTerminalSimulator({ cart, employee, location }) {
  const [simulatorStatus, setSimulatorStatus] = useState('ready');
  const [simulatedPaymentIntent, setSimulatedPaymentIntent] = useState(null);
  const [simulatedTransactionId, setSimulatedTransactionId] = useState(null);

  const simulatePayment = async () => {
    try {
      setSimulatorStatus('creating');

      // Check if cart contains membership products
      const hasMemberships = cart.products.some(p => p.type === 'membership');

      let paymentIntentId, transactionId;

      if (hasMemberships) {
        // Use subscription endpoint for memberships
        const createResponse = await fetch('/api/payments/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart,
            isSimulation: true
          })
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.error || 'Failed to create subscription payment');
        }

        const result = await createResponse.json();
        paymentIntentId = result.paymentIntentId;
        transactionId = result.transactionId;
        setSimulatedPaymentIntent(paymentIntentId);
        setSimulatedTransactionId(transactionId);

        // Simulate card reading delay
        setSimulatorStatus('reading');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simulate processing
        setSimulatorStatus('processing');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Use the regular capture endpoint (simulation already handled in intent creation)
        const captureResponse = await fetch('/api/payments/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId,
            transactionId
          })
        });

        if (!captureResponse.ok) {
          const error = await captureResponse.json();
          throw new Error(error.error || 'Failed to capture subscription payment');
        }

        // Then complete the subscription setup
        const completeResponse = await fetch('/api/payments/subscription/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart,
            paymentIntentId,
            transactionId,
            isSimulation: true
          })
        });

        if (!completeResponse.ok) {
          const error = await completeResponse.json();
          throw new Error(error.error || 'Failed to complete subscription setup');
        }

        setSimulatorStatus('succeeded');
        toast.success('Simulated subscription payment successful');
        return { success: true, transactionId };

      } else {
        // Use regular payment intent endpoint for non-membership products
        const createResponse = await fetch('/api/payments/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart,
            customer: cart.customer,
            isSimulation: true
          })
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.error || 'Failed to create payment intent');
        }

        const result = await createResponse.json();
        paymentIntentId = result.id;
        transactionId = result.transactionId;
        setSimulatedPaymentIntent(paymentIntentId);
        setSimulatedTransactionId(transactionId);

        // Simulate card reading delay
        setSimulatorStatus('reading');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simulate processing
        setSimulatorStatus('processing');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Use the regular capture endpoint (simulation already handled in intent creation)
        const captureResponse = await fetch('/api/payments/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId,
            transactionId
          })
        });

        if (!captureResponse.ok) {
          const error = await captureResponse.json();
          throw new Error(error.error || 'Failed to capture payment');
        }

        const captureResult = await captureResponse.json();

        if (captureResult.status === 'succeeded') {
          setSimulatorStatus('succeeded');
          toast.success('Simulated payment successful');
          return { success: true, transactionId };
        } else {
          throw new Error('Payment simulation failed');
        }
      }

    } catch (error) {
      console.error('Terminal simulation error:', error);
      setSimulatorStatus('failed');
      toast.error(`Simulation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  const cancelSimulation = async () => {
    if (simulatedPaymentIntent) {
      try {
        // Use the existing cancel endpoint
        await fetch('/api/payments/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: simulatedPaymentIntent
          })
        });
      } catch (error) {
        console.error('Failed to cancel simulation:', error);
      }
    }

    setSimulatorStatus('ready');
    setSimulatedPaymentIntent(null);
    setSimulatedTransactionId(null);
  };

  const resetSimulator = () => {
    setSimulatorStatus('ready');
    setSimulatedPaymentIntent(null);
    setSimulatedTransactionId(null);
  };

  return {
    simulatorStatus,
    simulatedPaymentIntent,
    simulatedTransactionId,
    simulatePayment,
    cancelSimulation,
    resetSimulator
  };
}