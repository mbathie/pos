'use client';

import { CreditCard } from 'lucide-react';

export const membershipCardManagementMeta = {
  id: 'membership-card-management',
  title: 'Membership Card Management',
  Icon: CreditCard,
  category: 'operational'
};

export default function MembershipCardManagementFeature() {
  return (
    <section id="membership-card-management" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <CreditCard className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Membership Card Management</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Allows staff to view and update payment methods for active membership subscriptions directly from the customer detail page. Provides a secure, PCI-compliant way to manually enter or update credit/debit cards for future subscription payments using Stripe Elements, with full support for Stripe Connected Accounts architecture.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Card Display:</strong> Shows current card on file with brand, last 4 digits, and expiration date</li>
        <li><strong>Secure Card Entry:</strong> PCI-compliant card input using Stripe Elements (no card data touches your servers)</li>
        <li><strong>Manual Updates:</strong> Staff can update payment methods before subscription renewal or when customer provides new card</li>
        <li><strong>Connected Accounts Support:</strong> Automatically clones payment methods from platform to connected accounts</li>
        <li><strong>Subscription Updates:</strong> Updates subscription's default payment method in Stripe</li>
        <li><strong>Real-time Validation:</strong> Stripe validates card details as they're entered</li>
        <li><strong>Visual Feedback:</strong> Green "Update" button and clear card display for easy access</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">How It Works</h3>
      <ol className="space-y-2 text-muted-foreground mb-4 list-decimal list-inside">
        <li>Staff navigates to customer detail page</li>
        <li>Views membership status section showing "Card on File"</li>
        <li>Clicks green "Update" button next to card information</li>
        <li>Dialog opens showing current card (if any) and Stripe Elements form</li>
        <li>Staff enters new card details (number, expiry, CVC)</li>
        <li>Stripe validates card in real-time (shows errors for invalid input)</li>
        <li>Clicks "Update Card" button</li>
        <li>System creates payment method via Stripe API</li>
        <li>System clones payment method to connected account (if platform-owned)</li>
        <li>System attaches payment method to Stripe customer</li>
        <li>System updates subscription's default payment method</li>
        <li>UI refreshes showing updated card information</li>
      </ol>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

      <div className="space-y-6 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 1: Failed Payment - Customer Provides New Card</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer's card failed, they come in with a new card</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Current card on file: Visa ••0341 (expired)</li>
            <li>Staff opens customer detail page</li>
            <li>Sees "Card on File: Visa •••• 0341 1/2024" (expired)</li>
            <li>Clicks "Update" button</li>
            <li>Enters customer's new card: 4242424242424242, 12/27, 123</li>
            <li><strong>System action:</strong> Creates payment method, clones to connected account, updates subscription</li>
            <li><strong>Result:</strong> Card on file now shows "Visa •••• 4242 12/2027"</li>
            <li><strong>Next billing:</strong> Future subscription payments will use new card</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 2: Proactive Update Before Expiry</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer's card expires soon, they provide updated expiry</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Current card: Visa ••5566 expires 02/2026 (next month)</li>
            <li>Customer gets new card with updated expiry: same number, new expiry 05/2029</li>
            <li>Staff updates card through dialog</li>
            <li><strong>System action:</strong> Updates payment method with new expiry date</li>
            <li><strong>Result:</strong> Prevents payment failure from expired card</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 3: New Membership Without Card</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer signed up in person without providing card, wants to add it now</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Membership active but showing "No card on file"</li>
            <li>Staff clicks "Add Card" button</li>
            <li>Enters customer's card details</li>
            <li><strong>System action:</strong> Adds card to subscription for future payments</li>
            <li><strong>Result:</strong> Future renewal payments will process automatically</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Technical Details</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Stripe Connected Accounts</p>
        <p className="text-sm text-muted-foreground mb-2">
          This system properly handles Stripe's Connected Accounts architecture:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
          <li>Payment methods created via Stripe Elements belong to platform account</li>
          <li>System automatically clones payment methods to connected account</li>
          <li>Subscriptions always use connected account's payment methods</li>
          <li>Proper error handling for cross-account payment method issues</li>
        </ul>

        <p className="text-sm font-semibold mt-3 mb-2">Security & Compliance</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
          <li>PCI DSS compliant - card data never touches your servers</li>
          <li>Stripe Elements provides secure, hosted input fields</li>
          <li>HTTPS required for Stripe Elements to function</li>
          <li>Real-time validation prevents invalid card submissions</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Frontend Components</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/components/membership-card-on-file.jsx</code> - Card display component with update button</li>
          <li><code>/components/membership-card-update-dialog.jsx</code> - Dialog with Stripe Elements for secure card entry</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">API Routes</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/api/customers/[id]/memberships/[membershipId]/payment-method/route.js</code> - GET: Retrieve current payment method</li>
          <li><code>/app/api/customers/[id]/memberships/[membershipId]/payment-method/update/route.js</code> - POST: Update subscription payment method</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Environment Configuration</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> - Stripe publishable key for frontend initialization</li>
          <li><code>STRIPE_SECRET_KEY</code> - Stripe secret key for backend API calls</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">NPM Packages</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>@stripe/stripe-js</code> - Stripe.js library for loading Stripe</li>
          <li><code>@stripe/react-stripe-js</code> - React components for Stripe Elements</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Testing</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Test Cards (Stripe Test Mode)</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
          <li><strong>4242 4242 4242 4242</strong> - Visa (succeeds)</li>
          <li><strong>5555 5555 5555 4444</strong> - Mastercard (succeeds)</li>
          <li><strong>4000 0000 0000 0002</strong> - Visa (card declined)</li>
          <li>Any future expiry date (e.g., 12/27)</li>
          <li>Any 3-digit CVC (e.g., 123)</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Verification Steps</p>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside ml-4">
          <li>Update card through UI</li>
          <li>Verify card displays updated information</li>
          <li>Check Stripe dashboard - subscription should show new payment method</li>
          <li>Advance test clock (or wait for next billing) to verify charges use new card</li>
        </ol>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Limitations</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Terminal payments (card_present) cannot be saved for future use - Stripe limitation</li>
        <li>Requires HTTPS connection for Stripe Elements to function</li>
        <li>Only supports card payments (credit/debit cards)</li>
        <li>Cannot display full card number for security reasons (only last 4 digits)</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Support for ACH/bank account payments</li>
        <li>Customer self-service card updates via mobile app</li>
        <li>Automatic email notifications when card expires soon</li>
        <li>Card update reminders before renewal date</li>
        <li>Support for digital wallets (Apple Pay, Google Pay)</li>
        <li>Payment method history/audit log</li>
        <li>Bulk card update for family memberships</li>
      </ul>
    </section>
  );
}
