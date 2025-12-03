'use client';

import { Link2 } from 'lucide-react';

export const invoicePaymentLinksMeta = {
  id: 'invoice-payment-links',
  title: 'Invoice Payment Links',
  Icon: Link2,
  category: 'system'
};

export default function InvoicePaymentLinksFeature() {
  return (
    <section id="invoice-payment-links" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <Link2 className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Invoice Payment Links</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        A public-facing payment page that allows companies to pay invoices without logging in.
        Supports partial payments with configurable minimum payment requirements, integrates with
        Stripe Checkout, and automatically updates invoice status via webhooks.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Token-Based Access:</strong> Secure links with unique tokens - no login required</li>
        <li><strong>Organization Branding:</strong> Shows org logo and name on payment page</li>
        <li><strong>Invoice Summary:</strong> Displays total, amount paid, and remaining balance</li>
        <li><strong>Flexible Payments:</strong> Pay any amount between minimum and full balance</li>
        <li><strong>Quick Actions:</strong> "Pay Minimum" and "Pay Full Amount" buttons</li>
        <li><strong>Minimum Enforcement:</strong> Configurable minimum payment percentage per org</li>
        <li><strong>Stripe Integration:</strong> Redirects to secure Stripe Checkout</li>
        <li><strong>Auto Status Updates:</strong> Invoice status updated via webhooks</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">How It Works</h3>
      <div className="space-y-4 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Step 1: Generate Payment Link</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Staff opens transaction detail page</li>
            <li>Clicks "Generate Payment Link" button</li>
            <li>System creates secure token and returns URL</li>
            <li>URL format: <code>/pay/{"{transactionId}"}?token={"{secureToken}"}</code></li>
            <li>Link can be emailed or shared with company contact</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Step 2: Company Opens Link</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Company contact clicks payment link</li>
            <li>Sees invoice summary with org branding</li>
            <li>Reviews total amount and remaining balance</li>
            <li>If minimum payment required, sees minimum amount message</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Step 3: Make Payment</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Enters payment amount (or clicks quick button)</li>
            <li>Clicks "Continue to Payment"</li>
            <li>Redirected to Stripe Checkout</li>
            <li>Completes payment with card</li>
            <li>Redirected back to success page</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Step 4: Status Update</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Stripe sends webhook on successful payment</li>
            <li>System updates invoice amount paid</li>
            <li>If fully paid, marks invoice as "paid"</li>
            <li>If partial, marks as "partially_paid"</li>
            <li>Company can make additional payments until fully paid</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Minimum Payment Settings</h3>
      <p className="text-muted-foreground mb-4">
        Organizations can require a minimum percentage payment on first invoice payment:
      </p>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Default:</strong> 50% of invoice total</li>
        <li><strong>Configurable:</strong> 0-100% in Settings → Financial</li>
        <li><strong>Smart Logic:</strong> Once minimum is met, subsequent payments can be any amount</li>
        <li><strong>Validation:</strong> Button disabled if amount is below minimum</li>
      </ul>

      <div className="bg-muted p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-sm mb-2">Example: $1,000 Invoice with 50% Minimum</h4>
        <table className="text-sm w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Payment #</th>
              <th className="text-left py-2">Amount</th>
              <th className="text-left py-2">Min Required</th>
              <th className="text-left py-2">Remaining</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2">1st</td>
              <td className="py-2">$500</td>
              <td className="py-2">$500 (50%)</td>
              <td className="py-2">$500</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">2nd</td>
              <td className="py-2">$200</td>
              <td className="py-2">$0.01</td>
              <td className="py-2">$300</td>
            </tr>
            <tr>
              <td className="py-2">3rd</td>
              <td className="py-2">$300</td>
              <td className="py-2">$0.01</td>
              <td className="py-2">$0 (Paid)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Technical Implementation</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Relevant Files</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(unauth)/pay/[id]/page.js</code> - Public payment page</li>
          <li><code>/app/(unauth)/pay/[id]/success/page.js</code> - Payment success page</li>
          <li><code>/app/api/unauth/payment/[id]/route.js</code> - Get invoice info (public)</li>
          <li><code>/app/api/unauth/payment/[id]/checkout/route.js</code> - Create Stripe checkout</li>
          <li><code>/app/api/transactions/[id]/payment-link/route.js</code> - Generate payment link</li>
          <li><code>/app/api/org/settings/route.js</code> - Org settings including min payment %</li>
        </ul>
      </div>

      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Database Schema</p>
        <pre className="text-xs bg-background p-3 rounded mt-2 overflow-x-auto">
{`// Org model
{
  minInvoicePaymentPercent: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  }
}

// Transaction model
{
  paymentLinkToken: String,  // Secure token for payment access
  invoiceAmountPaid: Number,
  invoiceAmountDue: Number,
  invoiceStatus: String      // 'open', 'partially_paid', 'paid'
}`}
        </pre>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Security</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Token Validation:</strong> Each request validates token matches transaction</li>
        <li><strong>No Authentication:</strong> Public page - no login required (by design)</li>
        <li><strong>Amount Validation:</strong> Prevents overpayment and underpayment</li>
        <li><strong>Stripe Security:</strong> All payments processed through Stripe Checkout</li>
      </ul>
    </section>
  );
}
