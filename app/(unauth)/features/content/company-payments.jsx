'use client';

import { Building2 } from 'lucide-react';

export const companyPaymentsMeta = {
  id: 'company-payments',
  title: 'Company/Group Payments',
  Icon: Building2,
  category: 'system'
};

export default function CompanyPaymentsFeature() {
  return (
    <section id="company-payments" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <Building2 className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Company/Group Payments</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Enable organizations, schools, corporate clients, and groups to purchase classes or courses for multiple individuals with deferred payment and individual waiver collection. The system immediately blocks spots when the company purchases, and participants sign waivers via unique links to complete registration.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Company Database:</strong> Store company details (name, ABN, address, contact person)</li>
        <li><strong>Bulk Booking:</strong> Purchase multiple spots in a single transaction</li>
        <li><strong>Spot Blocking:</strong> Immediately reserve spots before individual registration</li>
        <li><strong>Placeholder Customers:</strong> System creates placeholder records for each spot</li>
        <li><strong>Waiver Links:</strong> Email with unique links sent to company contact</li>
        <li><strong>Individual Registration:</strong> Each participant completes waiver via link</li>
        <li><strong>Deferred Payment:</strong> Invoice sent to company for later payment</li>
        <li><strong>Stripe Invoicing:</strong> Automatic invoice generation with Stripe</li>
        <li><strong>Partial Payments:</strong> Support for deposit and balance payments</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Workflow</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <ol className="text-sm space-y-2 text-muted-foreground list-decimal list-inside">
          <li>Staff creates company record (or selects existing)</li>
          <li>Adds class/course product to cart</li>
          <li>Selects company as payment type</li>
          <li>Specifies number of spots needed</li>
          <li>System creates placeholder customers for each spot</li>
          <li>Stripe invoice generated and sent to company</li>
          <li>Company receives email with waiver links for participants</li>
          <li>Each participant clicks link and completes waiver</li>
          <li>System converts placeholder to real customer record</li>
          <li>Company pays invoice via Stripe hosted page</li>
        </ol>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenario</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <h4 className="font-semibold text-sm mb-2">Corporate Team Building Class</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Company: "ABC Corp" (20 employees)</li>
          <li>Product: "Team Yoga Session" - $30/person</li>
          <li>Total: 20 × $30 = $600</li>
          <li>Payment terms: Net 30</li>
          <li><strong>Day 1:</strong> Invoice sent, 20 spots blocked</li>
          <li><strong>Days 2-7:</strong> Employees click waiver links, complete registration</li>
          <li><strong>Day of class:</strong> All registered employees can check in</li>
          <li><strong>Day 30:</strong> Company pays invoice</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/companies/page.js</code> - Company list</li>
          <li><code>/app/api/payments/company/route.js</code> - Company payment processing</li>
          <li><code>/lib/stripe/invoice.js</code> - Invoice generation</li>
          <li><code>/lib/email/company-waiver.js</code> - Waiver email template</li>
          <li><code>/models/Company.js</code> - Company schema</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Company self-service portal</li>
        <li>Recurring corporate bookings</li>
        <li>Corporate discount tiers</li>
        <li>Company credit accounts</li>
        <li>Multi-event corporate packages</li>
      </ul>
    </section>
  );
}
