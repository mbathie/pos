'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Edit2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MembershipCardUpdateDialog } from './membership-card-update-dialog';

export function MembershipCardOnFile({ membership, customerId, onCardUpdated }) {
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  useEffect(() => {
    fetchPaymentMethod();
  }, [membership._id]);

  const fetchPaymentMethod = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/customers/${customerId}/memberships/${membership._id}/payment-method`
      );

      if (response.ok) {
        const data = await response.json();
        setPaymentMethod(data.paymentMethod);
      } else {
        console.error('Failed to fetch payment method');
      }
    } catch (error) {
      console.error('Error fetching payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardUpdated = () => {
    fetchPaymentMethod();
    if (onCardUpdated) {
      onCardUpdated();
    }
  };

  if (loading) {
    return (
      <div>
        <label className="text-sm font-medium text-muted-foreground">Card on File</label>
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <label className="text-sm font-medium text-muted-foreground">Card on File</label>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {paymentMethod ? (
              <>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{paymentMethod.brand}</span>
                <span>••••</span>
                <span>{paymentMethod.last4}</span>
                <span className="text-muted-foreground">
                  {paymentMethod.expMonth}/{paymentMethod.expYear}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">No card on file</span>
            )}
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setUpdateDialogOpen(true)}
            className="cursor-pointer h-8 px-2"
          >
            <Edit2 className="h-3 w-3 mr-1" />
            {paymentMethod ? 'Update' : 'Add Card'}
          </Button>
        </div>
      </div>

      <MembershipCardUpdateDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        membership={membership}
        customerId={customerId}
        currentCard={paymentMethod}
        onSuccess={handleCardUpdated}
      />
    </>
  );
}
