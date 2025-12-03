'use client';

import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const subscriptionWebhooksMeta = {
  id: 'subscription-webhooks',
  title: 'Subscription Renewal Webhooks',
  Icon: Bell,
  category: 'operational'
};

export default function SubscriptionWebhooksFeature() {
  return (
    <section id="subscription-webhooks" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <Bell className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Subscription Renewal Webhooks</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Automatically processes recurring subscription payments through Stripe webhooks. When a subscription renews (weekly, monthly, etc.), the system receives a webhook event from Stripe, creates a transaction record, updates membership billing dates, enforces billing limits, and sends a receipt email to the customer.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Automatic Payment Processing:</strong> Processes subscription renewals without manual intervention</li>
        <li><strong>Transaction Records:</strong> Creates detailed transaction records for each renewal payment</li>
        <li><strong>Billing Date Updates:</strong> Automatically updates membership billing dates after each payment</li>
        <li><strong>Billing Limit Enforcement:</strong> Automatically cancels subscriptions after reaching configured billing maximum</li>
        <li><strong>Idempotency:</strong> Prevents duplicate transactions when Stripe sends multiple webhook events</li>
        <li><strong>Receipt Emails:</strong> Sends professional receipt emails via Brevo for each renewal payment</li>
        <li><strong>Stripe Connected Accounts:</strong> Full support for multi-tenant connected account architecture</li>
        <li><strong>Comprehensive Logging:</strong> Detailed webhook logs written to <code className="text-sm bg-muted px-1.5 py-0.5 rounded">./tmp/stripe-webhooks.log</code></li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Webhook Events Handled</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-3">
            <Badge variant="default" className="mt-0.5">invoice.paid</Badge>
            <span className="text-muted-foreground">Subscription payment succeeded - Create transaction, update membership, send receipt</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="default" className="mt-0.5">invoice.payment_succeeded</Badge>
            <span className="text-muted-foreground">Alternative payment success event</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="destructive" className="mt-0.5">invoice.payment_failed</Badge>
            <span className="text-muted-foreground">Subscription payment failed - Log error</span>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="mt-0.5">customer.subscription.deleted</Badge>
            <span className="text-muted-foreground">Subscription cancelled/expired - Log event</span>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

      <div className="space-y-6 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 1: Standard Renewal (Indefinite Subscription)</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Monthly $50 membership with no billing limit</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Initial purchase: Oct 1, 2025</li>
            <li>First renewal: Nov 1, 2025</li>
            <li><strong>Webhook received:</strong> <code className="text-xs bg-background px-1 py-0.5 rounded">invoice.paid</code></li>
            <li><strong>System actions:</strong>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>✅ Creates transaction record ($50)</li>
                <li>✅ Updates membership nextBillingDate to Dec 1</li>
                <li>✅ Sends receipt email to customer</li>
                <li>✅ Logs event to webhook log file</li>
              </ul>
            </li>
            <li><strong>Subscription continues:</strong> Renews monthly indefinitely until cancelled</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 2: Limited Billing with Auto-Cancellation</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> 6-month term membership at $20/month (billing max = 6)</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Payment 1 (Oct 1): billingCount = 1/6</li>
            <li>Payment 2 (Nov 1): billingCount = 2/6</li>
            <li>Payment 3 (Dec 1): billingCount = 3/6</li>
            <li>Payment 4 (Jan 1): billingCount = 4/6</li>
            <li>Payment 5 (Feb 1): billingCount = 5/6</li>
            <li>Payment 6 (Mar 1): billingCount = 6/6
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>✅ Final payment processed</li>
                <li>🛑 System sets <code className="text-xs bg-background px-1 py-0.5 rounded">cancel_at_period_end: true</code></li>
                <li>📅 Membership remains active until Apr 1</li>
                <li>❌ No payment on Apr 1 (subscription ended)</li>
              </ul>
            </li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 3: Idempotency - Duplicate Webhook Prevention</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Stripe sends multiple webhook events for same invoice</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Webhook 1: <code className="text-xs bg-background px-1 py-0.5 rounded">invoice.paid</code> (Nov 1, 10:00 AM)</li>
            <li><strong>First webhook processing:</strong>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>✅ Checks existing transactions for invoice ID</li>
                <li>✅ No match found, proceeds with processing</li>
                <li>✅ Creates transaction with invoice ID: <code className="text-xs bg-background px-1 py-0.5 rounded">in_123abc</code></li>
              </ul>
            </li>
            <li>Webhook 2: <code className="text-xs bg-background px-1 py-0.5 rounded">invoice.payment_succeeded</code> (Nov 1, 10:01 AM)</li>
            <li><strong>Second webhook processing:</strong>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>✅ Checks existing transactions for invoice ID</li>
                <li>⚠️ Match found! Invoice <code className="text-xs bg-background px-1 py-0.5 rounded">in_123abc</code> already processed</li>
                <li>⏭️ Skips processing, returns <code className="text-xs bg-background px-1 py-0.5 rounded">{'{ skipped: true, reason: "already_processed" }'}</code></li>
              </ul>
            </li>
            <li><strong>Result:</strong> Exactly 1 transaction created (no duplicates)</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Idempotency & Duplicate Prevention</h3>
      <p className="text-muted-foreground mb-4">
        Stripe may send multiple webhook events for the same payment (<code className="text-sm bg-muted px-1.5 py-0.5 rounded">invoice.paid</code>, <code className="text-sm bg-muted px-1.5 py-0.5 rounded">invoice.payment_succeeded</code>, <code className="text-sm bg-muted px-1.5 py-0.5 rounded">invoice_payment.paid</code>). The system checks if an invoice has already been processed before creating a transaction, ensuring exactly one transaction per payment.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Testing & Verification</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Test Subscription Renewals with Test Clock</p>
        <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`# 1. Create a subscription in POS with billing max = 2
# 2. Advance test clock to trigger renewal
node scripts/advance-test-clock.js <customerId>

# 3. Check webhook logs
tail -f tmp/stripe-webhooks.log

# 4. Verify in database
# - Transaction created with correct invoice ID
# - Membership billing dates updated
# - Billing count incremented
# - Subscription cancelled if max reached`}
        </pre>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Webhook Handler</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/api/webhooks/stripe/route.js</code> - Main webhook endpoint</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Email & Payment</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/lib/email/receipt.js</code> - Receipt email template</li>
          <li><code>/lib/payments/success.js</code> - Transaction utilities</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Testing Scripts</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/scripts/advance-test-clock.js</code> - Advance test clock</li>
          <li><code>/scripts/debug-stripe-invoice.js</code> - Debug invoice structure</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Verification Checklist</h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-green-600">✅</span>
          <span className="text-muted-foreground">Transaction created with status 'completed'</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">✅</span>
          <span className="text-muted-foreground">Transaction has correct invoice ID</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">✅</span>
          <span className="text-muted-foreground">No duplicate transactions for same invoice</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">✅</span>
          <span className="text-muted-foreground">Membership billing dates updated</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">✅</span>
          <span className="text-muted-foreground">Billing count incremented in Stripe metadata</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">✅</span>
          <span className="text-muted-foreground">Subscription cancelled if billing max reached</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">✅</span>
          <span className="text-muted-foreground">Receipt email sent successfully</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">✅</span>
          <span className="text-muted-foreground">Webhook event logged to file</span>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Implement customer.subscription.deleted webhook handler</li>
        <li>Update membership status to 'cancelled' when subscription deleted</li>
        <li>Add retry logic for failed email sends</li>
        <li>Customer notification for failed payments</li>
        <li>Automated dunning emails (payment reminders)</li>
        <li>Subscription renewal analytics dashboard</li>
        <li>Webhook event replay functionality</li>
        <li>Configurable webhook timeout settings</li>
        <li>Support for metered billing and usage-based pricing</li>
        <li>Automatic refund processing for disputes</li>
        <li>Integration with accounting software (QuickBooks, Xero)</li>
      </ul>
    </section>
  );
}
