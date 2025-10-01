# POS System Features

<div style="background-color: #1e3a8a; color: white; padding: 10px; border-radius: 5px;">
  <h2 style="margin: 0; border: none; text-decoration: none;">Membership Pause/Suspension</h2>
</div>

### Overview
Allows members to temporarily pause their membership subscription for a specified number of days. During the pause period, the member's billing is suspended and they receive a prorated credit for the unused portion of their current billing period. The system enforces organization-defined limits on suspension days per year.

### Key Features
- **Flexible Pause Duration**: Members can pause from 1 day up to the organization's configured maximum
- **365-Day Rolling Limit**: Suspension days are tracked on a rolling 365-day period from subscription start date
- **Prorated Credits**: Members receive automatic credit for unused days in the current billing period
- **Scheduled Pauses**: Can schedule pauses to start on a future date (before next billing date)
- **Early Resume with Credit Adjustment**: When resuming early, credits are automatically adjusted for unused pause days
- **Email Notifications**: Automatic email notifications when memberships are suspended or resumed
- **Stripe Integration**: Seamlessly integrates with Stripe's pause_collection API for connected accounts
- **Resume Anytime**: Members can resume their membership early before the scheduled resume date
- **Audit Trail**: Complete history of all suspensions with employee tracking and notes

### Configuration
Organizations can set the maximum suspension days allowed per year in **Settings > Organization**:
- Default: 30 days per year
- Range: 0-365 days
- Setting: `org.membershipSuspensionDaysPerYear`

### How It Works

#### Suspension Process
1. Staff navigates to customer detail page (`/manage/customers/[id]`)
2. Clicks ellipsis menu (⋮) next to active membership status
3. Selects "Pause Membership"
4. Choose between:
   - **Immediate Pause**: Pause starts today
   - **Schedule for Later**: Select a future date via calendar picker (must be before next billing date)
5. Enters number of days (1 to remaining allowance)
6. System calculates prorated credit based on pause start date
7. For immediate pauses: Stripe subscription collection is paused immediately
8. For scheduled pauses: Pause is stored locally and will be processed on the scheduled date
9. Membership status updates accordingly

#### Credit Calculation
Credits are calculated based on unused days in the **current billing period only**:
- Monthly subscription ($20/month): If paused with 15 days remaining = $10 credit
- Pauses extending beyond current period simply skip future billing cycles
- No additional credits for skipped future periods

#### Resume Process
1. Staff clicks ellipsis menu next to suspended membership
2. Selects "Resume Membership"
3. If resuming early:
   - System calculates unused pause days
   - Creates a positive invoice adjustment to reduce the original credit
   - Shows adjustment amount in success message
4. Stripe billing resumes immediately
5. Status returns to "Active"

### Example Scenarios

#### Scenario 1: Short-Term Travel
**Setup**: Customer has $50/month membership, traveling for 2 weeks
- Current billing cycle: Oct 1-31 (30 days)
- Pause date: Oct 10
- Pause duration: 14 days
- **Credit calculation**: 14 days × ($50/30) = $23.33 credit
- **Resume date**: Oct 24
- **Next billing**: Oct 31 (adjusted amount: $50 - $23.33 = $26.67)

#### Scenario 2: Extended Leave (Multi-Month)
**Setup**: Customer has $20/month membership, taking 3-month sabbatical
- Current billing cycle: Sept 18 - Oct 18
- Pause date: Sept 22
- Pause duration: 90 days
- **Credit calculation**: Only for remaining days in September (26 days × $20/30 = $17.33)
- **Skipped billing cycles**: October and November entirely skipped
- **Resume date**: Dec 21
- **Next billing**: Dec 21 (new billing cycle starts)

#### Scenario 3: Scheduled Future Pause
**Setup**: Customer planning vacation, wants to schedule pause in advance
- Current date: Sept 1
- Next billing date: Sept 15
- Scheduled pause date: Sept 10
- Pause duration: 10 days
- **Credit calculation**: 5 days × ($50/30) = $8.33 credit (Sept 10-15 only)
- **Resume date**: Sept 20
- **Result**: Pause will activate automatically on Sept 10, skip Sept 15 billing

#### Scenario 4: Early Resume with Credit Adjustment
**Setup**: Customer resumes 5 days early from 14-day pause
- Original pause: 14 days ($50/month membership)
- Actual pause: 9 days
- **Original credit**: 14 × ($50/30) = $23.33
- **Adjusted credit**: 9 × ($50/30) = $15.00
- **Adjustment invoice**: +$8.33 (to reduce the credit)
- **Result**: Customer's credit is adjusted to reflect actual pause duration

#### Scenario 5: Maximum Annual Limit
**Setup**: Customer already used 25 days of 30-day annual limit
- Previous suspensions: 25 days used in current 365-day period
- Requested pause: 10 days
- **System response**: Error - only 5 days remaining
- **Solution**: Customer can only pause for maximum 5 days

### Email Notifications

The system automatically sends email notifications for membership suspension events:

#### Suspension Email
Sent when a membership is suspended (either immediately or via scheduled processing):
- Confirms the suspension and duration
- Shows the resume date
- Displays credit amount applied (if any)
- Explains what the suspension means for billing
- Provides information on how to resume early

#### Resume Email
Sent when a membership is resumed:
- Confirms the membership is active again
- Shows next billing date
- If resumed early, displays the credit adjustment amount and unused days
- Thanks the member for their continued membership

#### Configuration
Emails are sent using the configured email platform:
- **Brevo**: Production email service (configured via `BREVO_*` environment variables)
- **Ethereal**: Testing email service (configured via `ETHEREAL_*` environment variables)
- Platform selection via `EMAIL_PLATFORM` environment variable

### Scheduled Pause Processing

When a membership pause is scheduled for a future date, the system stores it locally and processes it automatically on the scheduled date via a cron job.

#### How It Works
1. **Scheduling**: When a pause is scheduled for a future date, the system:
   - Creates the negative invoice item (credit) immediately
   - Stores the scheduled pause date in the membership record
   - Shows scheduled pause badge with cancel option in UI

2. **Processing**: On the scheduled date, the cron job:
   - Finds all memberships scheduled to pause today
   - Pauses the Stripe subscription using pause_collection API
   - Updates membership status to 'suspended'
   - Clears the scheduled pause fields

3. **Cancellation**: Scheduled pauses can be cancelled before they activate:
   - Click the X button next to the scheduled pause badge
   - Removes scheduled pause fields from membership
   - Note: Credit invoice item remains (manual adjustment may be needed)

#### Deployment Options
- **External Cron Service** (Recommended): Use cron-job.org or EasyCron to call the API endpoint
- **Manual Trigger**: Run `npm run cron:process-pauses` manually
- **API Endpoint**: `POST /api/cron/process-pauses` with X-Cron-Secret header

### Technical Implementation

#### Database Schema
```javascript
// Membership Model
{
  status: 'active' | 'suspended' | 'cancelled' | 'expired',
  suspendedUntil: Date,

  // Scheduled pause fields
  scheduledPauseDate: Date,
  scheduledResumDate: Date,
  scheduledPauseDays: Number,

  suspensions: [{
    suspendedAt: Date,
    suspensionDays: Number,
    resumesAt: Date,
    yearStartDate: Date,
    stripeInvoiceItemId: String,
    createdBy: ObjectId (Employee),
    note: String,
    scheduledPause: Boolean,
    createdAt: Date,
    actualResumedAt: Date,  // For early resumes
    adjustmentInvoiceItemId: String  // Credit adjustment if resumed early
  }]
}
```

#### API Endpoints
- `POST /api/memberships/[id]/pause` - Pause a membership
- `POST /api/memberships/[id]/resume` - Resume a paused membership
- `GET /api/memberships/[id]/suspension-info` - Get suspension history and limits

#### Stripe Integration
- Uses `pause_collection` with `behavior: 'void'`
- Supports Stripe Connect with `stripeAccount` parameter
- Creates negative invoice items for credits
- Handles test/production environment differences gracefully

### Files Reference

#### Core Business Logic
- `/lib/payments/suspend.js` - Main suspension logic (pause, resume, calculate credits)
- `/lib/memberships.js` - Membership data access layer

#### API Routes
- `/app/api/memberships/[id]/pause/route.js` - Pause endpoint
- `/app/api/memberships/[id]/resume/route.js` - Resume endpoint
- `/app/api/memberships/[id]/suspension-info/route.js` - Suspension info endpoint

#### UI Components
- `/components/membership-pause-dialog.jsx` - Pause dialog with calendar picker and credit preview
- `/app/(app)/manage/customers/[id]/page.js` - Customer detail page with pause controls

#### Database Models
- `/models/Membership.js` - Membership schema with suspensions array and scheduled pause fields
- `/models/Customer.js` - Customer model (suspension history removed, now in Membership)

#### Configuration
- `/app/(app)/settings/page.js` - Organization settings page with suspension days limit

#### Scripts & Utilities
- `/scripts/check-stripe-subscription.js` - CLI tool to verify Stripe subscription status
- `/scripts/process-scheduled-pauses.js` - Cron job to process scheduled pauses daily with email notifications
- `/scripts/test-process-scheduled-pause.js` - Test script to simulate processing future pauses
- `/scripts/test-suspension-email.js` - Test script for suspension/resume email notifications
- `/scripts/deploy-scheduled-jobs.js` - DigitalOcean deployment script for scheduled jobs
- `/docs/CRON-JOB-QUICK-SETUP.md` - Quick setup guide for scheduled pause processing
- `/app/api/cron/process-pauses/route.js` - HTTP endpoint for external cron services
- `/app/api/memberships/[id]/cancel-scheduled-pause/route.js` - Cancel scheduled pause endpoint

#### Email Templates
- `/lib/email/suspension.js` - Email templates for suspension and resume notifications
- `/lib/mailer.js` - Core email sending functionality with Brevo/Ethereal support

### Testing & Verification

#### Check Stripe Subscription Status
```bash
# Without connected account
node scripts/check-stripe-subscription.js sub_ABC123

# With connected account (required for Stripe Connect)
node scripts/check-stripe-subscription.js sub_ABC123 acct_XYZ789
```

#### Test Scheduled Pause Processing
```bash
# Test with dry-run mode (no changes made)
npm run cron:test-pause -- --customer-id=CUSTOMER_ID --dry-run

# Test with actual processing (simulates future pause as today)
npm run cron:test-pause -- --customer-id=CUSTOMER_ID
```

The test script allows you to:
- Simulate that a future scheduled pause date is today
- Process the pause without waiting for the actual date
- Use `--dry-run` mode to preview changes without making them
- Verify Stripe subscription pause and credit handling
- Test email notifications (in dry-run mode, emails are not sent)

#### Test Email Notifications
```bash
# Test suspension and resume email templates
npm run test:suspension-email
```

This will:
- Send a test suspension email
- Send a test resume email
- Display preview URLs if using Ethereal email service

#### Manual Testing Steps
1. Set organization suspension limit in Settings
2. Navigate to customer with active membership
3. Pause membership for X days
4. Verify:
   - Status shows "Suspended" with resume date
   - Stripe dashboard shows "Collection paused until [date]"
   - Credit appears in Stripe invoice items
   - Suspension recorded in membership.suspensions array
5. Test resume functionality
6. Test annual limit enforcement

### Limitations & Considerations
- Credits are limited to current billing period only
- Suspension history is permanent (no deletion)
- Stripe API failures are handled gracefully with local-only updates
- Connected account ID required for Stripe Connect setups
- No proration for partial days (full day increments only)
- Scheduled pauses must be before next billing date
- Stripe doesn't natively support future-dated pauses (handled locally)
- Early resume creates adjustment invoice to reduce original credit

### Membership Discount Blocking During Suspension

When a membership is suspended, all membership-related discounts are automatically blocked. This ensures suspended members don't receive membership benefits during their pause period.

#### Implementation Details
- **Automatic Detection**: The system checks membership status in real-time during checkout
- **Clear Messaging**: Customers see "This discount is not available while your membership is suspended"
- **Immediate Effect**: Discounts are blocked as soon as membership is paused
- **Auto-Restore**: Discounts automatically become available again when membership resumes

#### Technical Implementation
- `/lib/adjustments.js` - Modified `validateDiscount` to check for suspended memberships
- `/app/(app)/shop/payment.js` - UI shows appropriate error messages
- `/scripts/tests/test-suspended-membership-discount.js` - Comprehensive test coverage

---

<div style="background-color: #1e3a8a; color: white; padding: 10px; border-radius: 5px; margin-top: 20px;">
  <h2 style="margin: 0; border: none; text-decoration: none;">Membership Cancellation</h2>
</div>

### Overview
Allows staff to cancel active membership subscriptions at the end of the current billing period. Cancellations are processed through Stripe's `cancel_at_period_end` API, ensuring members retain access until their paid period expires. The membership remains active until the next billing date, after which it will not be renewed.

### Key Features
- **End-of-Period Cancellation**: Memberships remain active until next billing date
- **Stripe Integration**: Seamlessly integrates with Stripe's cancel_at_period_end for connected accounts
- **Visual Indicators**: Clear UI badges showing cancellation status and date
- **Employee Tracking**: Records which employee initiated the cancellation
- **Cancellation Reason**: Optional reason field for documentation
- **Automatic Cleanup**: Dropdown menu hides once membership is cancelled
- **AlertDialog Confirmation**: User-friendly confirmation dialog with cancellation details

### How It Works

#### Cancellation Process
1. Staff navigates to customer detail page (`/manage/customers/[id]`)
2. Clicks ellipsis menu (⋮) next to active membership
3. Selects "Cancel Membership" option
4. Reviews confirmation dialog showing:
   - Membership product name
   - Next billing date (when cancellation takes effect)
5. Clicks "OK" to confirm or "Cancel" to abort
6. System updates Stripe subscription with `cancel_at_period_end: true`
7. Database records:
   - `cancelAtPeriodEnd`: true
   - `cancellationScheduledFor`: Date when membership will end
   - `cancelledBy`: Employee ID who initiated cancellation
   - `cancelledAt`: Timestamp of cancellation request
8. UI updates to show:
   - Green "Active" badge (membership still active)
   - Red "Cancels: DD/MM" badge showing cancellation date
   - Hides dropdown menu (no further actions available)
   - Removes "Next Billing" section

#### Post-Cancellation Status
- Membership status remains `active` until cancellation date
- Member retains full access until next billing date
- No future billing cycles will be charged
- Stripe subscription automatically ends at period end
- Member must purchase new membership to continue access

### UI/UX Design

#### Active Membership (Before Cancellation)
```
Membership Status
├── General Membership
│   ├── Active (green badge)
│   ├── Started: 01/10/2025
│   ├── Next Billing: 01/11/2025
│   ├── Amount: $20
│   └── [⋮] Dropdown Menu
│       ├── Pause Membership
│       └── Cancel Membership
```

#### Cancelled Membership (After Cancellation)
```
Membership Status
├── General Membership
│   ├── Active (green badge)
│   ├── Cancels: 01/11 (red badge)
│   ├── Started: 01/10/2025
│   ├── Amount: $20
│   └── [No dropdown menu]
```

### Technical Implementation

#### Database Schema (`/models/Membership.js`)
```javascript
{
  // Cancellation Fields
  cancelAtPeriodEnd: { type: Boolean, default: false },
  cancellationScheduledFor: Date,
  cancellationReason: String,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  cancelledAt: Date,
  cancellationDate: Date // Legacy field
}
```

#### API Endpoints

**Cancel Membership**
- **Endpoint**: `POST /api/memberships/[id]/cancel`
- **Authentication**: Employee (cookie-based)
- **Parameters**:
  - `id`: Membership ID (URL parameter)
  - `reason`: Optional cancellation reason (body)
- **Response**: Updated membership with cancellation details
- **Stripe Call**: `stripe.subscriptions.update()` with `cancel_at_period_end: true`

#### Stripe Integration
The system handles Stripe Connected Accounts properly:
1. Fetches organization's `stripeAccountId` from database
2. Passes account ID in Stripe API options: `{ stripeAccount: org.stripeAccountId }`
3. Updates subscription with cancellation metadata:
   - `cancelled_by_employee`: Employee ID as string
   - `cancellation_reason`: Provided reason or default message

#### Fallback Logic
When determining cancellation date, the system uses priority order:
1. `subscription.current_period_end` (Unix timestamp)
2. `subscription.cancel_at` (Unix timestamp) - Used when current_period_end is undefined
3. `membership.nextBillingDate` - Fallback if Stripe doesn't return expected fields

### Files Reference

#### Core Business Logic
- `/lib/payments/cancel.js` - Cancellation and reactivation logic
  - `cancelMembership()` - Cancel subscription at period end
  - `reactivateMembership()` - Undo cancellation (not exposed in UI)

#### API Routes
- `/app/api/memberships/[id]/cancel/route.js` - Cancel membership endpoint
- `/app/api/memberships/[id]/reactivate/route.js` - Reactivate membership (available for future use)

#### UI Components
- `/app/(app)/manage/customers/[id]/page.js` - Customer detail page with cancellation controls
  - Cancel dropdown menu item
  - AlertDialog confirmation
  - Cancellation badge display
  - Conditional "Next Billing" section

#### Database Models
- `/models/Membership.js` - Membership schema with cancellation fields

### Error Handling & Logging

The system includes comprehensive logging for troubleshooting:
- Employee authentication details
- Membership and organization lookup results
- Stripe API request/response details
- Database save confirmation
- Full error stack traces

#### Common Error Scenarios
1. **No Stripe Subscription**: "Membership does not have a Stripe subscription"
2. **Non-Active Status**: "Can only cancel active memberships"
3. **Missing Organization**: "Organization not found"
4. **Stripe API Error**: Full Stripe error details logged
5. **Database Save Error**: Validation errors with field details

### Limitations & Considerations

1. **No Reactivation UI**: While the reactivation function exists, it's not exposed in the UI. Customers must purchase a new membership if they change their mind.
2. **No Immediate Cancellation**: System only supports end-of-period cancellation to honor paid periods.
3. **No Partial Refunds**: Customers remain active until end of billing period (no prorated refunds for cancellations).
4. **Connected Accounts Only**: Requires Stripe Connected Account ID for proper routing.
5. **Employee-Only**: Only staff can cancel memberships (not available in customer portal).

### Future Enhancements

- [ ] Add cancellation analytics/reporting
- [ ] Email notification to customer when membership is cancelled
- [ ] Bulk cancellation support for multiple memberships
- [ ] Cancel reason dropdown with predefined options
- [ ] Automatic win-back campaigns before cancellation date
- [ ] Customer self-service cancellation in mobile app (with review/confirmation flow)
- [ ] Cancellation survey/feedback collection
- [ ] Reactivation offer before cancellation takes effect

---

<div style="background-color: #1e3a8a; color: white; padding: 10px; border-radius: 5px; margin-top: 20px;">
  <h2 style="margin: 0; border: none; text-decoration: none;">Check-in System</h2>
</div>

### Overview
The check-in system handles various membership statuses and class purchases with intelligent routing and clear user feedback.

### Check-in Behavior Matrix

| Customer Status | Has Scheduled Class | Check-in Result | Visual Feedback |
|----------------|-------------------|-----------------|-----------------|
| Active Membership | Yes | ✅ Both class & membership checked in | Green success for both |
| Active Membership | No | ✅ Membership checked in | Green success |
| Suspended Membership | Yes | ✅ Class checked in, ⚠️ Membership warning | Green for class, Orange warning for membership |
| Suspended Membership | No | ❌ Check-in denied | Orange alert with suspension details |
| Expired Membership | Yes | ✅ Class checked in only | Green for class |
| Expired Membership | No | ❌ Check-in denied | Red alert for expired membership |
| No Membership | Yes | ✅ Class checked in | Green success |
| No Membership | No | ❌ No valid check-in | Gray message |

### Key Features
1. **Suspended Members Can Attend Purchased Classes**: Customers with suspended memberships can still check into classes they've purchased separately
2. **Clear Status Communication**: Different colored alerts (green/orange/red) indicate success, warning, or failure
3. **Auto-Close for Privacy**: Check-in dialogs auto-close after 8 seconds to protect customer PII
4. **Time Window Validation**: Classes can be checked into 30 minutes before/after scheduled time
5. **Manual Entry Option**: Staff can manually enter member IDs if QR scanning isn't available

### Check-in Record Status Types
- `checked-in`: Successful check-in for class or membership
- `denied`: Attempted check-in blocked due to suspension
- `no-show`: Customer didn't attempt to check in
- `late`: Check-in after grace period (future feature)
- `early`: Check-in before allowed window (future feature)

### Check-in Failure Reasons
- `membership-suspended`: Membership is currently suspended
- `membership-expired`: Membership has expired
- `no-scheduled-classes`: No classes found for customer
- `no-class-in-window`: Class exists but outside 30-minute window
- `invalid-status`: Other validation failure

### Technical Implementation
- `/app/api/checkin/qr/route.js` - Main check-in API endpoint
- `/lib/checkin.js` - Shared check-in logic and utilities (refactored)
- `/app/(app)/checkin/page.js` - Frontend check-in interface with QR scanner
- `/models/Checkin.js` - Check-in data model with status tracking

### Database Schema
```javascript
// Checkin Model
{
  customer: ObjectId,
  product: ObjectId,
  schedule: ObjectId (optional),
  class: {
    datetime: Date,
    location: ObjectId
  },
  status: 'checked-in' | 'denied' | 'no-show' | 'late' | 'early',
  method: 'qr-code' | 'manual' | 'staff',
  success: {
    status: Boolean,
    reason: String (enum)
  },
  org: ObjectId
}
```

### Future Enhancements
- [x] ~~Email notifications for pause/resume~~ ✅ Completed
- [ ] Customer self-service pause via mobile app
- [ ] Automatic resume reminders (email reminder before auto-resume)
- [ ] Suspension reason categories for reporting
- [ ] HTML email templates with branding
- [ ] SMS notifications option
- [ ] Webhook notifications for integrations
---

<div style="background-color: #1e3a8a; color: white; padding: 10px; border-radius: 5px;">
  <h2 style="margin: 0; border: none; text-decoration: none;">Location Hours & Closed Days Management</h2>
</div>

### Overview
Allows organizations to configure store hours and closed days (public holidays, staff training days, etc.) for each location. The system automatically validates class and course bookings against these hours to prevent scheduling conflicts.

### Key Features
- **Store Hours Configuration**: Set opening and closing times for each day of the week
- **5-Minute Intervals**: Time selection restricted to 5-minute increments for consistency
- **Closed Days/Public Holidays**: Define date ranges when the location is closed
- **Automatic Booking Validation**: Class/course times that conflict with closed hours are automatically blocked
- **Visual Indicators**: Conflicting times displayed with strikethrough and warning badges
- **Per-Location Settings**: Each location can have independent hours and closed days

### Configuration

#### Store Hours
Set regular operating hours in **Manage > Shop Locations > [Location] > Store Hours**:
- Configure hours for each day of the week (Monday-Sunday)
- Times are in 5-minute intervals using select dropdowns
- Empty time = location closed that day
- Format: 12-hour display (e.g., "09:00 AM"), 24-hour storage (e.g., "09:00")

#### Closed Days / Public Holidays
Add special closure dates in **Manage > Shop Locations > [Location] > Closed Days**:
- **Name**: Description (e.g., "Christmas Day", "Staff Training")
- **Start Date**: First day of closure
- **End Date**: Last day of closure (same as start for single-day closures)
- Supports multi-day ranges (e.g., Dec 24-26 for Christmas break)

### How It Works

#### Class/Course Booking Flow
1. Customer selects a class or course product in POS
2. Customer chooses a date from the calendar
3. System fetches all configured class times for that date
4. System checks each time against:
   - Current location's store hours for that day of week
   - Current location's closed days list
5. Conflicting times are marked with:
   - Strikethrough text styling
   - Red "Closed day" or "Outside store hours" badge
   - Disabled checkbox (cannot be selected)
   - "Unavailable" status instead of spot count
6. Valid times remain selectable with normal styling

#### Conflict Detection Logic
**Store Hours Check**:
- Extracts day of week from class datetime
- Compares class time against location's hours for that day
- If no hours configured for that day → blocked
- If class time before open or after close → blocked

**Closed Days Check**:
- Converts class date to YYYY-MM-DD format
- Checks if date falls within any closed day range
- If startDate <= classDate <= endDate → blocked

### Example Scenarios

#### Scenario 1: Standard Store Hours
**Setup**:
- Location: Main HQ
- Monday hours: 05:00 AM - 10:50 PM
- Tuesday hours: 10:00 AM - 05:00 PM
- Wednesday-Sunday: Not set (closed)

**Class Schedule**: Weights Class runs Monday-Sunday at 8:00 AM

**Result**:
- Monday 8:00 AM ✅ Available (within 05:00 AM - 10:50 PM)
- Tuesday 8:00 AM ❌ ~~Outside store hours~~ (before 10:00 AM open)
- Wednesday 8:00 AM ❌ ~~Outside store hours~~ (no hours configured)

#### Scenario 2: Public Holiday
**Setup**:
- Location hours: Monday-Sunday 06:00 AM - 09:00 PM
- Closed day: "Christmas Day" Dec 25, 2025 - Dec 25, 2025
- Class: Morning Yoga, Monday-Sunday at 07:00 AM

**Result**:
- Dec 24, 2025 at 07:00 AM ✅ Available
- Dec 25, 2025 at 07:00 AM ❌ ~~Closed day~~ (Christmas)
- Dec 26, 2025 at 07:00 AM ✅ Available

#### Scenario 3: Multi-Day Closure
**Setup**:
- Closed days: "New Year Break" Dec 31, 2025 - Jan 2, 2026
- Class: Spin Class, daily at 06:00 PM

**Result**:
- Dec 30, 2025 at 06:00 PM ✅ Available
- Dec 31, 2025 at 06:00 PM ❌ ~~Closed day~~ (New Year Break)
- Jan 1, 2026 at 06:00 PM ❌ ~~Closed day~~ (New Year Break)
- Jan 2, 2026 at 06:00 PM ❌ ~~Closed day~~ (New Year Break)
- Jan 3, 2026 at 06:00 PM ✅ Available

#### Scenario 4: Late Night Class
**Setup**:
- Store hours: Monday-Friday 06:00 AM - 10:00 PM
- Class: Evening Spin, Monday-Friday at 10:30 PM

**Result**:
- All weekday 10:30 PM times ❌ ~~Outside store hours~~ (after 10:00 PM close)
- Staff should adjust class schedule or extend store hours

### Database Schema

```javascript
// Location Model
{
  name: String,
  address1: String,
  city: String,
  state: String,
  postcode: String,
  phone: String,
  
  // Store hours array (one entry per day of week)
  storeHours: [
    {
      d: Number,      // Day: 0=Sunday, 1=Monday, ..., 6=Saturday
      open: String,   // "09:00" (24-hour format)
      close: String   // "17:30" (24-hour format)
    }
  ],
  
  // Closed days array
  closedDays: [
    {
      name: String,      // "Christmas Day", "Staff Training"
      startDate: String, // "2025-12-25" (YYYY-MM-DD)
      endDate: String    // "2025-12-25" (YYYY-MM-DD)
    }
  ],
  
  org: ObjectId
}
```

### Technical Implementation
- `/app/(app)/manage/locations/location.js` - Location form with hours/closed days
- `/app/(app)/shop/(other)/classes/useClass.js` - Booking validation logic
- `/app/(app)/shop/(other)/classes/productDetailClass.js` - UI with conflict display
- Helper functions:
  - `isWithinLocationHours(dateTime, location)` - Validates class time against store hours
  - `isClosedDay(date, location)` - Checks if date falls on closed day

### UI/UX Conventions
- **Time Selection**: Shadcn Select component with 5-minute intervals
- **Conflicting Times**: 
  - Text with `line-through` class
  - Red destructive badge showing reason
  - Reduced opacity (60%)
  - Checkbox disabled
  - Shows "Unavailable" instead of spot count
- **Normal Times**:
  - Regular styling
  - Shows available spots or "Full"
  - Checkbox enabled if spots available

### Testing & Verification
1. Configure location with specific store hours
2. Add closed days for upcoming dates
3. Create class/course with schedule spanning multiple days
4. Navigate to POS > Classes
5. Select the product
6. Choose date and verify:
   - Times outside store hours show strikethrough
   - Times on closed days show strikethrough
   - Correct conflict reason badge displayed
   - Cannot select conflicting times
7. Test edge cases:
   - Midnight crossing (23:00-01:00)
   - No store hours configured
   - Multi-day closed periods
   - Same-day start/end closed days

### Future Enhancements
- [ ] Timezone support for multi-location organizations
- [ ] Recurring closed days (e.g., "Every Sunday")
- [ ] Holiday templates (auto-populate common holidays by region)
- [ ] Temporary hour overrides (e.g., special event hours)
- [ ] Email notifications when bookings are affected by hour changes
- [ ] Bulk import closed days from CSV
- [ ] Integration with external calendar systems (Google Calendar, Outlook)

