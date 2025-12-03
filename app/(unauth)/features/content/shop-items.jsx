'use client';

import { ShoppingCart } from 'lucide-react';

export const shopItemsMeta = {
  id: 'shop-items',
  title: 'Shop Items',
  Icon: ShoppingCart,
  category: 'product'
};

export default function ShopItemsFeature() {
  return (
    <section id="shop-items" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <ShoppingCart className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Shop Items</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Create and manage retail products, food & beverage items, and merchandise with flexible organization using folders, colors, and icons. Shop items support stock management, bump screen integration for kitchen orders, and automated inventory tracking.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Folder Organization:</strong> Group items into customizable folders (e.g., "Coffee", "Smoothies", "Merchandise")</li>
        <li><strong>Visual Customization:</strong> Set custom colors and icons for easy identification on POS screen</li>
        <li><strong>Stock Management:</strong> Track quantity, set par levels, and receive low-stock alerts</li>
        <li><strong>Bump Screen Integration:</strong> Send orders to kitchen/preparation area bump screen</li>
        <li><strong>Multiple Prices:</strong> Support for multiple pricing tiers (e.g., Small, Medium, Large)</li>
        <li><strong>GST/Tax Configuration:</strong> Configure tax settings per product</li>
        <li><strong>Quick Checkout:</strong> Optimized for fast point-of-sale transactions</li>
        <li><strong>Customer Optional:</strong> Can be sold without customer assignment</li>
        <li><strong>Email Receipts:</strong> Optional email receipts (off by default for quick sales)</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Product Configuration</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Basic Information</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Product name (e.g., "Cappuccino")</li>
          <li>Description (optional)</li>
          <li>Folder assignment (e.g., "Coffee" folder)</li>
          <li>Color (for POS button background)</li>
          <li>Icon (optional)</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Pricing</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Single price or multiple sizes (e.g., Small $4, Large $6)</li>
          <li>GST/Tax inclusion settings</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Inventory</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Current quantity (stock on hand)</li>
          <li>Par level (minimum quantity before alert)</li>
          <li>Auto-decrement on sale (optional)</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Operational Settings</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Send to bump screen (yes/no)</li>
          <li>Require customer name if bump screen enabled</li>
          <li>Accounting category</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

      <div className="space-y-6 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 1: Coffee Shop Setup</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Organizing coffee products with bump screen</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Folder: "Coffee" (brown color)</li>
            <li>Products:
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>Cappuccino - 2 sizes (Small $4.50, Large $5.50)</li>
                <li>Latte - 2 sizes (Small $4.50, Large $5.50)</li>
                <li>Flat White - Single size ($5.00)</li>
              </ul>
            </li>
            <li>Settings: Send to bump screen ✓, Require customer name ✓</li>
            <li><strong>Checkout flow:</strong> Staff taps "Cappuccino" → Selects "Large" → Enters customer name "John" → Sale</li>
            <li><strong>Result:</strong> Order appears on kitchen bump screen, receipt prints, customer notified when ready</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 2: Merchandise with Stock Tracking</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> T-shirt sales with low-stock alerts</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Folder: "Merchandise" (blue color)</li>
            <li>Product: "Gym T-Shirt" - $25.00</li>
            <li>Current stock: 15 units</li>
            <li>Par level: 5 units (reorder threshold)</li>
            <li>Settings: Bump screen ✗, Customer optional ✓</li>
            <li><strong>Sales activity:</strong> 11 t-shirts sold (stock now 4 units)</li>
            <li><strong>Alert triggered:</strong> Red notification bell appears (stock below par)</li>
            <li><strong>Manager action:</strong> Views stock screen, places supplier order for more inventory</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 3: Quick Sale Without Customer</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Fast protein bar sale at front desk</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Product: "Protein Bar" - $3.50</li>
            <li>Folder: "Snacks" (green color)</li>
            <li>Settings: Bump screen ✗, Customer optional ✓</li>
            <li><strong>Checkout:</strong> Staff taps "Protein Bar" → Qty auto-set to 1 → Tap "Card" → Payment processed</li>
            <li><strong>Duration:</strong> ~5 seconds (no customer lookup, no email receipt)</li>
            <li><strong>Receipt:</strong> Only printed receipt (no email sent)</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Product Management</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/products/page.js</code> - Products list</li>
          <li><code>/app/(app)/manage/stock/page.js</code> - Stock/quantity management</li>
          <li><code>/app/(app)/manage/folders/page.js</code> - Folder management</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Checkout</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/shop/(shop)/page.js</code> - Shop items POS screen</li>
          <li><code>/app/api/checkout/route.js</code> - Checkout processing</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Bump Screen</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/bump/page.js</code> - Kitchen bump screen</li>
          <li><code>/models/Order.js</code> - Order schema</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Product variants (size, color, flavor)</li>
        <li>Combo/bundle products</li>
        <li>Automatic supplier reordering when below par</li>
        <li>Product images for POS buttons</li>
        <li>Barcode scanning for quick add</li>
        <li>Product cost tracking for profit margins</li>
        <li>Time-based pricing (happy hour discounts)</li>
        <li>Product recommendations at checkout</li>
      </ul>
    </section>
  );
}
