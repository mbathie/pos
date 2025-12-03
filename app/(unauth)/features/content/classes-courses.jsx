'use client';

import { Calendar } from 'lucide-react';

export const classesCoursesMeta = {
  id: 'classes-courses',
  title: 'Classes & Courses',
  Icon: Calendar,
  category: 'product'
};

export default function ClassesCoursesFeature() {
  return (
    <section id="classes-courses" className="mb-16 scroll-mt-20">
      <div className="bg-primary text-primary-foreground p-4 rounded-lg mb-6 flex items-center gap-3">
        <Calendar className="h-6 w-6 shrink-0" />
        <h2 className="text-2xl font-semibold m-0">Classes & Courses</h2>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Overview</h3>
      <p className="text-muted-foreground mb-4">
        Create scheduled group activities, classes, and courses with capacity management, multiple time slots, location hours validation, QR code check-ins, and automated booking management. Perfect for fitness classes, training sessions, workshops, and multi-week programs.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Features</h3>
      <ul className="space-y-2 text-muted-foreground mb-4">
        <li><strong>Flexible Scheduling:</strong> Create multiple recurring time slots per week (e.g., Mon/Wed/Fri at 6am, 12pm, 6pm)</li>
        <li><strong>Capacity Management:</strong> Set maximum participants per class with automatic booking prevention when full</li>
        <li><strong>Location Hours Integration:</strong> Automatically validates class times against location operating hours</li>
        <li><strong>Visual Conflict Indicators:</strong> Strikethrough display for times that conflict with closed days/hours</li>
        <li><strong>Multiple Price Tiers:</strong> Support for different pricing (Adult, Child, Drop-in, etc.)</li>
        <li><strong>QR Code Check-in:</strong> Automatic QR codes for contactless class check-in</li>
        <li><strong>Waiver Requirements:</strong> Optional digital waiver acceptance before booking</li>
        <li><strong>Multi-Customer Booking:</strong> Purchase for multiple people in single transaction (e.g., parent booking for 2 children)</li>
        <li><strong>Schedule Validation:</strong> Prevents overbooking and scheduling conflicts</li>
      </ul>

      <h3 className="text-lg font-semibold mt-6 mb-3">Product Configuration</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Basic Information</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Class name (e.g., "Yoga Flow")</li>
          <li>Description</li>
          <li>Location assignment</li>
          <li>Terms & Conditions (optional)</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Schedule Configuration</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Days of week (select multiple: Mon, Tue, Wed, etc.)</li>
          <li>Time slots (create multiple times per day)</li>
          <li>Capacity per time slot (e.g., 20 people max)</li>
          <li>Auto-validation against location hours/closed days</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Pricing</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Multiple price options (e.g., Adult $20, Child $12, Drop-in $25)</li>
          <li>GST/Tax settings</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Additional Settings</p>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Waiver requirement</li>
          <li>Auto-assign discounts</li>
          <li>Check-in time window (e.g., 30 min before/after)</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Example Scenarios</h3>

      <div className="space-y-6 mb-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 1: Recurring Weekly Class</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Morning yoga class 3 times per week</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Class name: "Morning Yoga Flow"</li>
            <li>Schedule: Monday, Wednesday, Friday at 7:00 AM</li>
            <li>Capacity: 15 people per class</li>
            <li>Price: Adult $20, Senior $15</li>
            <li>Waiver required: Yes</li>
            <li><strong>Booking:</strong> Customer purchases "Adult" ticket for next Friday 7am class</li>
            <li><strong>Email sent:</strong> QR code + class details (date, time, location)</li>
            <li><strong>Check-in:</strong> Scan QR code at entrance 6:30-7:30am window</li>
            <li><strong>Capacity tracking:</strong> 14 spots remaining after booking</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 2: Multiple Daily Time Slots</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Popular HIIT class with 3 daily sessions</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Class name: "HIIT Bootcamp"</li>
            <li>Schedule: Monday-Saturday at 6:00 AM, 12:00 PM, 6:00 PM</li>
            <li>Capacity: 20 people per session</li>
            <li>Prices: Adult $25, Student $18, Drop-in $30</li>
            <li><strong>Customer preference:</strong> Regularly attends 6:00 AM Monday/Wednesday</li>
            <li><strong>Booking pattern:</strong> Purchases 2 tickets per week (Monday + Wednesday mornings)</li>
            <li><strong>Flexibility:</strong> Can book any time slot on any day based on availability</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 3: Location Hours Conflict Prevention</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Class schedule with holiday closures</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Class: "Kids Martial Arts"</li>
            <li>Schedule: Monday-Friday at 4:00 PM</li>
            <li>Location hours: Mon-Fri 6am-9pm, Closed Dec 25-26 (Christmas)</li>
            <li><strong>Dec 24:</strong> 4:00 PM class ✅ Available (normal booking)</li>
            <li><strong>Dec 25:</strong> 4:00 PM class ❌ <s>Outside store hours</s> (closed day badge, cannot book)</li>
            <li><strong>Dec 26:</strong> 4:00 PM class ❌ <s>Outside store hours</s> (closed day badge, cannot book)</li>
            <li><strong>Dec 27:</strong> 4:00 PM class ✅ Available (normal booking resumes)</li>
            <li><strong>Customer experience:</strong> Sees visual indicators, cannot accidentally book closed days</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Scenario 4: Multi-Customer Booking</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong>Setup:</strong> Parent booking for 2 children</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Class: "Kids Swimming Lessons"</li>
            <li>Schedule: Saturday at 10:00 AM</li>
            <li>Capacity: 12 children</li>
            <li>Price: $30 per child</li>
            <li><strong>Booking process:</strong>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>1. Select "Kids Swimming" → Saturday 10am</li>
                <li>2. Click "Add Customer" → Select child 1 (Emma)</li>
                <li>3. Click "Add Customer" → Select child 2 (Jack)</li>
                <li>4. Cart shows: 2 × $30 = $60</li>
                <li>5. Process payment</li>
              </ul>
            </li>
            <li><strong>Result:</strong> Both children receive separate QR codes, capacity reduced by 2 (10 spots left)</li>
            <li><strong>Transaction:</strong> Parent's account linked as payer, children as participants</li>
          </ul>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Files Reference</h3>
      <div className="bg-muted p-4 rounded-lg mb-4">
        <p className="text-sm font-semibold mb-2">Product Management</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/products/page.js</code> - Products list</li>
          <li><code>/app/(app)/manage/products/[id]/edit/page.js</code> - Product editor</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Booking & Checkout</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/shop/(other)/classes/[id]/page.js</code> - Class booking page</li>
          <li><code>/app/(app)/shop/(other)/classes/useClass.js</code> - Booking validation logic</li>
          <li><code>/app/(app)/shop/(other)/classes/productDetailClass.js</code> - UI with conflict display</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Schedule Management</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/manage/schedules/page.js</code> - Schedule list view</li>
          <li><code>/models/Schedule.js</code> - Schedule/booking schema</li>
        </ul>
        <p className="text-sm font-semibold mt-3 mb-2">Check-in</p>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li><code>/app/(app)/checkin/page.js</code> - QR check-in interface</li>
          <li><code>/app/api/checkin/qr/route.js</code> - Check-in API</li>
        </ul>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Future Enhancements</h3>
      <ul className="space-y-1 text-muted-foreground mb-4 text-sm list-disc list-inside">
        <li>Waiting list for fully booked classes</li>
        <li>Recurring class packages (e.g., 10-class punch card)</li>
        <li>Instructor assignment per class</li>
        <li>Class cancellation by staff with customer notifications</li>
        <li>Customer self-service booking via mobile app</li>
        <li>Class attendance reports and analytics</li>
        <li>Drop-in vs pre-registered participant tracking</li>
        <li>Class series/programs (multi-week courses with single purchase)</li>
        <li>Private class bookings (1-on-1 sessions)</li>
      </ul>
    </section>
  );
}
