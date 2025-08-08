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
token: eyJhbGciOiJIUzI1NiJ9.eyJzZWxlY3RlZExvY2F0aW9uSWQiOiI2MTJmYTgyZS1iMTUzLTE2M2ItYmJmZS05OWJlNGQxNjhlMWMiLCJvcmdJZCI6IjYxMmZhODJlLWIxNTMtMTYzYi1iYmZlLTk5YmU0ZDE2OGUxYyIsImVtcGxveWVlSWQiOiI2MTJmYTgyZS1iMTUzLTE2M2ItYmJmZS05OWJlNGQxNjhlMWMiLCJyb2xlIjoiT1dORVIiLCJpYXQiOjE3MjMwODk0ODF9.eyJzZWxlY3RlZExvY2F0aW9uSWQiOiI2MTJmYTgyZS1iMTUzLTE2M2ItYmJmZS05OWJlNGQxNjhlMWMiLCJvcmdJZCI6IjYxMmZhODJlLWIxNTMtMTYzYi1iYmZlLTk5YmU0ZDE2OGUxYyIsImVtcGxveWVlSWQiOiI2MTJmYTgyZS1iMTUzLTE2M2ItYmJmZS05OWJlNGQxNjhlMWMiLCJyb2xlIjoiT1dORVIiLCJpYXQiOjE3MjMwODk0ODF9.29mNgo0TIsV2MmQ2M2wOTAyYjlllwiZXhwljoxNzg2MDExMzMzZIrQ
```

This token includes:
- Role: OWNER (full permissions)
- Employee: MB (MBMB)
- Location: Main HQ
- Can be stored in browser localStorage/cookies for authenticated API requests