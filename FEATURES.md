# POS System Features Documentation

This document provides comprehensive documentation for all major features implemented in the POS system.

## Table of Contents
- [Stripe Invoice System for Group/Company Bookings](#stripe-invoice-system-for-groupcompany-bookings)

---

## Stripe Invoice System for Group/Company Bookings

**Date Implemented:** 21.11.2025
**Status:** ✅ Complete

### Overview
Automated invoice generation and payment tracking for company/group purchases. When a company makes a booking (e.g., corporate classes, school groups), the system automatically creates a Stripe invoice, emails it to the company contact, and tracks payment status including partial payments.

### Key Functionality

#### 1. **Company Stripe Customer Management**
- Automatically creates Stripe customers for companies on first purchase
- Stores customer ID in company record for future transactions
- Syncs company details (name, email, address, ABN) to Stripe
- Supports updating customer details when company information changes

#### 2. **Invoice Generation**
- **Automatic creation** on group purchase completion
- **Detailed line items** with one line per product for transparency
- **Discounts and surcharges** as separate line items
- **Tax calculation** included as line item
- **Auto-send** via email to company contact
- **Hosted invoice page** provided by Stripe for easy payment

#### 3. **Payment Tracking**
- **Real-time status updates** via Stripe webhooks
- **Partial payment support** natively through Stripe
- Tracks `invoiceAmountPaid` and `invoiceAmountDue` separately
- Updates transaction status:
  - `open` - Invoice sent, awaiting payment
  - `partially_paid` - Some amount paid, balance remaining
  - `paid` - Invoice fully paid
  - `void` - Invoice cancelled
  - `uncollectible` - Marked as uncollectible

#### 4. **Customer Assignment Flow**
- ✅ **Immediate assignment** - Customers can sign waivers before payment
- Waiver link sent with invoice email
- Placeholder customers block spots immediately
- Payment can happen before or after waiver completion

#### 5. **Payment Terms**
Configurable per company:
- `due_on_receipt` - Payment due immediately (default)
- `net_7` - Payment due in 7 days
- `net_15` - Payment due in 15 days
- `net_30` - Payment due in 30 days
- `net_60` - Payment due in 60 days

### Configuration Options

#### Organization Settings
No special configuration needed - works out of the box with existing Stripe Connected Account setup.

#### Company Settings
Each company can have:
- **Payment Terms**: How long they have to pay invoices
- **Stripe Customer ID**: Auto-created and stored for invoice generation

### Technical Implementation

#### Database Schema Changes

**Company Model** (`models/Company.js`)
```javascript
{
  stripeCustomerId: String,    // Stripe customer ID
  paymentTerms: String,         // 'due_on_receipt', 'net_7', 'net_15', 'net_30', 'net_60'
}
```

**Transaction Model** (`models/Transaction.js`)
```javascript
{
  stripeInvoiceId: String,      // Stripe invoice ID
  invoiceStatus: String,         // 'draft', 'open', 'paid', 'void', 'uncollectible', 'partially_paid'
  invoiceAmountPaid: Number,     // Amount paid so far
  invoiceAmountDue: Number,      // Remaining amount due
  invoiceUrl: String,            // Hosted invoice URL from Stripe
}
```

#### Relevant Files

**Utilities:**
- `/lib/stripe/company-customer.js` - Company Stripe customer creation and management
  - `getOrCreateCompanyStripeCustomer()` - Get existing or create new Stripe customer
  - `updateCompanyStripeCustomer()` - Update Stripe customer details

- `/lib/stripe/invoice.js` - Invoice creation and payment handling
  - `createCompanyInvoice()` - Generate invoice with line items
  - `handleInvoicePayment()` - Process invoice payment webhook
  - `handleInvoiceUpdate()` - Track partial payments

**API Endpoints:**
- `/app/api/payments/company/route.js` - Process company payments and create invoices

**Webhooks:**
- `/app/api/webhooks/stripe/route.js` - Handle Stripe webhook events
  - `invoice.paid` - Update transaction when invoice is paid
  - `invoice.updated` - Track partial payment amounts
  - `invoice.payment_failed` - Handle failed payment attempts

**Email Templates:**
- `/lib/email/company-waiver.js` - Company waiver email with invoice link

#### Models Used
- `Company` - Company/organization making group purchases
- `Transaction` - Purchase transactions with invoice tracking
- `Org` - Organization (business) receiving payment
- `Schedule` - Class/course schedule with customer assignments

### Example Scenarios with Calculations

#### Scenario 1: School Group Class Booking - Full Payment
**Setup:**
- School books yoga class for 20 students
- Price: $25 per student
- 10% early bird discount applied
- Payment terms: Net 30

**Flow:**
1. Staff creates booking at POS
2. Selects "Test School" company
3. Adds 20x Youth tickets at $25 each = $500
4. Applies 10% discount = -$50
5. Tax (10%) = $45
6. **Total: $495**

**Invoice Generation:**
```
Line Items:
- Youth Yoga Class (20x $25.00)  = $500.00
- Discount: Early Bird 10%       = -$50.00
- Tax                            = $45.00
-------------------------------------------
Total Due:                         $495.00
Payment Terms: Net 30
```

**Email Sent:**
- To: school@example.com
- Subject: "Waiver Link for Test School - YogaStudio"
- Contains:
  - Invoice link (hosted by Stripe)
  - Waiver link for participants
  - Purchase details
  - Payment instructions

**Payment:**
- School accountant receives email
- Opens invoice link
- Pays full $495.00
- Webhook updates transaction status to "completed"

#### Scenario 2: Corporate Event - Partial Payment
**Setup:**
- Corporation books 50 spots for team building
- Price: $30 per person = $1,500
- No discounts
- Tax: $150
- **Total: $1,650**

**Flow:**
1. Invoice created and sent
2. Company pays deposit: $500
   - Webhook receives `invoice.updated`
   - Updates: `invoiceAmountPaid = $500`, `invoiceAmountDue = $1,150`
   - Status: `partially_paid`
3. Company pays remainder: $1,150
   - Webhook receives `invoice.paid`
   - Updates: `invoiceAmountPaid = $1,650`, `invoiceAmountDue = $0`
   - Status: `paid`, transaction status: `completed`

### Testing & Verification Steps

#### 1. **Test Invoice Creation**
```bash
# Using the POS interface:
1. Navigate to /shop/payment
2. Select "Group" payment type
3. Select a company from dropdown
4. Add products to cart
5. Click "Accept" button
6. Check server console for:
   - "✅ Created Stripe customer: cus_xxx"
   - "✅ Created invoice: in_xxx"
   - "✅ Finalized and sent invoice: in_xxx"
   - "   Hosted invoice URL: https://..."
7. Check company email for invoice
```

#### 2. **Test Partial Payment**
```bash
# In Stripe Dashboard:
1. Find the test invoice
2. Record a partial payment
3. Check server webhook logs for:
   - "📝 Updating invoice status for transaction: xxx"
   - "✅ Updated transaction with partial payment"
4. Check transaction in database:
   - invoiceStatus should be "partially_paid"
   - invoiceAmountPaid should match partial amount
   - invoiceAmountDue should show remaining balance
```

#### 3. **Test Full Payment**
```bash
# Pay invoice via hosted page:
1. Open invoice URL from email
2. Enter test card: 4242 4242 4242 4242
3. Submit payment
4. Check webhook logs for:
   - "💰 Processing invoice payment for transaction: xxx"
   - "✅ Invoice fully paid - marking transaction as completed"
5. Verify transaction status is "completed"
```

#### 4. **Test Payment Failure**
```bash
# Use Stripe test card that fails:
1. Open invoice URL
2. Enter failing card: 4000 0000 0000 0002
3. Submit payment
4. Check webhook logs for:
   - "❌ Company invoice payment failed: in_xxx"
5. Verify invoice remains "open" for retry
```

### Limitations and Considerations

#### Current Limitations
1. **No manual invoice editing** - Once created, invoices cannot be edited (Stripe limitation)
2. **No invoice cancellation UI** - Must void invoices directly in Stripe Dashboard
3. **Single currency** - Currently hardcoded to AUD
4. **No invoice reminders** - Automatic reminders not yet implemented
5. **No admin invoice view** - Staff cannot view invoice status in POS interface yet

#### Edge Cases Handled
✅ **Invoice creation fails** - Transaction still created, can manually create invoice later
✅ **Email send fails** - Invoice still created and logged
✅ **Webhook missed** - Stripe retries webhook delivery automatically
✅ **Company without Stripe customer** - Auto-creates on first use
✅ **Partial payments** - Tracked accurately via webhooks

#### Not Handled Yet
❌ **Refunds** - Need to implement credit notes for invoice refunds
❌ **Multi-currency** - Only supports AUD currently
❌ **Manual payment recording** - Cannot manually mark invoice as paid
❌ **Payment reminders** - No automatic reminder emails for overdue invoices

### Future Enhancements

#### High Priority
- [ ] Admin UI to view invoice status in transaction details
- [ ] Manual invoice resend functionality
- [ ] Invoice void/cancel from POS interface
- [ ] Payment reminder system for overdue invoices

#### Medium Priority
- [ ] Refund handling with credit notes
- [ ] Manual payment recording (e.g., bank transfer received)
- [ ] Invoice PDF download from POS
- [ ] Bulk invoice generation for multiple companies

#### Low Priority
- [ ] Multi-currency support
- [ ] Custom invoice templates
- [ ] Invoice analytics and reporting
- [ ] Automatic payment reminders schedule

### Related Features
- [Group Purchase Waiver System](#) - Customers sign waivers after company booking
- [Schedule Management](#) - Placeholder customers block spots immediately
- [Email Notifications](#) - Integrated email system for invoices and waivers

### Support & Troubleshooting

#### Common Issues

**Issue:** Invoice not received by company
- **Solution:** Check spam folder, verify email address in company record, check server logs for email send errors

**Issue:** Webhook not processing payment
- **Solution:** Check webhook secret is configured, verify Stripe webhook endpoint is accessible, check server logs

**Issue:** Partial payment not tracked
- **Solution:** Ensure `invoice.updated` webhook is enabled in Stripe, check webhook logs

**Issue:** Invoice shows wrong amount
- **Solution:** Verify cart totals are calculated correctly before invoice creation, check discount/surcharge application

#### Debug Commands
```bash
# Check company Stripe customer
db.companies.findOne({ _id: ObjectId("xxx") }, { stripeCustomerId: 1 })

# Check transaction invoice status
db.transactions.findOne({ _id: ObjectId("xxx") }, {
  stripeInvoiceId: 1,
  invoiceStatus: 1,
  invoiceAmountPaid: 1,
  invoiceAmountDue: 1,
  invoiceUrl: 1
})

# Check webhook logs
tail -f tmp/stripe-webhooks.log
```

### Additional Resources
- [Stripe Invoices Documentation](https://stripe.com/docs/invoicing)
- [Stripe Connected Accounts](https://stripe.com/docs/connect)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

---

*Last Updated: 21.11.2025*
