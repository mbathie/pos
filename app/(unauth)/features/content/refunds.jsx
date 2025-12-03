'use client';

import { XCircle } from 'lucide-react';

export const refundsMeta = {
  id: 'refunds',
  title: 'Refund System',
  Icon: XCircle,
  category: 'system'
};

export default function RefundsFeature() {
  return (
    <section id="refunds" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <XCircle className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Refund System</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Process full or partial refunds for completed transactions with Stripe integration for card payments. Maintains audit trail, automatically updates inventory, and handles various payment method refund scenarios.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Full Refunds:</strong> Refund entire transaction amount</li>
        <li><strong>Partial Refunds:</strong> Refund specific line items or custom amounts</li>
        <li><strong>Stripe Integration:</strong> Automatic refund processing for card payments</li>
        <li><strong>Cash Refunds:</strong> Record cash refunds with manual confirmation</li>
        <li><strong>Reason Tracking:</strong> Record refund reason for reporting</li>
        <li><strong>Audit Trail:</strong> Log which employee processed refund and when</li>
        <li><strong>Membership Handling:</strong> Special logic for subscription refunds</li>
        <li><strong>Inventory Updates:</strong> Optionally restore stock for returned items</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Refund Process</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <ol className="text-sm space-y-2 text-muted-foreground list-decimal list-inside">
          <li>Navigate to transaction detail page</li>
          <li>Click "Refund" button</li>
          <li>Select full or partial refund</li>
          <li>For partial: select line items or enter custom amount</li>
          <li>Enter refund reason (optional but recommended)</li>
          <li>Confirm refund</li>
          <li>System processes refund via Stripe (for card payments)</li>
          <li>Transaction status updated to "refunded" or "partially_refunded"</li>
        </ol>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Refund Scenarios</h3>
      <div className="space-y-4 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 1: Full Card Refund</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Original: $50 card payment</li>
            <li>Select "Full Refund"</li>
            <li>Stripe refunds $50 to customer's card</li>
            <li>Transaction status: "refunded"</li>
            <li>Customer sees refund in 5-10 business days</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 2: Partial Refund - Line Item</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Original: Coffee $5 + Muffin $4 = $9</li>
            <li>Customer returns muffin only</li>
            <li>Select "Partial Refund" → Select "Muffin" item</li>
            <li>Refund amount: $4</li>
            <li>Transaction status: "partially_refunded"</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 3: Cash Transaction Refund</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Original: $20 cash payment</li>
            <li>Staff processes refund in system</li>
            <li>Cash drawer opened for refund</li>
            <li>Staff confirms cash given to customer</li>
            <li>Transaction status: "refunded"</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 4: Membership Initial Payment Refund</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Original: $70 membership signup</li>
            <li>Customer wants to cancel within cooling-off period</li>
            <li>Refund processes via Stripe</li>
            <li>Membership status updated to "cancelled"</li>
            <li>Subscription cancelled in Stripe</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Authorization</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li><strong>Staff:</strong> Can process refunds up to $X (configurable limit)</li>
          <li><strong>Manager:</strong> Can process any refund amount</li>
          <li><strong>Over Limit:</strong> Manager PIN required for authorization</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/transactions/[id]/page.js</code> - Refund UI</li>
          <li><code>/app/api/transactions/[id]/refund/route.js</code> - Refund API</li>
          <li><code>/lib/payments/refund.js</code> - Refund processing logic</li>
          <li><code>/models/Transaction.js</code> - Refund records in transaction</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Refund analytics and reporting</li>
        <li>Automatic inventory restoration option</li>
        <li>Customer notification on refund</li>
        <li>Refund reason analytics</li>
        <li>Integration with accounting software</li>
        <li>Gift card credit option instead of refund</li>
      </ul>
    </section>
  );
}
