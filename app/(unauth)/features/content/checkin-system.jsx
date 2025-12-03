'use client';

import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const checkinSystemMeta = {
  id: 'checkin-system',
  title: 'Check-in System',
  Icon: CheckCircle,
  category: 'operational'
};

export default function CheckinSystemFeature() {
  return (
    <section id="checkin-system" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <CheckCircle className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Check-in System</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        The check-in system handles various membership statuses and class purchases with intelligent routing and clear user feedback.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Suspended Members Can Attend Purchased Classes:</strong> Customers with suspended memberships can still check into classes they've purchased separately</li>
        <li><strong>Clear Status Communication:</strong> Different colored alerts (green/orange/red) indicate success, warning, or failure</li>
        <li><strong>Auto-Close for Privacy:</strong> Check-in dialogs auto-close after 8 seconds to protect customer PII</li>
        <li><strong>Time Window Validation:</strong> Classes can be checked into 30 minutes before/after scheduled time</li>
        <li><strong>Manual Entry Option:</strong> Staff can manually enter member IDs if QR scanning isn't available</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Check-in Record Status Types</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="default">checked-in</Badge>
        <Badge variant="destructive">denied</Badge>
        <Badge variant="secondary">no-show</Badge>
        <Badge variant="outline">late</Badge>
        <Badge variant="outline">early</Badge>
      </div>


      <h3 className="text-lg font-semibold mt-6 mb-3">Check-in Behavior Matrix</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 font-semibold">Customer Status</th>
              <th className="text-left p-2 font-semibold">Has Scheduled Class</th>
              <th className="text-left p-2 font-semibold">Check-in Result</th>
              <th className="text-left p-2 font-semibold">Visual Feedback</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="p-2">Active Membership</td>
              <td className="p-2">Yes</td>
              <td className="p-2">✅ Both class & membership checked in</td>
              <td className="p-2">Green success for both</td>
            </tr>
            <tr className="border-b">
              <td className="p-2">Active Membership</td>
              <td className="p-2">No</td>
              <td className="p-2">✅ Membership checked in</td>
              <td className="p-2">Green success</td>
            </tr>
            <tr className="border-b">
              <td className="p-2">Suspended Membership</td>
              <td className="p-2">Yes</td>
              <td className="p-2">✅ Class checked in, ⚠️ Membership warning</td>
              <td className="p-2">Green for class, Orange warning</td>
            </tr>
            <tr className="border-b">
              <td className="p-2">Suspended Membership</td>
              <td className="p-2">No</td>
              <td className="p-2">❌ Check-in denied</td>
              <td className="p-2">Orange alert with suspension details</td>
            </tr>
            <tr className="border-b">
              <td className="p-2">Expired Membership</td>
              <td className="p-2">Yes</td>
              <td className="p-2">✅ Class checked in only</td>
              <td className="p-2">Green for class</td>
            </tr>
            <tr className="border-b">
              <td className="p-2">Expired Membership</td>
              <td className="p-2">No</td>
              <td className="p-2">❌ Check-in denied</td>
              <td className="p-2">Red alert for expired membership</td>
            </tr>
            <tr className="border-b">
              <td className="p-2">No Membership</td>
              <td className="p-2">Yes</td>
              <td className="p-2">✅ Class checked in</td>
              <td className="p-2">Green success</td>
            </tr>
            <tr>
              <td className="p-2">No Membership</td>
              <td className="p-2">No</td>
              <td className="p-2">❌ No valid check-in</td>
              <td className="p-2">Gray message</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/api/checkin/qr/route.js</code> - Main check-in API endpoint</li>
          <li><code>/lib/checkin.js</code> - Shared check-in logic</li>
          <li><code>/app/(app)/checkin/page.js</code> - Frontend check-in interface with QR scanner</li>
          <li><code>/models/Checkin.js</code> - Check-in data model</li>
        </ul>
      </div>
    </section>
  );
}
