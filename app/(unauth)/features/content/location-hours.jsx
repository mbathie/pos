'use client';

import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const locationHoursMeta = {
  id: 'location-hours',
  title: 'Location Hours & Closed Days',
  Icon: Clock,
  category: 'operational'
};

export default function LocationHoursFeature() {
  return (
    <section id="location-hours" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <Clock className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Location Hours & Closed Days</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Allows organizations to configure store hours and closed days (public holidays, staff training days, etc.) for each location. The system automatically validates class and course bookings against these hours to prevent scheduling conflicts.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Store Hours Configuration:</strong> Set opening and closing times for each day of the week</li>
        <li><strong>5-Minute Intervals:</strong> Time selection restricted to 5-minute increments for consistency</li>
        <li><strong>Closed Days/Public Holidays:</strong> Define date ranges when the location is closed</li>
        <li><strong>Automatic Booking Validation:</strong> Class/course times that conflict with closed hours are automatically blocked</li>
        <li><strong>Visual Indicators:</strong> Conflicting times displayed with strikethrough and warning badges</li>
        <li><strong>Per-Location Settings:</strong> Each location can have independent hours and closed days</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Repeating Patterns</h3>
      <p className="text-muted-foreground mb-2">Closed days support various repeating patterns:</p>
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="secondary">Does not repeat</Badge>
        <Badge variant="secondary">Daily</Badge>
        <Badge variant="secondary">Weekly</Badge>
        <Badge variant="secondary">Fortnightly</Badge>
        <Badge variant="secondary">Monthly</Badge>
        <Badge variant="secondary">Quarterly</Badge>
        <Badge variant="secondary">Yearly</Badge>
      </div>


      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

      <div className="space-y-6 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 1: Standard Store Hours</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong></p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mb-2">
            <li>Location: Main HQ</li>
            <li>Monday hours: 05:00 AM - 10:50 PM</li>
            <li>Tuesday hours: 10:00 AM - 05:00 PM</li>
            <li>Wednesday-Sunday: Not set (closed)</li>
          </ul>
          <p className="text-sm text-muted-foreground mb-1"><strong>Class Schedule:</strong> Weights Class runs Monday-Sunday at 8:00 AM</p>
          <p className="text-sm text-muted-foreground mb-1"><strong>Result:</strong></p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Monday 8:00 AM ✅ Available (within 05:00 AM - 10:50 PM)</li>
            <li>Tuesday 8:00 AM ❌ <s>Outside store hours</s> (before 10:00 AM open)</li>
            <li>Wednesday 8:00 AM ❌ <s>Outside store hours</s> (no hours configured)</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 2: Public Holiday</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong></p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mb-2">
            <li>Location hours: Monday-Sunday 06:00 AM - 09:00 PM</li>
            <li>Closed day: "Christmas Day" Dec 25, 2025</li>
            <li>Class: Morning Yoga, Monday-Sunday at 07:00 AM</li>
          </ul>
          <p className="text-sm text-muted-foreground mb-1"><strong>Result:</strong></p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Dec 24, 2025 at 07:00 AM ✅ Available</li>
            <li>Dec 25, 2025 at 07:00 AM ❌ <s>Closed day</s> (Christmas)</li>
            <li>Dec 26, 2025 at 07:00 AM ✅ Available</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 3: Repeating Annual Holiday (Yearly)</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong></p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mb-2">
            <li>Closed days: "Christmas Day" Dec 25, 2025, Repeats: Yearly</li>
            <li>Class: Morning Class, daily at 09:00 AM</li>
          </ul>
          <p className="text-sm text-muted-foreground mb-1"><strong>Result:</strong></p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Dec 25, 2025 at 09:00 AM ❌ <s>Closed day</s> (Christmas Day)</li>
            <li>Dec 25, 2026 at 09:00 AM ❌ <s>Closed day</s> (Christmas Day - repeating)</li>
            <li>Dec 25, 2027 at 09:00 AM ❌ <s>Closed day</s> (Christmas Day - repeating)</li>
            <li>All other dates ✅ Available</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/locations/location.js</code> - Location form with hours/closed days</li>
          <li><code>/app/(app)/shop/(other)/classes/useClass.js</code> - Booking validation logic</li>
          <li><code>/app/(app)/shop/(other)/classes/productDetailClass.js</code> - UI with conflict display</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Timezone support for multi-location organizations</li>
        <li>Recurring closed days (e.g., "Every Sunday")</li>
        <li>Holiday templates (auto-populate common holidays by region)</li>
        <li>Temporary hour overrides (e.g., special event hours)</li>
        <li>Email notifications when bookings are affected by hour changes</li>
        <li>Bulk import closed days from CSV</li>
        <li>Integration with external calendar systems (Google Calendar, Outlook)</li>
      </ul>
    </section>
  );
}
