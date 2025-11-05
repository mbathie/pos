'use client'

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe - use fallback for development
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
                  (typeof window !== 'undefined' && window.__STRIPE_PUBLISHABLE_KEY__);
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function CardUpdateForm({ membership, customerId, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create payment method from card element
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      console.log('✅ Payment method created:', paymentMethod.id);

      // Update subscription with new payment method
      const response = await fetch(
        `/api/customers/${customerId}/memberships/${membership._id}/payment-method/update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethodId: paymentMethod.id
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update payment method');
      }

      toast.success('Card updated successfully', {
        description: 'Future membership payments will use this card'
      });

      onSuccess();
    } catch (err) {
      console.error('Error updating card:', err);
      setError(err.message);
      toast.error('Failed to update card', {
        description: err.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#ffffff', // Use white text for dark theme
        '::placeholder': {
          color: '#888888',
        },
        backgroundColor: 'transparent',
      },
      invalid: {
        color: '#ef4444', // Red for errors
        iconColor: '#ef4444',
      },
      complete: {
        color: '#ffffff',
        iconColor: '#22c55e', // Green checkmark when complete
      },
    },
    hidePostalCode: true,
    disableLink: true, // Disable Link (autofill) integration
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Card Details</label>
        <div className="border rounded-md p-3 bg-background">
          <CardElement options={cardElementOptions} />
        </div>
        <p className="text-xs text-muted-foreground">
          Your card will be securely stored and used for future membership payments
        </p>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="cursor-pointer"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Update Card
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function MembershipCardUpdateDialog({ open, onOpenChange, membership, customerId, currentCard, onSuccess }) {
  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Payment Method</DialogTitle>
          <DialogDescription>
            {currentCard
              ? `Update the payment method for ${membership.product?.name || 'this membership'}`
              : `Add a payment method for ${membership.product?.name || 'this membership'}`
            }
          </DialogDescription>
        </DialogHeader>

        {currentCard && (
          <Alert>
            <CreditCard className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center gap-2">
                <span className="text-sm">Current card:</span>
                <span className="capitalize text-sm font-medium">{currentCard.brand}</span>
                <span className="text-sm">••••</span>
                <span className="text-sm font-medium">{currentCard.last4}</span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Elements stripe={stripePromise}>
          <CardUpdateForm
            membership={membership}
            customerId={customerId}
            onSuccess={handleSuccess}
            onCancel={() => onOpenChange(false)}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}
