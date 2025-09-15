# Scripts Documentation

## Database Scripts

### `npm run db:wipe`
Wipes the entire database. Use with caution!

### `npm run seed`
Seeds the database with test data.

**Options:**
- `npm run seed -- --format` - Seeds format-specific test data

## Test Suite

### `npm run test:suite`
Main test runner that executes all test files in the tests directory.

**Usage:**
```bash
# Run all tests (reuses existing test org if valid)
npm run test:suite

# Run tests with fresh org/data (creates new test org)
npm run test:suite -- --fresh

# Run tests matching a pattern
npm run test:suite <pattern>

# Clean up test data after running
npm run test:suite -- --cleanup

# Combine flags (fresh start + cleanup after)
npm run test:suite -- --fresh --cleanup
```

### Individual Test Categories

Run specific test categories by passing the pattern to `test:suite`:

```bash
# Setup tests
npm run test:suite setup

# Product modification tests
npm run test:suite mod

# Discount system tests
npm run test:suite discount

# Customer credits tests
npm run test:suite credits

# Run cleanup after tests
npm run test:suite cleanup
```

### Direct Test Execution

You can also run individual test files directly:

```bash
# Environment setup
node scripts/tests/test-setup-environment.js

# Product modifications
node scripts/tests/test-mod-creation.js

# Discounts
node scripts/tests/test-discount-simple.js
node scripts/tests/test-discount-categories.js
node scripts/tests/test-discount-day-time.js
node scripts/tests/test-discount-customer.js
node scripts/tests/test-discount-limits.js
node scripts/tests/test-discount-combos.js
node scripts/tests/test-discount-auto-assign.js
node scripts/tests/test-discount-custom.js
node scripts/tests/test-discount-edge-cases.js

# Customer credits
node scripts/tests/test-customer-credits.js

# Cleanup
node scripts/tests/test-cleanup.js
```

### Seed Scripts

Located in `scripts/tests/seed-*.js`:

```bash
# Seed formats
node scripts/tests/seed-format-data.js

# Seed test data
node scripts/tests/seed-test-data.js
```

## Test Categories

Tests are organized into categories that run in order:

1. **setup** - Environment setup and configuration
2. **mod** - Product modifications
3. **discount** - Discount system tests
4. **credits** - Customer credit system
5. **cleanup** - Clean up test data

## Prerequisites

- Development server must be running: `npm run dev --turbopack`
- MongoDB must be accessible at localhost:27017
- Test setup must be run first: `npm run test:suite setup`

## Notes

- Tests automatically discover all `test-*.js` files in the tests directory
- Seed scripts (`seed-*.js`) are excluded from regular test runs
- Test utility functions are in `test-utils.js`
- Tests maintain their own authentication tokens and test data