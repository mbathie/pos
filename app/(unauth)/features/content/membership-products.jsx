'use client';

import { Package } from 'lucide-react';

export const membershipProductsMeta = {
  id: 'membership-products',
  title: 'Membership Products',
  Icon: Package,
  category: 'product'
};

export default function MembershipProductsFeature() {
  return (
    <section id="membership-products" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <Package className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Membership Products</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Create and configure membership subscription products with flexible pricing, billing frequencies, and automated payment processing through Stripe. Memberships support QR code check-ins, waivers, automatic billing, and comprehensive tracking.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Flexible Pricing:</strong> Create multiple price tiers (e.g., Adult, Child, Student) for a single membership product</li>
        <li><strong>Billing Frequencies:</strong> Support for weekly, monthly, quarterly, and annual billing cycles</li>
        <li><strong>Billing Limits:</strong> Optional maximum number of payments (e.g., 6-month term membership)</li>
        <li><strong>Automatic Discounts:</strong> Assign discounts that auto-apply during checkout when customer is connected</li>
        <li><strong>Waiver Requirements:</strong> Require digital waiver acceptance before membership purchase</li>
        <li><strong>QR Code Generation:</strong> Automatic QR codes for easy check-in at facility entrance</li>
        <li><strong>Stripe Integration:</strong> Seamless subscription management with Stripe Connected Accounts</li>
        <li><strong>Member Numbers:</strong> Automatic sequential member number assignment</li>
        <li><strong>Terms & Conditions:</strong> Custom T&Cs displayed during checkout</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Product Configuration</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Basic Information</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Product name (e.g., "Premium Gym Membership")</li>
          <li>Description (optional)</li>
          <li>Terms & Conditions (custom HTML/text)</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Pricing Options</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Price name (e.g., "Adult", "Student", "Senior")</li>
          <li>Amount (e.g., $70.00)</li>
          <li>Billing frequency (weekly, monthly, quarterly, annual)</li>
          <li>Billing max (optional - e.g., 6 for 6-month term)</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Additional Settings</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Waiver requirement (optional)</li>
          <li>Auto-assign discounts (optional)</li>
          <li>GST/Tax settings</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

      <div className="space-y-6 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 1: Basic Monthly Membership</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Simple monthly gym membership</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Product name: "Standard Gym Membership"</li>
            <li>Price: $50/month</li>
            <li>Billing frequency: Monthly</li>
            <li>Billing max: None (indefinite)</li>
            <li>Waiver required: Yes</li>
            <li><strong>Checkout flow:</strong> Customer signs waiver → Enters payment → Receives QR code email</li>
            <li><strong>Billing:</strong> Auto-charges $50 every month until cancelled</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 2: Multi-Tier Pricing with Discounts</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Family membership with multiple price tiers and early bird discount</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Product name: "Family Membership"</li>
            <li>Prices:
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>Adult: $70/month</li>
                <li>Child (under 16): $30/month</li>
                <li>Student (with ID): $50/month</li>
              </ul>
            </li>
            <li>Auto-assign discount: "Early Bird 10%" (automatically applies during Jan-Feb signups)</li>
            <li><strong>Example purchase:</strong> Adult + 2 Children = $70 + $30 + $30 = $130/month</li>
            <li><strong>With early bird:</strong> $130 × 0.9 = $117/month</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 3: Fixed-Term Membership</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> 6-month summer membership program</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Product name: "Summer Membership (6 months)"</li>
            <li>Price: $60/month</li>
            <li>Billing frequency: Monthly</li>
            <li>Billing max: 6 payments</li>
            <li><strong>Payment schedule:</strong> 6 monthly payments of $60 (total $360)</li>
            <li><strong>After payment 6:</strong> Subscription automatically cancelled at period end</li>
            <li><strong>Customer option:</strong> Can purchase new membership after term ends</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Product Management</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/products/page.js</code> - Products list view</li>
          <li><code>/app/(app)/manage/products/[id]/edit/page.js</code> - Product editor</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Checkout & Purchase</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/shop/(membership)/subscriptions/[id]/page.js</code> - Membership checkout</li>
          <li><code>/app/api/payments/subscription/create/route.js</code> - Subscription creation API</li>
          <li><code>/app/api/payments/subscription/complete/route.js</code> - Payment completion</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Models</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/models/Product.js</code> - Product schema</li>
          <li><code>/models/Membership.js</code> - Membership subscription schema</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Family membership packages (link multiple memberships)</li>
        <li>Membership tier upgrades/downgrades</li>
        <li>Trial periods (7-day free trial)</li>
        <li>Proration when upgrading mid-cycle</li>
        <li>Membership transfer between customers</li>
        <li>Custom fields for membership data collection</li>
        <li>Membership benefits/perks tracking</li>
        <li>Integration with access control systems</li>
      </ul>
    </section>
  );
}
