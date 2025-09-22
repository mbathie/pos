# Checkout Scenarios Documentation

## Overview
This document outlines all the different scenarios, use cases, and rules for the checkout/payment process in the POS system. It covers product types, payment methods, customer requirements, discounts, surcharges, and receipt handling.

## Quick Reference Grid

### Product Type Requirements

| Product Type | Customer Required | Payment Methods | Waiver Required | Auto Receipt | Discounts | Surcharges |
|-------------|------------------|-----------------|-----------------|--------------|-----------|------------|
| **Shop** | Optional* | Cash, Card | If configured | If enabled & customer selected | All applicable | All applicable |
| **Membership** | ✅ Required | Card Only | ✅ Always | ✅ Always | Sign-up, loyalty | All applicable |
| **Class** | ✅ Required (per slot) | Cash, Card | Usually | If customer has email | Early bird, member, pack | All applicable |
| **Course** | ✅ Required (per slot) | Cash, Card | ✅ Always | ✅ Always | Early enrollment, member | All applicable |
| **General** | Optional | Cash, Card | If configured | Based on customer | All applicable | All applicable |

*Required if waiver configured or discount requires customer

### Payment Method Matrix

| Scenario | Cash | Card | Customer Credits | Notes |
|----------|------|------|------------------|-------|
| Shop items | ✅ | ✅ | ✅ | Standard retail |
| Membership signup | ❌ | ✅ | ✅ | Recurring needs card |
| Class enrollment | ✅ | ✅ | ✅ | One-time payment |
| Course enrollment | ✅ | ✅ | ✅ | One-time payment |
| Zero-dollar transaction | ❌ | ✅ | ✅ | Requires card processing |
| Credit top-up | ❌ | ✅ | N/A | Adding to balance |

### Discount & Surcharge Application Order

| Order | Type | When Applied | Example |
|-------|------|--------------|---------|
| 1 | Base Price | Always | $100.00 |
| 2 | **Surcharges** | Auto (if conditions met) | +$10.00 (10%) |
| 3 | **Discounts** | Auto or Manual | -$11.00 (10% of $110) |
| 4 | Customer Credits | If available & selected | -$20.00 |
| 5 | Tax Calculation | On adjusted subtotal | +$7.90 (10% of $79) |
| **Final** | **Total** | | **$86.90** |

### Customer Requirement Triggers

| Trigger | Requirement | Example |
|---------|-------------|---------|
| Product type = membership | Customer required | Monthly gym membership |
| Product type = class/course | Customer per slot | Yoga class with 3 attendees |
| Product.waiverRequired = true | Customer required | Rock climbing day pass |
| Discount.requireCustomer = true | Customer required | Member-only discount |
| Using customer credits | Customer required | Applying $20 credit balance |
| Auto receipt for shop items | Customer preferred | Coffee with auto receipt |

### Receipt Sending Logic

| Condition | Auto Send | Manual Option | Example |
|-----------|-----------|---------------|---------|
| Membership purchase | ✅ Always | Not needed | Monthly subscription |
| Class/Course enrollment | ✅ Always | Not needed | Yoga class booking |
| Shop + Customer + autoReceiptShop=true | ✅ Automatic | Can resend | Coffee purchase by member |
| Shop + Customer + autoReceiptShop=false | ❌ No | ✅ Available | Coffee purchase, manual receipt |
| Shop + No customer | ❌ No | Enter email | Walk-in coffee purchase |
| Customer requests | N/A | ✅ Enter email | Any transaction |

## Product Types

### 1. Shop Products
**Description:** Physical or consumable items sold at the point of sale (coffee, merchandise, etc.)

**Requirements:**
- Customer: Optional (unless waiver required or for receipt)
- Payment Methods: Cash or Card
- Discounts: All applicable discounts
- Auto Receipt: Yes, if customer selected and org setting enabled
- Waiver: Only if product has `waiverRequired: true`

**Example: Flat White**
- Price: $5.50
- Customer: Optional
- Payment: Cash or Card accepted
- Discounts: Staff discount (20%), Member discount (10%), Happy Hour (15%)
- Receipt: Auto-sent if customer selected and autoReceiptShop enabled

### 2. Membership Products
**Description:** Recurring subscription products with billing cycles

**Requirements:**
- Customer: **Required** (must be assigned to each slot)
- Payment Methods: **Card only** (no cash allowed)
- Discounts: Sign-up discounts, loyalty discounts
- Auto Receipt: Always sent to customer email
- Waiver: Always required

**Example: Monthly Gym Membership**
- Price: $89/month
- Customer: Required for each membership slot
- Payment: Card only
- Discounts: First month free, Student discount (15%)
- Receipt: Automatically sent

### 3. Class Products
**Description:** Scheduled sessions that customers attend (yoga class, workshop, etc.)

**Requirements:**
- Customer: **Required** for each attendee slot
- Payment Methods: Cash or Card
- Discounts: Early bird, member rates, package deals
- Auto Receipt: Sent if customer has email
- Waiver: Usually required

**Example: Yoga Class**
- Price: $25 per person
- Customer: Required for each participant
- Payment: Cash or Card
- Discounts: Member rate ($20), 10-class pack rate
- Receipt: Sent to each participant

### 4. Course Products
**Description:** Multi-session programs (8-week course, training program)

**Requirements:**
- Customer: **Required** for each enrolled slot
- Payment Methods: Cash or Card
- Discounts: Early enrollment, member discounts
- Auto Receipt: Sent to enrolled customers
- Waiver: Always required

**Example: 8-Week Fitness Program**
- Price: $350 per person
- Customer: Required for enrollment
- Payment: Cash or Card
- Discounts: Early bird ($50 off), Member rate ($300)
- Receipt: Sent upon enrollment

### 5. General Products
**Description:** Miscellaneous charges or custom items

**Requirements:**
- Customer: Optional
- Payment Methods: Cash or Card
- Discounts: Applicable based on configuration
- Auto Receipt: Based on customer selection
- Waiver: Based on product configuration

## Payment Method Restrictions

### Cash Payment
**Allowed for:**
- Shop products
- Class products
- Course products
- General products

**Not allowed for:**
- Membership products (recurring subscriptions require card)
- Zero-dollar transactions
- Customer credit purchases

### Card Payment
**Allowed for:**
- All product types
- Zero-dollar transactions (with valid discount/credit)
- Customer credit top-ups

**Required for:**
- Membership products
- Recurring subscriptions
- Online payments

### Customer Credits
**Requirements:**
- Customer must be selected
- Credits checked against customer balance
- Can be combined with other payment methods
- Applied before other discounts

## Customer Requirements

### When Customer is Required
1. **Membership products** - Always required
2. **Class/Course products** - Required for each slot
3. **Products with waiver** - Required if `waiverRequired: true`
4. **Discount with customer requirement** - When discount has `requireCustomer: true`
5. **Customer credits** - To use available credit balance

### Adult vs Minor/Dependent
- **Adults:** Can sign own waivers, receive receipts, have own accounts
- **Minors/Dependents:**
  - Linked to parent/guardian account
  - Waiver signed by guardian
  - Receipts sent to guardian email
  - May have age-based pricing

## Discount Scenarios

### Automatic Discounts
**Description:** Applied automatically when conditions are met

**Conditions:**
- `autoAssign: true` in discount configuration
- Customer must be identified (if required)
- Must meet "must have" requirements (products/categories)
- Valid on current day of week
- Within usage limits

**Example: Member Discount**
- Auto-applies when member is identified
- 10% off shop items
- Must have active membership
- No usage limit

### Manual Discounts
**Description:** Staff selects from dropdown or enters code

**Types:**
1. **Code-based:** Customer provides discount code
2. **Staff-selected:** From available discounts list
3. **Custom amount:** Staff enters dollar or percentage
4. **PIN-protected:** Requires manager PIN

**Example: Staff Discount**
- Staff selects from dropdown
- 20% off all items
- Requires manager PIN
- Limited to 5 uses per month

### Discount Priority & Stacking
- Only one discount code can be active
- Surcharges apply before discounts
- Customer credits apply after discounts
- Maximum discount caps are enforced

### Usage Limits
**Global limits:**
- Total usage across all customers
- Frequency limits (X per day/week/month)

**Per-customer limits:**
- Maximum uses per customer
- Time-based restrictions

### Suspended Membership Discounts
**Description:** Membership discounts are blocked during suspension period

**Behavior:**
- Auto-detection of suspended membership status
- Discount validation fails with clear messaging
- "This discount is not available while your membership is suspended"
- Applies to all membership-required discounts

**Example:**
- Customer has suspended membership (paused for vacation)
- Attempts to use member discount code
- System blocks discount with suspension message
- Discount automatically reactivates when membership resumes

## Surcharge Scenarios

### Automatic Surcharges
**Description:** Always auto-apply when conditions met

**Common surcharges:**
1. **Weekend surcharge:** +10% on weekends
2. **Peak hour surcharge:** +$2 during busy times
3. **Credit card fee:** +1.5% for card payments
4. **Holiday surcharge:** +15% on public holidays

**Example: Sunday Surcharge**
- Auto-applies on Sundays
- 10% added to applicable items
- Applies before discounts
- Shows as separate line item

## Receipt Scenarios

### Automatic Receipt Delivery
**When auto-sent:**
1. Shop items + customer selected + `autoReceiptShop: true`
2. Membership purchases (always)
3. Class/Course enrollments (always)
4. Customer requests via email input

### Manual Receipt Sending
**Process:**
1. Staff enters customer email
2. Click "Send Receipt"
3. System validates email format
4. Receipt sent with transaction details

### Receipt Contents
- Organization logo and details
- Transaction date/time
- Product details with adjustments
- Payment method
- Tax breakdown
- Total amount
- Reference number

## Complex Scenarios

### Scenario 1: Family Yoga Class
**Setup:**
- 2 adults, 1 child (dependent)
- Member family rate applies
- Sunday (surcharge day)

**Process:**
1. Add 3 class slots
2. Assign adults to 2 slots
3. Assign child as dependent to 3rd slot
4. Sunday surcharge auto-applies (+10%)
5. Family member discount auto-applies (-20%)
6. Parent signs waiver for child
7. Payment: Card or Cash
8. Receipt sent to primary adult

**Totals:**
- Base: $75 (3 × $25)
- Surcharge: +$7.50
- Discount: -$15
- Tax: $6.75
- Total: $74.25

### Scenario 2: Coffee + New Membership
**Setup:**
- Flat white purchase
- Monthly membership signup
- First-timer discount

**Process:**
1. Add flat white to cart
2. Add membership product
3. Select/create customer
4. First-timer discount applies to membership
5. Customer signs waiver
6. Payment: Card only (due to membership)
7. Receipt auto-sent

**Totals:**
- Flat white: $5.50
- Membership: $89
- First-timer discount: -$20
- Tax: $7.45
- Total: $81.95

### Scenario 3: Zero-Dollar Transaction
**Setup:**
- Product covered by customer credit
- Or 100% discount/voucher

**Process:**
1. Add product to cart
2. Select customer
3. Apply credit or discount
4. Total becomes $0
5. Process as card payment (zero-dollar)
6. Transaction recorded
7. Receipt sent

### Scenario 4: Suspended Member Purchase
**Setup:**
- Customer with suspended membership
- Attempting to buy coffee with member discount
- Membership paused for 14-day vacation

**Process:**
1. Add coffee to cart ($5.50)
2. Select customer (shows suspended status)
3. Try to apply member discount code
4. System shows: "This discount is not available while your membership is suspended"
5. Customer pays full price
6. Can use non-member discounts if eligible
7. Receipt shows no member discount applied

**Note:** Once membership resumes, discount automatically works again

## Error Scenarios

### Common Issues & Solutions

1. **"Customer required for this product"**
   - Membership, class, or waiver-required product needs customer assignment

2. **"Card payment only for memberships"**
   - Switch from cash to card tab

3. **"Discount requires customer identification"**
   - Select customer before applying discount

4. **"Discount usage limit reached"**
   - Customer or global limit exceeded

5. **"Invalid discount code"**
   - Code expired, wrong day, or doesn't exist

6. **"Insufficient customer credits"**
   - Credit balance less than attempted use

## Configuration Notes

### Organization Settings
- `autoReceiptShop`: Auto-send receipts for shop-only transactions
- `membershipSuspensionDaysPerYear`: Max suspension days allowed

### Product Settings
- `waiverRequired`: Forces customer assignment
- `category`: Used for discount/surcharge targeting
- `type`: Determines payment rules and requirements

### Discount Settings
- `autoAssign`: Auto-apply vs manual selection
- `requireCustomer`: Forces customer identification
- `musts`: Required products/categories for eligibility
- `limits`: Usage restrictions and frequency

### Terminal Settings
- Test mode available for development
- Simulator for testing without hardware
- Multiple terminals per location supported