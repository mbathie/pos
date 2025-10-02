# Stripe Webhook Setup Guide

## Overview

This guide covers setting up and testing the Stripe webhook handler for subscription renewal payments. The webhook handles automatic billing for membership subscriptions, enforces billing limits, and creates transaction records.

## Prerequisites

- Stripe account with Connect enabled
- Stripe CLI installed (for local testing)
- Environment variables configured

## Environment Variables

Add these to your `.env` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Webhook Secret (get this from Stripe Dashboard or CLI)
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Platform
EMAIL_PLATFORM=brevo  # or 'ethereal' for testing
```

## Webhook Endpoint

**URL**: `/api/webhooks/stripe`
**Method**: `POST`
**Events Handled**:
- `invoice.paid` - Subscription renewal payment successful
- `invoice.payment_failed` - Payment failed (logged only)
- `customer.subscription.deleted` - Subscription cancelled (logged only)

## Local Development Setup

### 1. Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
# Download from https://github.com/stripe/stripe-cli/releases
```

### 2. Login to Stripe CLI

```bash
stripe login
```

### 3. Forward Webhooks to Local Server

```bash
# Start your Next.js dev server first
npm run dev

# In another terminal, forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will output a webhook signing secret like:
```
> Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

Copy this secret and add it to your `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 4. Test the Webhook

Trigger a test event:

```bash
# Trigger invoice.paid event
stripe trigger invoice.paid

# Trigger payment failure
stripe trigger invoice.payment_failed
```

## Production Setup

### 1. Configure Webhook in Stripe Dashboard

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
5. Click "Add endpoint"

### 2. Get Webhook Signing Secret

1. Click on your newly created webhook endpoint
2. Copy the "Signing secret" (starts with `whsec_`)
3. Add it to your production environment variables

### 3. For Stripe Connect (Multi-tenant)

If using Stripe Connect:
1. Configure webhook at the **platform level** (not for each connected account)
2. The webhook will receive events for all connected accounts
3. The `event.account` field will contain the connected account ID

## Testing Subscription Renewals

### Option 1: Short Billing Intervals (Recommended for Testing)

Create a test subscription with daily billing:

```javascript
// When creating subscription in your app
const subscription = await stripe.subscriptions.create({
  customer: 'cus_xxx',
  items: [{ price: 'price_xxx' }],
  collection_method: 'send_invoice',
  days_until_due: 1,
  billing_cycle_anchor: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
  // ... other params
});
```

The subscription will renew every 24 hours instead of monthly!

### Option 2: Stripe Test Clocks

```bash
# Create a test clock
stripe test_helpers test_clocks create \
  --frozen-time="2025-01-31T00:00:00Z"

# Note the clock ID (tc_xxx)

# When creating subscription, attach to test clock
stripe subscriptions create \
  --customer=cus_xxx \
  --items[0][price]=price_xxx \
  --test-clock=tc_xxx

# Fast forward time to trigger billing
stripe test_helpers test_clocks advance tc_xxx \
  --frozen-time="2025-03-01T00:00:00Z"
```

### Option 3: Manual Invoice Payment (Immediate Testing)

```bash
# 1. Get the subscription ID from your database or Stripe dashboard
SUBSCRIPTION_ID=sub_xxx

# 2. Create and finalize an invoice immediately
stripe invoices create --subscription=$SUBSCRIPTION_ID
stripe invoices finalize <invoice_id>

# 3. Pay the invoice to trigger webhook
stripe invoices pay <invoice_id>
```

### Option 4: Stripe CLI Trigger (Quick Test)

```bash
# Simulate an invoice.paid event
stripe trigger invoice.paid
```

**Note**: This creates a generic event, not tied to your actual subscription data.

## Webhook Behavior

### What Happens on `invoice.paid`

1. ✅ **Validates Event**: Verifies webhook signature
2. ✅ **Skips First Invoice**: Ignores `subscription_create` invoices (already handled during signup)
3. ✅ **Fetches Data**: Retrieves subscription, customer, organization, product from database
4. ✅ **Creates Transaction**: Logs the renewal payment in `transactions` collection
5. ✅ **Updates Membership**: Sets `nextBillingDate`, `lastBillingDate`, status
6. ✅ **Enforces Billing Max**:
   - Increments `billingCount` in subscription metadata
   - Cancels subscription if `billingCount >= billingMax`
   - Updates membership with cancellation info
7. ✅ **Sends Receipt**: Emails receipt to customer
8. ✅ **Logs Everything**: Writes detailed log to `./tmp/stripe-webhooks.log`

### Billing Max Logic

```
Example: billingMax = 12 (12-month membership)

Initial signup:
- First period charged via terminal
- billingCount = 1
- billingMax = 12

Renewal #1 (invoice.paid):
- billingCount: 1 → 2
- Remaining: 10
- Action: Continue

Renewal #11 (invoice.paid):
- billingCount: 11 → 12
- Remaining: 0
- Action: Cancel subscription (cancel_at_period_end = true)

After period ends:
- Subscription cancelled
- Membership status updated
- No further charges
```

## Log File Format

Logs are written to `./tmp/stripe-webhooks.log`:

```json
[2025-01-31T12:00:00.000Z] invoice.paid
{
  "eventType": "invoice.paid",
  "customerId": "68a28bc3682...",
  "customerName": "John Smith",
  "customerEmail": "john@example.com",
  "subscriptionId": "sub_abc123",
  "invoiceId": "in_xyz789",
  "billingDetails": {
    "amount": 89.00,
    "currency": "AUD",
    "tax": 8.90,
    "total": 97.90
  },
  "billingCycle": {
    "action": "continued",
    "billingCount": 3,
    "billingMax": 12,
    "remaining": 9
  },
  "nextBillingDate": "2025-03-01T00:00:00.000Z",
  "currentPeriod": {
    "start": "2025-01-01T00:00:00.000Z",
    "end": "2025-02-01T00:00:00.000Z"
  },
  "transactionId": "68f9a2b...",
  "membershipId": "68e7c3d...",
  "receipt": {
    "sent": true,
    "email": "john@example.com",
    "provider": "brevo",
    "messageId": "msg_abc123"
  },
  "metadata": {
    "productId": "68a1b2c...",
    "productName": "Monthly Gym Membership",
    "priceName": "Adult",
    "organizationId": "689f13f..."
  }
}
====================================================================================================
```

## Monitoring

### Check Webhook Logs in Stripe Dashboard

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint
3. View "Recent deliveries" tab
4. Click on an event to see:
   - Request body sent to your endpoint
   - Response from your endpoint
   - Any errors

### Check Application Logs

```bash
# View webhook log file
tail -f tmp/stripe-webhooks.log

# View Next.js server logs
# Look for console.log outputs from the webhook handler
```

### Common Issues

#### ❌ "Webhook signature verification failed"
- **Cause**: Wrong `STRIPE_WEBHOOK_SECRET`
- **Fix**: Copy the correct secret from Stripe Dashboard or CLI

#### ❌ "Customer or organization not found"
- **Cause**: Subscription metadata missing IDs
- **Fix**: Ensure subscription is created with proper metadata:
  ```javascript
  metadata: {
    customerId: customer._id.toString(),
    orgId: org._id.toString(),
    productId: product._id.toString()
  }
  ```

#### ❌ "Membership not found"
- **Cause**: No matching membership record in database
- **Fix**: Ensure membership was created during initial subscription signup

#### ⚠️ "Skipping subscription_create invoice"
- **Not an error**: This is expected behavior
- **Reason**: First payment already handled during signup, no need to process again

## Security

### Webhook Signature Verification

The webhook automatically verifies that requests come from Stripe:

```javascript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  endpointSecret
);
```

**Never** disable signature verification in production!

### Idempotency

Stripe may send the same event multiple times. The webhook should be idempotent:
- Transaction records use unique `stripe.invoiceId`
- Check for existing transactions before creating duplicates (TODO: implement)

## Testing Checklist

- [ ] Webhook endpoint accessible at `/api/webhooks/stripe`
- [ ] `STRIPE_WEBHOOK_SECRET` configured correctly
- [ ] Stripe CLI forwarding works locally
- [ ] `invoice.paid` creates transaction record
- [ ] Membership `nextBillingDate` updates correctly
- [ ] `billingCount` increments in subscription metadata
- [ ] Subscription cancels when `billingCount >= billingMax`
- [ ] Receipt email sent to customer
- [ ] Log file created at `./tmp/stripe-webhooks.log`
- [ ] Production webhook configured in Stripe Dashboard

## Troubleshooting

### Enable Verbose Logging

Check the webhook logs in `./tmp/stripe-webhooks.log` for detailed information about each event processed.

### Test Locally Without Stripe

You can test the webhook logic by sending a mock POST request:

```bash
# Create a mock invoice.paid event payload
# Send it to your local endpoint with proper signature
# (Use Stripe CLI for signature generation)
```

### Reset Test Data

To test billing limits:
1. Update subscription metadata in Stripe Dashboard
2. Reset `billingCount` to a lower number
3. Trigger invoice payment to test enforcement

## Support

For issues:
1. Check `./tmp/stripe-webhooks.log` for detailed error info
2. Check Stripe Dashboard > Developers > Webhooks > Recent deliveries
3. Review this documentation
4. Check Stripe API documentation: https://stripe.com/docs/webhooks
