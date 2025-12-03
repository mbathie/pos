'use client';

import { Package } from 'lucide-react';

export const posInterfacesMeta = {
  id: 'pos-interfaces',
  title: 'POS Interfaces & Product Organization',
  Icon: Package,
  category: 'system'
};

export default function POSInterfacesFeature() {
  return (
    <section id="pos-interfaces" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <Package className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">POS Interfaces & Product Organization</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Flexible product organization system where products are organized by <strong>type</strong> (shop, class, course, membership, general) and displayed through customizable POS interfaces. Each device or location can have its own POS interface with unique layouts, categories, and product arrangements using folders, dividers, and product groups.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Concepts</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Product Types:</strong> Products classified by type (shop, class, course, membership, general) instead of categories</li>
        <li><strong>POS Interfaces:</strong> Customizable layouts controlling what products appear on specific devices</li>
        <li><strong>Categories (POS-Level):</strong> Organizational tabs within a POS interface</li>
        <li><strong>Folders:</strong> Visual containers with color coding to group related products</li>
        <li><strong>Product Groups:</strong> Pre-configured bundles that can be added to cart as a set</li>
        <li><strong>Dividers:</strong> Visual separators within categories</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Architecture</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Product Organization Hierarchy</p>
        <pre className="text-xs bg-background p-3 rounded mt-2 overflow-x-auto">
{`POS Interface
└─ Categories (Tabs)
   └─ Items (in display order)
      ├─ Folder (collapsible)
      │  ├─ Product
      │  └─ Product Group
      ├─ Divider (visual separator)
      └─ Product (top-level)`}
        </pre>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Type-Based Filtering:</strong> Product management pages filter by type</li>
        <li><strong>Device Assignment:</strong> Assign POS interfaces to devices by browser ID</li>
        <li><strong>Location-Specific Layouts:</strong> Different locations can have different interfaces</li>
        <li><strong>Drag-and-Drop Ordering:</strong> Arrange products, folders, and dividers</li>
        <li><strong>Folder Color Coding:</strong> Visual organization with customizable colors</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">How It Works</h3>
      <div className="space-y-4 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Step 1: Create Products by Type</h4>
          <p className="text-sm text-muted-foreground">Navigate to Products → Shop, Classes, Memberships, or General Entry. Products are created with type field (shop, class, course, membership, general).</p>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Step 2: Create Folders (Optional)</h4>
          <p className="text-sm text-muted-foreground">Navigate to Setup → Folders. Create folders with names and colors for organizing products.</p>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Step 3: Configure POS Interface</h4>
          <p className="text-sm text-muted-foreground">Navigate to Setup → POS Interfaces. Create categories, add folders/products/dividers, and arrange with drag-and-drop.</p>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Step 4: Assign to Devices</h4>
          <p className="text-sm text-muted-foreground">Each device has a unique browser ID. Assign interfaces to devices for location-specific displays.</p>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>
      <div className="space-y-4 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Multi-Location Cafe</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Location A:</strong> "Full Cafe" interface - all products</li>
            <li><strong>Location B:</strong> "Express Cafe" interface - coffees & snacks only</li>
            <li><strong>Benefit:</strong> Same products, different presentations</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Department-Specific Devices</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Front Desk:</strong> Memberships, Classes, General Entry</li>
            <li><strong>Retail Shop:</strong> Merchandise, Supplements, Equipment</li>
            <li><strong>Result:</strong> Staff see only relevant products</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/products/pos/[id]/page.js</code> - POS interface editor</li>
          <li><code>/app/api/posinterfaces/[id]/route.js</code> - POS interface CRUD</li>
          <li><code>/app/api/posinterfaces/for-device/route.js</code> - Device identification</li>
          <li><code>/app/(app)/shop/page.js</code> - Main checkout page</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Improvements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li><strong>Decoupled Organization:</strong> Products organized via POS interfaces, not categories</li>
        <li><strong>Flexible Reuse:</strong> Same product can appear in multiple interfaces</li>
        <li><strong>Type-Based Management:</strong> Simpler product type dropdown vs category trees</li>
        <li><strong>Device Control:</strong> Precise control over what each device displays</li>
      </ul>
    </section>
  );
}
