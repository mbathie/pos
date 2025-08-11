# Project Conventions and Important Notes

## Database Connection
- Always use `import { connectDB } from '@/lib/mongoose'` for database connections
- Call `await connectDB()` at the beginning of API routes
- Do NOT use `import dbConnect from '@/lib/mongodb'` as this module doesn't exist

## Authentication
- Use `import { getEmployee } from '@/lib/auth'` for authentication in API routes
- Call `const { employee } = await getEmployee()` to get the authenticated employee
- Access org ID with `employee.org._id`
- Do NOT use `verifyAuth` - it doesn't exist

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