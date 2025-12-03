'use client';

import { Users } from 'lucide-react';

export const customerManagementMeta = {
  id: 'customer-management',
  title: 'Customer Management',
  Icon: Users,
  category: 'system'
};

export default function CustomerManagementFeature() {
  return (
    <section id="customer-management" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <Users className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Customer Management</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Comprehensive customer database with profiles, transaction history, membership tracking, dependents management, and QR code generation. Enables quick customer lookup during checkout and detailed account management.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Customer Profiles:</strong> Store name, email, phone, address, DOB, gender</li>
        <li><strong>Quick Lookup:</strong> Search by name, email, phone, or member number during checkout</li>
        <li><strong>Member Numbers:</strong> Automatic sequential number assignment for identification</li>
        <li><strong>Dependents:</strong> Link family members (parent-child relationships)</li>
        <li><strong>Membership Tracking:</strong> View active/cancelled/expired memberships</li>
        <li><strong>Transaction History:</strong> Complete purchase history with filtering</li>
        <li><strong>QR Codes:</strong> View/download QR codes for check-ins</li>
        <li><strong>Credits:</strong> Manually assign gift card credits with expiry dates</li>
        <li><strong>Waiver Status:</strong> See which waivers have been signed</li>
        <li><strong>Notes:</strong> Add internal notes visible only to staff</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Customer Detail Page Sections</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Basic Information Card</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Profile photo/avatar, Member ID, DOB, Gender</li>
          <li>Email, phone, address</li>
          <li>Waiver signed badge, Member since date</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Memberships Section</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Active memberships with status badges</li>
          <li>Actions (pause, cancel, view QR), Next billing date</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Dependents Section</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Linked children/dependents with quick links</li>
          <li>Add new dependent button</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Transaction History</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Paginated table, filter by date/product type</li>
          <li>View details, process refunds</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

      <div className="space-y-6 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 1: New Customer Creation</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Walk-in customer purchasing class</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Staff adds product → Clicks "Add Customer" → "Create New"</li>
            <li>Enters: Name, email, phone (minimum required)</li>
            <li>System auto-assigns member number</li>
            <li>Customer receives email with QR code</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 2: Family/Dependents Management</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Parent with 2 children accounts</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Parent account linked to children as dependents</li>
            <li>Booking kids class: Add both children to cart</li>
            <li>Payment linked to parent's account</li>
            <li>Transaction record: Payer = Parent, Participants = Children</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/customers/page.js</code> - Customer list view</li>
          <li><code>/app/(app)/manage/customers/[id]/page.js</code> - Customer detail page</li>
          <li><code>/app/api/customers/route.js</code> - CRUD API endpoints</li>
          <li><code>/models/Customer.js</code> - Customer schema</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Customer mobile app for self-service</li>
        <li>Birthday tracking with automated rewards</li>
        <li>Customer groups/segments for targeted marketing</li>
        <li>Loyalty points/rewards program</li>
        <li>Customer merge (combine duplicate accounts)</li>
        <li>Export customer list to CSV</li>
      </ul>
    </section>
  );
}
