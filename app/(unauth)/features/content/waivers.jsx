'use client';

import { FileCheck } from 'lucide-react';

export const waiversMeta = {
  id: 'waivers',
  title: 'Waivers',
  Icon: FileCheck,
  category: 'system'
};

export default function WaiversFeature() {
  return (
    <section id="waivers" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <FileCheck className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Waivers</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Create and manage digital liability waivers that customers must sign before purchasing specific products or memberships. Waivers collect customer information (name, DOB, gender, signature) and are stored with timestamps for legal compliance.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Rich Text Editor:</strong> Create custom waiver text with HTML formatting</li>
        <li><strong>Product Assignment:</strong> Attach waivers to memberships, classes, or any product type</li>
        <li><strong>Required Fields:</strong> Collect name, date of birth, gender, and digital signature</li>
        <li><strong>Digital Signature:</strong> Canvas-based signature capture on checkout</li>
        <li><strong>Version Control:</strong> Track waiver text and when it was signed</li>
        <li><strong>Parent/Child:</strong> Adults can sign waivers on behalf of minors</li>
        <li><strong>Mandatory Blocking:</strong> Cannot proceed with purchase until waiver signed</li>
        <li><strong>Audit Trail:</strong> Permanent record with signature, IP address, and timestamp</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Configuration</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Waiver Builder</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Waiver name (internal reference)</li>
          <li>Waiver text (HTML editor with formatting)</li>
          <li>Active status (enable/disable)</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Product Assignment</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Attach waiver to specific products in product editor</li>
          <li>Toggle "Waiver Required" checkbox</li>
          <li>Select waiver from dropdown</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Collected Data</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Full name, Date of birth, Gender</li>
          <li>Digital signature (base64 image)</li>
          <li>Signed timestamp, IP address, Waiver version</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

      <div className="space-y-6 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 1: Gym Membership Waiver</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Liability waiver required for all memberships</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Waiver name: "Gym Liability Release 2025"</li>
            <li>Assigned to: All membership products</li>
            <li><strong>Checkout flow:</strong> Customer reads waiver → Signs on canvas → Clicks "I Agree"</li>
            <li><strong>Storage:</strong> Waiver saved with signature image in customer record</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 2: Parent Signing for Child</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Parent purchasing kids martial arts class</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Participant: Child's name and DOB</li>
            <li>Signing as: Parent/Guardian</li>
            <li><strong>Record:</strong> Waiver stored under child's account, signed by parent</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Waiver Builder</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/waivers/page.js</code> - Waivers list</li>
          <li><code>/app/(app)/manage/waivers/builder/page.js</code> - Waiver text editor</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Checkout Integration</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/shop/components/WaiverModal.js</code> - Signature screen</li>
          <li><code>/app/api/waivers/sign/route.js</code> - Submission API</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Models</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/models/Waiver.js</code> - Waiver template schema</li>
          <li><code>/models/Customer.js</code> - Stores signed waivers array</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Email waiver copy to customer after signing</li>
        <li>PDF export of signed waivers</li>
        <li>Waiver expiry dates (re-sign annually)</li>
        <li>Multi-page waivers with checkbox per section</li>
        <li>Custom fields (emergency contact, medical conditions)</li>
      </ul>
    </section>
  );
}
