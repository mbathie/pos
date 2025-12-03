'use client';

import { XCircle } from 'lucide-react';

export const membershipCancellationMeta = {
  id: 'membership-cancellation',
  title: 'Membership Cancellation',
  Icon: XCircle,
  category: 'operational'
};

export default function MembershipCancellationFeature() {
  return (
    <section id="membership-cancellation" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <XCircle className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Membership Cancellation</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Allows staff to cancel active membership subscriptions while enforcing minimum contract commitments. Cancellations are intelligently processed through Stripe using either <code className="text-sm bg-muted px-1.5 py-0.5 rounded">cancel_at_period_end</code> or <code className="text-sm bg-muted px-1.5 py-0.5 rounded">cancel_at</code> APIs based on minimum contract requirements, ensuring members retain access until their paid period or minimum contract expires.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Minimum Contract Enforcement:</strong> Honors minimum billing cycle commitments configured per price</li>
        <li><strong>Smart Cancellation Scheduling:</strong> Automatically calculates cancellation date as the later of next billing date or minimum contract end date</li>
        <li><strong>Dual Stripe API Support:</strong> Uses <code className="text-sm bg-muted px-1.5 py-0.5 rounded">cancel_at_period_end</code> for standard cancellations or <code className="text-sm bg-muted px-1.5 py-0.5 rounded">cancel_at</code> with specific timestamp for minimum contract enforcement</li>
        <li><strong>Visual Indicators:</strong> Clear UI badges showing cancellation status and date on both customer detail and memberships management pages</li>
        <li><strong>Employee Tracking:</strong> Records which employee initiated the cancellation and optional cancellation reason</li>
        <li><strong>Reactivation Support:</strong> Allows undoing scheduled cancellations before they take effect</li>
        <li><strong>AlertDialog Confirmation:</strong> User-friendly confirmation dialog showing calculated cancellation date with minimum contract footnote when applicable</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">How It Works</h3>
      <ol className="space-y-2 text-muted-foreground mb-4 list-decimal list-inside">
        <li>Staff navigates to customer detail page or memberships management page</li>
        <li>Clicks ellipsis menu (⋮) next to active membership</li>
        <li>Selects "Cancel Membership" option</li>
        <li>System calculates minimum contract date based on subscription start date + (billing frequency × minimum contract cycles)</li>
        <li>Reviews confirmation dialog showing calculated cancellation date</li>
        <li>If minimum contract extends beyond next billing date, system uses Stripe's <code className="text-sm bg-muted px-1.5 py-0.5 rounded">cancel_at</code> with specific timestamp; otherwise uses <code className="text-sm bg-muted px-1.5 py-0.5 rounded">cancel_at_period_end</code></li>
        <li>System records cancellation metadata including employee ID, reason, and whether minimum contract was enforced</li>
        <li>UI updates to show Active badge + Cancels badge with calculated date</li>
      </ol>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

      <div className="space-y-6 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 1: Standard Cancellation (No Minimum Contract)</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer has active $70/month membership, paid through Oct 31, no minimum contract</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Current date: Oct 15</li>
            <li>Next billing date: Oct 31</li>
            <li>Minimum contract: 0 (none)</li>
            <li>Staff initiates cancellation via ellipsis menu</li>
            <li><strong>System action:</strong> Sets <code className="text-xs bg-background px-1 py-0.5 rounded">cancel_at_period_end: true</code> in Stripe</li>
            <li><strong>UI updates:</strong> Shows "Active" + "Cancels: 31/10" badges</li>
            <li><strong>Customer access:</strong> Retains full membership access until Oct 31</li>
            <li><strong>Oct 31 result:</strong> Membership expires, no renewal charge</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 2: Minimum Contract Enforcement</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer signed up 2 weeks ago with 2-month minimum contract</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Subscription start: Oct 1</li>
            <li>Current date: Oct 15</li>
            <li>Next billing date: Nov 1</li>
            <li>Billing frequency: Monthly</li>
            <li>Minimum contract: 2 cycles</li>
            <li>Staff initiates cancellation via ellipsis menu</li>
            <li><strong>System calculates:</strong> Min contract date = Oct 1 + 2 months = Dec 1</li>
            <li><strong>System action:</strong> Uses <code className="text-xs bg-background px-1 py-0.5 rounded">cancel_at</code> with timestamp for Dec 1 in Stripe (later than Nov 1)</li>
            <li><strong>Stripe metadata:</strong> Includes <code className="text-xs bg-background px-1 py-0.5 rounded">min_contract_enforced: true</code></li>
            <li><strong>UI updates:</strong> Shows "Active" + "Cancels: 01/12" badges with footnote explaining minimum contract</li>
            <li><strong>Billing continues:</strong> Nov 1 renewal charge processes normally</li>
            <li><strong>Dec 1 result:</strong> Membership expires after minimum contract fulfilled</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 3: Minimum Contract Already Satisfied</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Long-time customer with 2-month minimum contract cancels after 6 months</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Subscription start: Apr 1</li>
            <li>Current date: Oct 15</li>
            <li>Next billing date: Nov 1</li>
            <li>Billing frequency: Monthly</li>
            <li>Minimum contract: 2 cycles</li>
            <li><strong>System calculates:</strong> Min contract date = Apr 1 + 2 months = Jun 1 (already passed)</li>
            <li><strong>System action:</strong> Uses <code className="text-xs bg-background px-1 py-0.5 rounded">cancel_at_period_end: true</code> in Stripe (minimum contract already satisfied)</li>
            <li><strong>UI updates:</strong> Shows "Active" + "Cancels: 01/11" badges (no footnote needed)</li>
            <li><strong>Nov 1 result:</strong> Membership expires at next billing date</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 4: Cancellation Reactivation</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer cancelled membership but changed their mind before cancellation date</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Original cancellation: Oct 15, scheduled to cancel Dec 1 (min contract enforced)</li>
            <li>Reactivation date: Oct 20</li>
            <li>Staff clicks "Undo Cancellation" in ellipsis menu</li>
            <li><strong>System action:</strong> Sets <code className="text-xs bg-background px-1 py-0.5 rounded">cancel_at_period_end: false</code> and clears <code className="text-xs bg-background px-1 py-0.5 rounded">cancel_at</code> in Stripe</li>
            <li><strong>UI updates:</strong> Removes "Cancels" badge, shows only "Active"</li>
            <li><strong>Billing resumes:</strong> All future renewal charges process normally</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 5: Weekly Billing with Minimum Contract</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer with weekly $25 membership and 4-week minimum contract</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Subscription start: Oct 1</li>
            <li>Current date: Oct 10</li>
            <li>Next billing date: Oct 15</li>
            <li>Billing frequency: Weekly</li>
            <li>Minimum contract: 4 cycles</li>
            <li><strong>System calculates:</strong> Min contract date = Oct 1 + (4 × 7 days) = Oct 29</li>
            <li><strong>System action:</strong> Uses <code className="text-xs bg-background px-1 py-0.5 rounded">cancel_at</code> with timestamp for Oct 29</li>
            <li><strong>Billing continues:</strong> Oct 15, Oct 22 renewals process normally</li>
            <li><strong>Oct 29 result:</strong> Membership expires after 4 weeks</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Core Business Logic</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/lib/payments/cancel.js</code> - Cancellation logic with minimum contract calculation and Stripe integration</li>
          <li><code>/lib/memberships.js</code> - Membership data operations (includes price population for min contract)</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">API Routes</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/api/memberships/[id]/cancel/route.js</code> - Cancel membership endpoint</li>
          <li><code>/app/api/memberships/[id]/reactivate/route.js</code> - Reactivate cancelled membership endpoint</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">UI Components</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/customers/[id]/page.js</code> - Customer detail page with cancellation dialog and badges</li>
          <li><code>/app/(app)/manage/memberships/page.js</code> - Memberships management page with cancellation status display</li>
          <li><code>/app/(app)/products/(entry)/MembershipsProductSheet.js</code> - Membership product configuration with Min Contract field</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Add cancellation analytics/reporting</li>
        <li>Email notification to customer when membership is cancelled</li>
        <li>Bulk cancellation support for multiple memberships</li>
        <li>Cancel reason dropdown with predefined options</li>
        <li>Automatic win-back campaigns before cancellation date</li>
        <li>Customer self-service cancellation in mobile app</li>
        <li>Cancellation survey/feedback collection</li>
        <li>Reactivation offer before cancellation takes effect</li>
      </ul>
    </section>
  );
}
