'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, DollarSign, CreditCard, Banknote, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import DiscountPinDialog from './pin-dialog-discount';
import { isActionRestricted } from '@/lib/permissions';

export function RefundDialog({ transaction, onRefundComplete, trigger, currentEmployee }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('');
  const [refundSummary, setRefundSummary] = useState(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingRefund, setPendingRefund] = useState(null);

  // Fetch refund summary when dialog opens
  useEffect(() => {
    if (open && transaction?._id) {
      fetchRefundSummary();
    }
  }, [open, transaction]);

  const fetchRefundSummary = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/transactions/${transaction._id}/refund`);
      if (res.ok) {
        const data = await res.json();
        setRefundSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching refund summary:', error);
    }
  };

  const handleRefund = async (e) => {
    e.preventDefault();

    const amount = parseFloat(refundAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    if (refundSummary && amount > refundSummary.maxRefundable) {
      toast.error(`Refund amount cannot exceed $${refundSummary.maxRefundable.toFixed(2)}`);
      return;
    }

    // Check if current employee needs PIN authorization
    const needsAuthorization = currentEmployee ? isActionRestricted(currentEmployee.role, 'process_refund') : true;

    if (needsAuthorization) {
      // Store the refund details and show PIN dialog
      setPendingRefund({ amount, reason });
      setShowPinDialog(true);
    } else {
      // Process refund directly
      await processRefund(amount, reason);
    }
  };

  const processRefund = async (amount, refundReason, authorizerId = null, refundEmployeeId = null) => {
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/transactions/${transaction._id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: refundReason, authorizerId, refundEmployeeId })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Refund of $${amount.toFixed(2)} processed successfully`);

        // Reset form
        setRefundAmount('');
        setReason('');
        setPendingRefund(null);
        setOpen(false);

        // Notify parent
        if (onRefundComplete) {
          onRefundComplete(data.transaction);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to process refund");
      }
    } catch (error) {
      console.error('Refund error:', error);
      toast.error("An error occurred while processing the refund");
    } finally {
      setLoading(false);
    }
  };

  const handlePinSuccess = (data) => {
    // PIN verified, process the pending refund with authorizer ID
    // Use authorizer's ID as the employee who performed the refund
    if (pendingRefund) {
      processRefund(pendingRefund.amount, pendingRefund.reason, data.authorizer.id, data.authorizer.id);
    }
  };

  const handleQuickRefund = (percentage) => {
    if (refundSummary) {
      const amount = (refundSummary.maxRefundable * percentage).toFixed(2);
      setRefundAmount(amount);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Refund Transaction</DialogTitle>
          <DialogDescription>
            Process a full or partial refund for this transaction
          </DialogDescription>
        </DialogHeader>

        {refundSummary && (
          <div className="space-y-4">
            {/* Transaction Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Original Total</span>
                <span className="font-medium">${transaction.total?.toFixed(2)}</span>
              </div>

              {refundSummary.hasRefunds && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Refunded</span>
                    <span className="font-medium text-destructive">
                      -${refundSummary.totalRefunded.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Remaining Refundable</span>
                      <span className="font-semibold">${refundSummary.maxRefundable.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Payment Method Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Payment Method:</span>
              <Badge variant="outline" className="flex items-center gap-1">
                {transaction.paymentMethod === 'card' ? (
                  <><CreditCard className="h-3 w-3" /> Stripe</>
                ) : (
                  <><Banknote className="h-3 w-3" /> Cash</>
                )}
              </Badge>
            </div>

            {/* Warning for fully refunded */}
            {refundSummary.isFullyRefunded && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This transaction has been fully refunded.
                </AlertDescription>
              </Alert>
            )}

            {/* Refund Form */}
            {!refundSummary.isFullyRefunded && (
              <form onSubmit={handleRefund} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Refund Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={refundSummary.maxRefundable}
                      placeholder="0.00"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>

                  {/* Quick refund buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickRefund(0.25)}
                      className="cursor-pointer"
                    >
                      25%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickRefund(0.5)}
                      className="cursor-pointer"
                    >
                      50%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickRefund(0.75)}
                      className="cursor-pointer"
                    >
                      75%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickRefund(1)}
                      className="cursor-pointer"
                    >
                      Full
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Reason for refund..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={loading}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !refundAmount}
                    className="cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Process Refund</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    <DiscountPinDialog
      open={showPinDialog}
      onOpenChange={setShowPinDialog}
      onSuccess={handlePinSuccess}
      permission="refund:process"
    />
  </>
  );
}
