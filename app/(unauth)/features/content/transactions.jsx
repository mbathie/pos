'use client';

import { Receipt } from 'lucide-react';

export const transactionsMeta = {
  id: 'transactions',
  title: 'Transaction Management',
  Icon: Receipt,
  category: 'system'
};

export default function TransactionsFeature() {
  return (
    <section id="transactions" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <Receipt className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Transaction Management</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Complete transaction tracking system recording all sales, payments, refunds, and membership renewals. Provides detailed reporting, filtering, receipt management, and integration with Stripe for payment reconciliation.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Transaction Records:</strong> Every sale creates a detailed transaction record</li>
        <li><strong>Payment Methods:</strong> Track cash, card, split payments, and company invoices</li>
        <li><strong>Line Items:</strong> Detailed breakdown of products, quantities, and prices</li>
        <li><strong>Customer Links:</strong> Link transactions to customer records</li>
        <li><strong>Employee Tracking:</strong> Record which employee processed the sale</li>
        <li><strong>Receipt Management:</strong> View, resend, and reprint receipts</li>
        <li><strong>Stripe Integration:</strong> Sync with Stripe payment intents and invoices</li>
        <li><strong>Refund Support:</strong> Process full or partial refunds</li>
        <li><strong>Date Filtering:</strong> Filter by date range, payment method, status</li>
        <li><strong>Export:</strong> Download transaction data for reporting</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Transaction Types</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li><strong>sale:</strong> Standard checkout transaction</li>
          <li><strong>subscription:</strong> Membership initial purchase</li>
          <li><strong>renewal:</strong> Recurring membership payment</li>
          <li><strong>refund:</strong> Full or partial refund</li>
          <li><strong>invoice:</strong> Company/group deferred payment</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Transaction Statuses</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li><strong>completed:</strong> Payment successful</li>
          <li><strong>pending:</strong> Awaiting payment (invoice)</li>
          <li><strong>partially_paid:</strong> Invoice with partial payment</li>
          <li><strong>refunded:</strong> Full refund processed</li>
          <li><strong>partially_refunded:</strong> Partial refund processed</li>
          <li><strong>failed:</strong> Payment failed</li>
          <li><strong>cancelled:</strong> Transaction cancelled</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Transaction Detail View</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Information Displayed</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Transaction ID and date</li>
          <li>Customer name and member number</li>
          <li>Employee who processed the sale</li>
          <li>Line items with quantities and prices</li>
          <li>Discounts and surcharges applied</li>
          <li>Payment method breakdown</li>
          <li>Stripe payment/invoice IDs</li>
          <li>Refund history (if applicable)</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>
      <div className="space-y-4 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Viewing Daily Sales</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Filter by today's date</li>
            <li>See total sales amount at top</li>
            <li>Click any row for details</li>
            <li>Export to CSV for accounting</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Resending Receipt</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Customer requests receipt copy</li>
            <li>Search by customer name or date</li>
            <li>Click "Resend Receipt" button</li>
            <li>Email sent to customer's address</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/transactions/page.js</code> - Transaction list</li>
          <li><code>/app/(app)/manage/transactions/[id]/page.js</code> - Transaction detail</li>
          <li><code>/app/api/transactions/route.js</code> - Transaction API</li>
          <li><code>/lib/email/receipt.js</code> - Receipt email template</li>
          <li><code>/models/Transaction.js</code> - Transaction schema</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Advanced reporting dashboard</li>
        <li>Transaction search by product</li>
        <li>Bulk receipt resending</li>
        <li>Accounting software integration</li>
        <li>Daily/weekly email summaries</li>
      </ul>
    </section>
  );
}
