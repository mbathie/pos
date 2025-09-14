# Discount System Test Suite

## Overview
This test suite validates discount functionality by making actual API calls to the running POS server. It tests various discount scenarios including usage limits, customer requirements, and frequency restrictions.

## Setup

### Prerequisites
1. Start the development server:
   ```bash
   npm run dev --turbopack
   ```

2. Initialize test environment (creates test org, employee, and products):
   ```bash
   npm run test:setup
   ```
   This creates a test organization and saves authentication credentials in `.test-data.json`

## Running Tests

### Run all discount tests:
```bash
npm run test:discounts
```

### Run a specific test:
```bash
npm run test:discounts <test-name>
```

Available tests:
- `frequency-limit` - Tests daily/weekly/monthly frequency limits
- `per-customer-limit` - Tests per-customer usage limits
- `require-customer` - Tests discounts requiring customer identification
- `total-usage-limit` - Tests global usage limits across all customers

### Clean up test data:
```bash
npm run test:discounts:cleanup
```

### Reset test environment:
```bash
npm run test:setup --force
```

## Test Structure

### Core Files
- `test-setup.js` - Creates test organization, employee, and products via signup
- `test-utils.js` - Utility functions for API calls and test helpers
- `test-discounts.js` - Main test runner

### Test Scenarios
Each test in `discounts/` folder:
1. Creates test discount with specific configuration
2. Creates test customer(s) as needed
3. Simulates purchases and applies discounts
4. Validates expected behavior
5. Cleans up test data automatically

## Authentication
Tests use real authentication by:
1. Creating organization via `/api/auth/create` endpoint
2. Extracting JWT token from response
3. Using token for all subsequent API calls

## API Endpoints Used
- `/api/auth/create` - Create test organization
- `/api/categories/[slug]` - Create product categories
- `/api/categories/[id]/products` - Create products
- `/api/customers` - Create test customers
- `/api/discounts` - Create test discounts
- `/api/adjustments` - Apply discounts to cart
- `/api/payments/cash` - Process test payments

## Test Data
All test data is prefixed with "TEST" or "Test" for easy identification:
- Discounts: `TEST-*`
- Customers: `Test Customer *`
- Categories: `TestCoffee`
- Products: `Test Flat White`

Test data is automatically cleaned up after each test run.