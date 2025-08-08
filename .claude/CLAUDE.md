# Project Rules and Preferences

## UI/Design Guidelines
- **Always consult shadcn/ui component library first** for any UI components, blocks, icons, and design patterns
- Use shadcn/ui v4 as the preferred resource for all components unless explicitly specified otherwise
- Check available shadcn components, blocks, and demos before creating custom components
- Maintain consistency with shadcn design patterns throughout the project

## Database Guidelines
- **Check MongoDB database** when needed for:
  - Data structure and schema validation
  - Testing with real data
  - Understanding relationships between collections
- Database: `pos` on MongoDB (localhost:27017)
- Key collections: products, transactions, customers, memberships, orders, etc.
- Use the MongoDB MCP tools to query and validate data structures

## Testing & Validation
- Always verify code changes against the actual database schema
- Test database queries before implementing them in code
- Validate that new features align with existing data structures

## Authentication Tokens for Testing
When testing the website locally, you can use the following authentication token:
```
token: eyJhbGciOiJIUzI1NiJ9.eyJzZWxlY3RlZExvY2F0aW9uSWQiOiI2ODY0ODY5MGVjZjEyZDMwMjA5MDJiOWUiLCJlbWFpbCI6Im1iYXRoaWVAZ21haWwuY29tIiwiZW1wbG95ZWVJZCI6IjY4NjQ4NjkwZWNmMTJkMzAyMDkwMmJhMCIsIm9yZ0lkIjoiNjg2NDg2OTBlY2YxMmQzMDIwOTAyYjliIiwiZXhwIjoxNzg2MDExMzY2fQ.Rxwtiosv9PY29k2Spl0gfuwK-PNemOfVIqw-WO-vbfM
```

This token includes:
- Email: mbathie@gmail.com
- Employee ID: 68648690ecf12d30209020ba0
- Organization ID: 68648690ecf12d30209020b9b
- Location ID: 68648690ecf12d30209020b9e
- Expiry: 1786011366 (unix timestamp)
- Can be stored in browser localStorage/cookies for authenticated API requests