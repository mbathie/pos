'use client';

import { Percent } from 'lucide-react';

export const discountsAdjustmentsMeta = {
  id: 'discounts-adjustments',
  title: 'Discounts & Adjustments',
  Icon: Percent,
  category: 'system'
};

export default function DiscountsAdjustmentsFeature() {
  return (
    <section id="discounts-adjustments" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <Percent className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Discounts & Adjustments</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Create and manage discounts, surcharges, and price adjustments that can be applied during checkout. Supports percentage and fixed-amount adjustments, product-specific rules, automatic application, and staff authorization controls.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Flexible Types:</strong> Create discounts (reduce price) or surcharges (add to price)</li>
        <li><strong>Value Options:</strong> Percentage-based (e.g., 10%) or fixed amount (e.g., $5 off)</li>
        <li><strong>Max Value Cap:</strong> Set maximum dollar amount for percentage discounts (e.g., 10% off max $10)</li>
        <li><strong>Multiple Adjustments:</strong> Different discount values per product category in single adjustment</li>
        <li><strong>Automatic Assignment:</strong> Toggle auto-apply for customer-specific discounts during checkout</li>
        <li><strong>Product Restrictions:</strong> "Must Have" products - require specific items for discount to apply</li>
        <li><strong>Usage Limits:</strong> Total usage cap and per-customer usage limits</li>
        <li><strong>Frequency Control:</strong> Limit how often customers can use (daily, weekly, monthly)</li>
        <li><strong>Days of Week:</strong> Restrict discounts to specific days (e.g., weekends only)</li>
        <li><strong>Discount Codes:</strong> Optional tracking codes for reporting and analytics</li>
        <li><strong>Customer Requirement:</strong> Require customer connected to cart for discount to apply</li>
        <li><strong>Membership Rules:</strong> Prevent application when membership is suspended</li>
        <li><strong>Staff Authorization:</strong> Require MANAGER role for manual discount application</li>
        <li><strong>Date Ranges:</strong> Set start/end dates or make recurring (no expiry)</li>
        <li><strong>Status Control:</strong> Enable/disable adjustments without deleting them</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Configuration</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Adjustment Details</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Adjustment type: Discount or Surcharge</li>
          <li>Name (display name shown to customers)</li>
          <li>Code (optional - e.g., SUMMER10, for tracking/reporting)</li>
          <li>Description (internal notes, not shown to customers)</li>
          <li>Auto-assignment toggle (automatically apply when conditions met)</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Must Haves (Product/Category Restrictions)</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Select specific products/categories customer must purchase</li>
          <li>Leave blank to apply to all products</li>
          <li>Multiple selections allowed (e.g., "Memberships" OR "Coffee")</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Adjustments (Product-Specific Values)</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Add multiple adjustments with different values per product/category</li>
          <li>For each adjustment: Select product/category, Type (% or $), Value, Max $ cap</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Limits</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Start date / End date (leave blank for permanent)</li>
          <li>Usage limit (total): Maximum times across all customers</li>
          <li>Per-customer limit: Maximum times per customer</li>
          <li>Frequency: How often customer can use (Daily, Weekly, Monthly)</li>
          <li>Days of Week: Restrict to specific days</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

      <div className="space-y-6 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 1: Seasonal Discount with Auto-Apply</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> 15% summer discount for all memberships (Jan-Feb)</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Name: "Summer Special", Type: Discount, Value: 15%</li>
            <li>Auto-assign: ON, Products: All memberships</li>
            <li>Start: Jan 1, 2025, End: Feb 28, 2025</li>
            <li><strong>Checkout behavior:</strong> Automatically applies during Jan-Feb</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 2: Credit Card Surcharge</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> 1.5% card processing fee</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Name: "Card Processing Fee", Type: Surcharge, Value: 1.5%</li>
            <li>Auto-assign: OFF (manually added)</li>
            <li><strong>Cart display:</strong> Subtotal $100 → Fee +$1.50 → Total $101.50</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 3: Weekend Special with Usage Limits</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> 20% off weekends only, limited redemptions</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Name: "Weekend Special", Code: WEEKEND20</li>
            <li>Days: Saturday ✓, Sunday ✓ only</li>
            <li>Usage limit: 100 total, Per-customer: 1 time</li>
            <li>Require Customer: ON</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Management</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/adjustments/page.js</code> - Adjustments list</li>
          <li><code>/app/(app)/manage/adjustments/[id]/edit/page.js</code> - Adjustment editor</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Application Logic</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/lib/adjustments.js</code> - Calculation logic</li>
          <li><code>/models/Adjustment.js</code> - Adjustment schema</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Tiered discounts (spend more, save more)</li>
        <li>BOGO (Buy One Get One) discount types</li>
        <li>Coupon codes for customer self-service</li>
        <li>Customer group restrictions (members only, VIP only)</li>
        <li>Combinability rules (which discounts can stack)</li>
        <li>Discount analytics and reporting</li>
      </ul>
    </section>
  );
}
