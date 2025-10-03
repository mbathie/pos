# Project Conventions and Important Notes

## Documentation Maintenance

### Feature Documentation Requirements
After implementing or updating any feature, you MUST update the following documentation files:

1. **FEATURES.md** - Add comprehensive documentation including:
   - Feature overview and description
   - Key functionality and behavior
   - Configuration options (organization settings, etc.)
   - Technical implementation details
   - Example scenarios with calculations
   - List of relevant files in codebase
   - Testing & verification steps
   - Limitations and considerations
   - Future enhancements section

2. **FEATURES.txt** - Mark feature as DONE with date when completed:
   - Format: `DONE - feature description (DD.MM.YYYY)`
   - Keep TODO items for future enhancements

3. **CHECKOUT_SCENARIOS.md** - Update if the feature affects checkout/payment flow:
   - Add new scenarios or modify existing ones
   - Document error conditions and messages
   - Include complex use cases
   - Update quick reference grids if applicable

### Documentation Standards
- Use clear headings and subheadings
- Include code examples and file paths where relevant
- List all affected files with their purposes
- Provide step-by-step scenarios
- Document both happy path and edge cases
- Include test scripts and verification methods

### Checkout Scenarios Documentation
- **CRITICAL**: Always read `/CHECKOUT_SCENARIOS.md` BEFORE making any checkout/payment related changes
- **IMPORTANT**: After making changes to checkout/payment related code, update `/CHECKOUT_SCENARIOS.md`
- Reference this document to understand:
  - Current product type requirements and restrictions
  - Payment method rules (when cash vs card is allowed)
  - Customer assignment logic and requirements
  - Discount/surcharge application order and rules
  - Receipt sending behavior
  - Complex scenario handling
- This includes changes to:
  - Product type requirements (shop, membership, class, course, general)
  - Payment method restrictions (cash vs card rules)
  - Customer assignment requirements
  - Discount/surcharge logic in `/lib/adjustments.js`
  - Receipt sending logic
  - Waiver requirements
  - Any checkout validation rules
- Keep the summary tables up-to-date with any new scenarios or rule changes

## API Endpoint Structure

### Customer-facing API endpoints
- All API endpoints for the customer Flutter mobile app should reside in `/api/c/...`
- These endpoints use `getCustomer()` for authentication (Bearer token from customer login)
- Example: `/api/c/memberships`, `/api/c/auth/login`, `/api/c/locations/[id]`

### Employee/POS API endpoints  
- All API endpoints for the POS system should reside in `/api/...` (outside of `/api/c/`)
- These endpoints use `getEmployee()` for authentication (cookie-based auth)
- Example: `/api/customers/[id]/memberships`, `/api/employees`, `/api/products`

#### Folders API
- `GET /api/folders?search=` - Get all folders (pass empty search) or search folders
- `POST /api/folders` - Create new folder with `{ name, color }`
- `PUT /api/folders/[id]` - Update folder with `{ name, color }`
- `DELETE /api/folders/[id]` - Delete a folder

## Database Connection
- Always use `import { connectDB } from '@/lib/mongoose'` for database connections
- Call `await connectDB()` at the beginning of API routes
- Do NOT use `import dbConnect from '@/lib/mongodb'` as this module doesn't exist

## Stripe Integration

### Connected Accounts
- **IMPORTANT**: This application ALWAYS uses Stripe Connected Accounts
- All organizations have their own Stripe connected account (stored in `org.stripeAccountId`)
- All Stripe API calls must include the `stripeAccount` parameter in the options object (third parameter)
- Example: `stripe.subscriptions.retrieve(id, null, { stripeAccount: org.stripeAccountId })`
- Webhook events include `event.account` which is the connected account ID
- Connected account ID format: `acct_xxxxxxxxxxxxx`

### Invoice Structure (API Version Notes)
- In newer Stripe API versions, invoice subscription references are nested in the `parent` object:
  - New format: `invoice.parent.subscription_details.subscription`
  - Old format: `invoice.subscription` (may still exist in some cases)
  - Fallback: `invoice.lines.data[0].parent.subscription_item_details.subscription`
- Always check for subscription ID in all three locations when processing invoices

## Authentication

### Employee Authentication (POS System)
- Use `import { getEmployee } from '@/lib/auth'` for authentication in API routes
- Call `const { employee } = await getEmployee()` to get the authenticated employee
- Access org ID with `employee.org._id`
- Do NOT use `verifyAuth` - it doesn't exist

### Customer Authentication (Mobile App)
- Use `import { getCustomer } from '@/lib/auth'` for authentication in customer API routes
- Call `const { customer } = await getCustomer(request)` to get the authenticated customer
- Uses Bearer token authentication from Authorization header

## Shared Libraries
- Common business logic should be extracted into `/lib/` for code reuse between POS and customer apps
- When `/api/c/...` (customer API) and `/api/...` (POS API) endpoints share common functionality, move the shared code to `/lib/`
- The only difference between customer and POS endpoints should be authentication:
  - POS endpoints use `getEmployee()` for authentication
  - Customer endpoints use `getCustomer()` for authentication
- After authentication, both should use the same shared library functions
- This avoids code duplication and ensures consistency across both applications
- Example: `/lib/memberships.js` contains shared membership logic used by both customer and employee endpoints

## Models
- Always import models from the index file: `import { Customer, Membership, Product, etc } from '@/models'`
- Do NOT import models individually like `import Customer from '@/models/Customer'` as these files don't exist
- If adding a new model, make sure to:
  1. Create the model file in `/models/` directory
  2. Import it in `/models/index.js`
  3. Add it to the exports in `/models/index.js`

## Testing
- Run tests with `npm test`
- Run tests with UI: `npm run test:ui`
- Run headed tests: `npm run test:headed`

### Browser Testing with Playwright
- When testing pages behind authentication, use the following authentication cookie:
  ```
  eyJhbGciOiJIUzI1NiJ9.eyJzZWxlY3RlZExvY2F0aW9uSWQiOiI2OGEyOGJjMzY4MjA0ZmEwZmJkYzRjNjYiLCJlbWFpbCI6Im1iYXRoaWVAZ21haWwuY29tIiwiZW1wbG95ZWVJZCI6IjY4OWYxM2YxY2IwNzU0MzQxZTA5M2Q5MiIsIm9yZ0lkIjoiNjg5ZjEzZjBjYjA3NTQzNDFlMDkzZDc4IiwiZXhwIjoxNzg3NzI0MDY3fQ.t5YqTRUPCg-jtJB7DbJEA4ngMFhTmsV_ZbnbgYMdsgw
  ```
- After making UI changes, always verify the UI/UX using Playwright MCP to ensure:
  - Visual consistency with design system
  - Proper responsive behavior
  - Interactive elements work as expected
  - No visual regressions

## Development
- Start dev server: `npm run dev --turbopack`
- Build: `npm run build`
- Lint: `npm run lint`

## Next.js API Routes
- In Next.js API routes, params must be awaited: `const { id } = await params;` not `const { id } = params;`

## Email Configuration
- Use `process.env.EMAIL_ASSETS_DOMAIN` for image URLs in emails (logos, QR codes, etc.)
- Falls back to `process.env.NEXT_PUBLIC_API_BASE_URL` if EMAIL_ASSETS_DOMAIN is not set
- This ensures images load properly in email clients which may block certain domains

## UI/UX Conventions

### Reference Pages
- **Style Guide**: `/app/(unauth)/style-guide/page.js` - Comprehensive UI/UX style guide with all components, patterns, and best practices
- **Sample Table**: `/app/(unauth)/sample-table/page.js` - Reference implementation for tables with sorting, pagination, filtering, and sticky headers

### Core Principles
- All Button components should include `className='cursor-pointer'` to ensure consistent cursor behavior
- Use only standard shadcn/ui component variants - avoid custom Tailwind colors like `bg-red-500`, use shadcn variants instead
- Page titles should use `text-xl` (not larger) for better visual hierarchy
- Subheadings should follow the hierarchy defined in the style guide

### Typography
- Page titles: `text-xl font-semibold`
- Page descriptions: `text-sm text-muted-foreground`
- Section headings: `text-2xl font-semibold`
- Card titles: `text-lg font-semibold`
- Regular text: Default size, no additional classes needed

### Tables
- Use `align-middle` for table cells (better visual balance than `align-top`)
- Table headers should have `bg-muted/50` with `font-medium`
- Implement consistent icon/avatar spacing in first column with empty placeholder divs when needed
- For scrollable tables with fixed headers, use HTML `<table>` elements with `sticky top-0` on `<thead>`
- Always include hover states with `hover:bg-muted/50` on rows
- Use dropdown menus for row actions (never inline multiple buttons)

### Colors & Theming
- Use only shadcn/ui semantic color classes: `primary`, `secondary`, `destructive`, `muted`, `accent`
- For status indicators use Badge variants: `default`, `secondary`, `destructive`, `outline`
- Never use direct Tailwind color classes like `text-red-600` or `bg-green-500`

### Forms
- Always link labels to inputs with `htmlFor` and `id` attributes
- Include descriptive placeholders
- Use `aria-describedby` for helper text
- Disabled inputs should have `disabled` prop and show visual indication

### Spacing
- Use consistent spacing scale: `p-1` (4px), `p-2` (8px), `p-3` (12px), `p-4` (16px), `p-6` (24px), `p-8` (32px)
- Card padding: `p-4` for CardContent, default padding for CardHeader
- Section spacing: `mb-12` between major sections, `mb-6` for subsections

### Loading States
- Use Skeleton components for content that's loading
- Show loading spinners with `Loader2` icon for buttons and inline states
- Always provide loading feedback for async operations

### Empty States
- Include descriptive icon
- Explain why it's empty
- Provide clear call-to-action
- Keep messaging positive and helpful

### Accessibility
- All interactive elements must be keyboard accessible
- Include proper ARIA labels and descriptions
- Maintain 4.5:1 contrast ratio for normal text
- Focus indicators must be clearly visible
- Use semantic HTML elements