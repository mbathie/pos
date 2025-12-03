'use client';

import { CalendarDays } from 'lucide-react';

export const scheduleCalendarMeta = {
  id: 'schedule-calendar',
  title: 'Schedule Calendar',
  Icon: CalendarDays,
  category: 'operational'
};

export default function ScheduleCalendarFeature() {
  return (
    <section id="schedule-calendar" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <CalendarDays className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Schedule Calendar</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        A full-page calendar view showing all scheduled classes, courses, and group bookings.
        Provides an at-a-glance view of the schedule with the ability to navigate between months
        and years, click on days to see details, and identify group bookings by company name.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Month/Year Navigation:</strong> Dropdown selects for month (January-December) and year (±5 years from current)</li>
        <li><strong>Today Button:</strong> Quick jump back to current date</li>
        <li><strong>Arrow Navigation:</strong> Quick prev/next month buttons</li>
        <li><strong>Full-Height Calendar:</strong> Responsive grid that fills available viewport</li>
        <li><strong>Color-Coded Events:</strong> Blue for classes, purple for courses, green for group bookings</li>
        <li><strong>Company Names:</strong> Shows company name instead of class name for group bookings</li>
        <li><strong>Day Detail Sheet:</strong> Click any day to see all events with full details</li>
        <li><strong>Event Count Badges:</strong> Shows number of events per day</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Calendar Display</h3>
      <div className="space-y-4 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Event Colors</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><span className="inline-block w-3 h-3 rounded bg-blue-500/50 mr-2"></span><strong>Blue:</strong> Regular classes</li>
            <li><span className="inline-block w-3 h-3 rounded bg-purple-500/50 mr-2"></span><strong>Purple:</strong> Courses</li>
            <li><span className="inline-block w-3 h-3 rounded bg-green-500/50 mr-2"></span><strong>Green:</strong> Group bookings</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Event Display Format</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Regular Class:</strong> "3:30 PM Weights Class"</li>
            <li><strong>Group Booking:</strong> "8:00 AM ABC Corp" (company name shown instead)</li>
            <li><strong>Many Events:</strong> Shows first 3 events + "+N more" indicator</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Day Detail Sheet</h3>
      <p className="text-muted-foreground mb-4">
        Clicking on any day opens a side panel showing all events for that day with:
      </p>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Product Thumbnail:</strong> Image of the class/course product</li>
        <li><strong>Event Name:</strong> Company name for group bookings, product name for regular classes</li>
        <li><strong>Time & Duration:</strong> Start time and duration in minutes</li>
        <li><strong>Booking Count:</strong> Number booked vs capacity (e.g., "2 / 20 booked")</li>
        <li><strong>Click to Navigate:</strong> Click any event to go to schedule management</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Technical Implementation</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Relevant Files</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/calendar/page.js</code> - Calendar page</li>
          <li><code>/components/schedule-calendar.jsx</code> - Reusable calendar component</li>
          <li><code>/app/api/calendar/route.js</code> - API endpoint for fetching events</li>
          <li><code>/components/app-sidebar.jsx</code> - Sidebar menu with Calendar link</li>
        </ul>
      </div>

      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">API Response Structure</p>
        <pre className="text-xs bg-background p-3 rounded mt-2 overflow-x-auto">
{`{
  events: [
    {
      _id: "...",
      scheduleId: "...",
      datetime: "2025-12-01T08:00:00.000Z",
      duration: 60,
      capacity: 20,
      customerCount: 2,
      companyName: "ABC Corp",  // null for regular classes
      product: {
        _id: "...",
        name: "Weights Class",
        type: "class",
        thumbnail: "..."
      }
    }
  ],
  month: "2025-12"
}`}
        </pre>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Access</h3>
      <p className="text-muted-foreground mb-4">
        Calendar is accessible from the sidebar menu under <strong>Schedules → Calendar</strong>.
        No configuration required.
      </p>
    </section>
  );
}
