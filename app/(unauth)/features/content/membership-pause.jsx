'use client';

import { PauseCircle } from 'lucide-react';

export const membershipPauseMeta = {
  id: 'membership-pause',
  title: 'Membership Pause/Suspension',
  Icon: PauseCircle,
  category: 'operational'
};

export default function MembershipPauseFeature() {
  return (
    <section id="membership-pause" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <PauseCircle className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Membership Pause/Suspension</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Allows members to temporarily pause their membership subscription for a specified number of days. During the pause period, the member's billing is suspended and they receive a prorated credit for the unused portion of their current billing period. The system enforces organization-defined limits on suspension days per year.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Flexible Pause Duration:</strong> Members can pause from 1 day up to the organization's configured maximum</li>
        <li><strong>365-Day Rolling Limit:</strong> Suspension days are tracked on a rolling 365-day period from subscription start date</li>
        <li><strong>Prorated Credits:</strong> Members receive automatic credit for unused days in the current billing period</li>
        <li><strong>Scheduled Pauses:</strong> Can schedule pauses to start on a future date (before next billing date)</li>
        <li><strong>Early Resume with Credit Adjustment:</strong> When resuming early, credits are automatically adjusted for unused pause days</li>
        <li><strong>Email Notifications:</strong> Automatic email notifications when memberships are suspended or resumed</li>
        <li><strong>Stripe Integration:</strong> Seamlessly integrates with Stripe's pause_collection API for connected accounts</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Configuration</h3>
      <p className="text-muted-foreground mb-2">
        Organizations can set the maximum suspension days allowed per year in <strong>Settings → Organization</strong>:
      </p>
      <ul className="space-y-1 text-muted-foreground mb-4">
        <li>Default: 30 days per year</li>
        <li>Range: 0-365 days</li>
        <li>Setting: <code className="text-sm bg-muted px-1.5 py-0.5 rounded">org.membershipSuspensionDaysPerYear</code></li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

      <div className="space-y-6 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 1: Short-Term Travel</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer has $50/month membership, traveling for 2 weeks</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Current billing cycle: Oct 1-31 (30 days)</li>
            <li>Pause date: Oct 10</li>
            <li>Pause duration: 14 days</li>
            <li><strong>Credit calculation:</strong> 14 days × ($50/30) = $23.33 credit</li>
            <li><strong>Resume date:</strong> Oct 24</li>
            <li><strong>Next billing:</strong> Oct 31 (adjusted amount: $50 - $23.33 = $26.67)</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 2: Extended Leave (Multi-Month)</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer has $20/month membership, taking 3-month sabbatical</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Current billing cycle: Sept 18 - Oct 18</li>
            <li>Pause date: Sept 22</li>
            <li>Pause duration: 90 days</li>
            <li><strong>Credit calculation:</strong> Only for remaining days in September (26 days × $20/30 = $17.33)</li>
            <li><strong>Skipped billing cycles:</strong> October and November entirely skipped</li>
            <li><strong>Resume date:</strong> Dec 21</li>
            <li><strong>Next billing:</strong> Dec 21 (new billing cycle starts)</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 3: Early Resume with Credit Adjustment</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Customer resumes 5 days early from 14-day pause</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Original pause: 14 days ($50/month membership)</li>
            <li>Actual pause: 9 days</li>
            <li><strong>Original credit:</strong> 14 × ($50/30) = $23.33</li>
            <li><strong>Adjusted credit:</strong> 9 × ($50/30) = $15.00</li>
            <li><strong>Adjustment invoice:</strong> +$8.33 (to reduce the credit)</li>
            <li><strong>Result:</strong> Customer's credit is adjusted to reflect actual pause duration</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Core Business Logic</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/lib/payments/suspend.js</code> - Main suspension logic</li>
          <li><code>/lib/memberships.js</code> - Membership data access layer</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">API Routes</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/api/memberships/[id]/pause/route.js</code></li>
          <li><code>/app/api/memberships/[id]/resume/route.js</code></li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Customer self-service pause via mobile app</li>
        <li>Automatic resume reminders (email reminder before auto-resume)</li>
        <li>Suspension reason categories for reporting</li>
        <li>HTML email templates with branding</li>
        <li>SMS notifications option</li>
        <li>Webhook notifications for integrations</li>
      </ul>
    </section>
  );
}
