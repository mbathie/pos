'use client'

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Smartphone, AlertCircle, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { useGlobals } from '@/lib/globals';
import { initTerminal, getTerminalInstance } from '@/lib/stripe-terminal';

export function MembershipPaymentRecoveryDialog({ open, onOpenChange, membership, customer, onSuccess }) {
  const { terminalConnection, isTerminalConnectionValid, employee, location, setTerminalConnection } = useGlobals();
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('simulated'); // 'simulated' or 'terminal'
  const [terminalStatus, setTerminalStatus] = useState('checking');
  const [outstandingInvoice, setOutstandingInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [collectingPayment, setCollectingPayment] = useState(false);
  const [discoveredReaders, setDiscoveredReaders] = useState([]);

  // Check terminal status when dialog opens
  useEffect(() => {
    const checkTerminalStatus = async () => {
      if (!open) {
        return;
      }

      console.log('🔍 Checking terminal status for payment recovery...');

      const currentLocationId = location?._id || employee?.selectedLocationId;

      // First, initialize the terminal SDK if needed (will reuse existing instance if already initialized)
      try {
        await initTerminal();
        console.log('✅ Terminal SDK initialized/retrieved');
      } catch (error) {
        console.error('❌ Failed to initialize terminal:', error);
        setTerminalStatus('disconnected');
        return;
      }

      // Get the shared terminal instance
      const terminal = getTerminalInstance();

      // Check if a reader is already connected
      if (terminal) {
        try {
          const connected = await terminal.getConnectedReader();
          console.log('🔍 Connected reader check:', connected);

          if (connected) {
            console.log('✅ Terminal already connected for payment recovery:', connected.label);

            // Verify the connection is actually usable by checking the connection status
            const connectionStatus = terminal.getConnectionStatus();
            console.log('🔍 Connection status:', connectionStatus);

            if (connectionStatus === 'connected') {
              setTerminalStatus('connected');
              return;
            } else {
              console.warn('⚠️ Terminal reader found but status is:', connectionStatus);
              setTerminalStatus('disconnected');
              return;
            }
          }
        } catch (error) {
          console.error('❌ Error checking connected reader:', error);
          setTerminalStatus('disconnected');
          return;
        }
      }

      // No terminal connected - automatically try to discover and connect
      console.log('❌ No terminal connected - attempting auto-discovery...');
      await discoverAndConnectTerminal();
    };

    checkTerminalStatus();
  }, [open, location?._id, employee?.selectedLocationId]);


  // Fetch outstanding invoice when dialog opens
  useEffect(() => {
    if (open && membership) {
      fetchOutstandingInvoice();
    }
  }, [open, membership]);

  // Discover and connect to terminal
  const discoverAndConnectTerminal = async () => {
    setTerminalStatus('discovering');

    try {
      await initTerminal();
      const terminal = getTerminalInstance();

      if (!terminal) {
        throw new Error('Failed to initialize terminal');
      }

      // Always try to discover physical readers first
      console.log('🔍 Discovering physical readers...');
      let result = await terminal.discoverReaders({ simulated: false });

      // If no physical readers found, try simulated (only in dev mode)
      if ((!result || result.error || result.discoveredReaders.length === 0)) {
        const isDevMode = process.env.NEXT_PUBLIC_IS_DEV === 'true';
        if (isDevMode) {
          console.log('📱 No physical readers found, trying simulated readers...');
          result = await terminal.discoverReaders({ simulated: true });
        }
      }

      if (result.error) {
        console.error('Failed to discover readers:', result.error);
        throw new Error('Failed to discover readers');
      }

      if (!result.discoveredReaders || result.discoveredReaders.length === 0) {
        console.log('No readers found');
        setTerminalStatus('disconnected');
        toast.error('No terminals found. Please ensure a terminal is powered on and nearby.');
        return;
      }

      setDiscoveredReaders(result.discoveredReaders);
      console.log(`📡 Found ${result.discoveredReaders.length} reader(s)`);

      // Auto-connect to first reader
      setTerminalStatus('connecting');
      const selectedReader = result.discoveredReaders[0];
      const connectResult = await terminal.connectReader(selectedReader);

      if (connectResult.error) {
        console.error('Terminal connection failed:', connectResult.error);
        setTerminalStatus('disconnected');
        toast.error('Failed to connect to terminal');
        return;
      }

      console.log('✅ Connected to reader:', connectResult.reader.label);
      setTerminalStatus('connected');

      // Cache the connection
      const currentLocationId = location?._id || employee?.selectedLocationId;
      setTerminalConnection({
        readerId: connectResult.reader.id,
        readerLabel: connectResult.reader.label,
        isSimulated: connectResult.reader.simulated || false,
        locationId: currentLocationId
      });

      toast.success(`Connected to ${connectResult.reader.label}`);
    } catch (error) {
      console.error('Error during terminal discovery/connection:', error);
      setTerminalStatus('disconnected');
      toast.error(error.message || 'Failed to connect to terminal');
    }
  };

  const fetchOutstandingInvoice = async () => {
    setLoadingInvoice(true);
    try {
      // Check for failed transactions for this membership
      const response = await fetch(`/api/transactions?customerId=${customer._id}&status=failed`);
      const transactions = await response.json();

      // Find the most recent failed transaction for this membership
      const failedTransaction = transactions.find(t =>
        t.stripe?.subscriptionId === membership.stripeSubscriptionId
      );

      if (failedTransaction) {
        setOutstandingInvoice({
          amount: failedTransaction.total,
          invoiceId: failedTransaction.stripe?.invoiceId,
          date: failedTransaction.createdAt
        });
      }
    } catch (error) {
      console.error('Error fetching outstanding invoice:', error);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleProcessPayment = async () => {
    setProcessing(true);

    try {
      let result;
      if (paymentMethod === 'terminal') {
        // Handle terminal payment
        result = await handleTerminalPayment();
      } else {
        // Handle simulated payment
        result = await handleSimulatedPayment();
      }

      // Show warning if payment method couldn't be saved
      if (result.warning) {
        toast.warning('Payment processed but card not saved', {
          description: result.warning,
          duration: 8000
        });
      } else {
        toast.success('Payment processed successfully!', {
          description: result.paymentMethodUpdated ? 'Membership reactivated and payment method updated' : 'Membership has been reactivated'
        });
      }

      // Close dialog and refresh
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Payment recovery error:', error);
      if (error.message !== 'PAYMENT_CANCELLED') {
        toast.error('Payment failed', {
          description: error.message
        });
      }
    } finally {
      setProcessing(false);
      setCollectingPayment(false);
    }
  };

  const handleSimulatedPayment = async () => {
    const response = await fetch(
      `/api/customers/${customer._id}/memberships/${membership._id}/recover-payment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isSimulation: true
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Payment failed');
    }

    return result;
  };

  const handleTerminalPayment = async () => {
    const terminal = getTerminalInstance();

    if (!terminal) {
      throw new Error('Terminal not initialized');
    }

    // Double-check the terminal is actually connected before starting
    const connectionStatus = terminal.getConnectionStatus();
    if (connectionStatus !== 'connected') {
      throw new Error('Terminal is not connected. Please connect a terminal from the checkout page first.');
    }

    const connectedReader = await terminal.getConnectedReader();
    if (!connectedReader) {
      throw new Error('No reader connected. Please connect a terminal from the checkout page first.');
    }

    console.log('🔌 Using terminal:', connectedReader.label);
    setCollectingPayment(true);

    // 1. Create payment intent for Terminal collection
    const createResponse = await fetch(
      `/api/customers/${customer._id}/memberships/${membership._id}/recover-payment/intent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const intentData = await createResponse.json();

    if (!createResponse.ok) {
      throw new Error(intentData.error || 'Failed to create payment intent');
    }

    console.log('💳 Payment intent created for Terminal collection:', intentData.paymentIntentId);

    // 2. Collect payment method using terminal
    const collectResult = await terminal.collectPaymentMethod(intentData.clientSecret);

    if (collectResult.error) {
      const msg = collectResult.error.message || '';
      const isCancelled = !msg || /cancel(l)?ed/i.test(msg);
      if (isCancelled) {
        toast.info('Payment cancelled');
        throw new Error('PAYMENT_CANCELLED');
      }
      throw new Error(msg || 'Payment collection failed');
    }

    console.log('✅ Payment method collected from card');

    // 3. Process the payment on the reader
    const processResult = await terminal.processPayment(collectResult.paymentIntent);

    if (processResult.error) {
      const msg = processResult.error.message || '';
      const isCancelled = /cancel(l)?ed/i.test(msg);
      if (isCancelled) {
        toast.info('Payment cancelled');
        throw new Error('PAYMENT_CANCELLED');
      }
      throw new Error(msg || 'Payment processing failed');
    }

    console.log('✅ Payment processed on reader');

    // 4. Complete the recovery on the backend (mark invoice paid, record transaction)
    const completeResponse = await fetch(
      `/api/customers/${customer._id}/memberships/${membership._id}/recover-payment/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: intentData.paymentIntentId
        })
      }
    );

    const result = await completeResponse.json();

    if (!completeResponse.ok) {
      throw new Error(result.error || 'Failed to complete recovery');
    }

    return result;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Recover Failed Payment</DialogTitle>
          <DialogDescription>
            Process the outstanding payment for {customer?.name}'s {membership?.product?.name} membership.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Outstanding Amount */}
          {loadingInvoice ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : outstandingInvoice ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Amount Due:</span>
                    <span className="text-lg font-bold">${outstandingInvoice.amount?.toFixed(2)}</span>
                  </div>
                  {outstandingInvoice.date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Failed on:</span>
                      <span>{dayjs(outstandingInvoice.date).format('MMM D, YYYY')}</span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No outstanding invoices found. The payment may have already been processed.
              </AlertDescription>
            </Alert>
          )}

          {/* Terminal Status */}
          <div className="flex items-center justify-between py-2 px-4 bg-muted/30 rounded-md">
            <span className="text-sm text-muted-foreground">Terminal Status</span>
            <div className="flex items-center gap-2">
              {terminalStatus === 'connected' && (
                <>
                  <Wifi className="size-4 text-primary" />
                  <span className="text-xs text-primary">Connected</span>
                </>
              )}
              {terminalStatus === 'disconnected' && (
                <>
                  <WifiOff className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">No Terminal</span>
                </>
              )}
              {(terminalStatus === 'checking' || terminalStatus === 'discovering' || terminalStatus === 'connecting') && (
                <>
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {terminalStatus === 'checking' ? 'Checking...' :
                     terminalStatus === 'discovering' ? 'Discovering...' :
                     'Connecting...'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('simulated')}
                disabled={processing || collectingPayment}
                className={`flex items-center justify-start px-4 py-2 rounded-md border transition-colors ${
                  processing || collectingPayment
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                } ${
                  paymentMethod === 'simulated'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-input'
                }`}
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Simulate Payment
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('terminal')}
                disabled={terminalStatus !== 'connected' || processing || collectingPayment}
                className={`flex items-center justify-start px-4 py-2 rounded-md border transition-colors ${
                  terminalStatus !== 'connected' || processing || collectingPayment
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                } ${
                  paymentMethod === 'terminal'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-input'
                }`}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Physical Terminal
              </button>
            </div>
            {paymentMethod === 'terminal' && terminalStatus === 'disconnected' && (
              <p className="text-xs text-muted-foreground mt-2">
                No terminal found. Please ensure a Stripe terminal is powered on and nearby.
              </p>
            )}
            {paymentMethod === 'terminal' && (terminalStatus === 'discovering' || terminalStatus === 'connecting') && (
              <p className="text-xs text-muted-foreground mt-2">
                Searching for terminals...
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing || collectingPayment}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleProcessPayment}
            disabled={
              processing ||
              collectingPayment ||
              !outstandingInvoice ||
              (paymentMethod === 'terminal' && terminalStatus !== 'connected')
            }
            className="cursor-pointer"
          >
            {collectingPayment ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Collecting Payment...
              </>
            ) : processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Process Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
