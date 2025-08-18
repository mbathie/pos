# Project Conventions and Important Notes

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

## Development
- Start dev server: `npm run dev --turbopack`
- Build: `npm run build`
- Lint: `npm run lint`

## UI/UX Conventions
- All Button components should include `className='cursor-pointer'` to ensure consistent cursor behavior