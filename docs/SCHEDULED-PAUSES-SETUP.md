# Scheduled Pauses Cron Setup

## Overview

The scheduled membership pause feature requires a daily cron job to process pauses that are scheduled to start each day. This document explains how to set up the cron job on DigitalOcean App Platform.

## Script Details

**Script:** `scripts/process-scheduled-pauses.js`
**Purpose:** Processes all membership pauses scheduled to start on the current day
**Frequency:** Should run once daily (recommended: midnight UTC)

### What the Script Does

1. Connects to MongoDB database
2. Finds all active memberships with `scheduledPauseDate` = today
3. For each membership:
   - Pauses the Stripe subscription (if applicable)
   - Creates credit invoice item in Stripe
   - Updates membership status to "suspended"
   - Records the pause in suspension history
   - Creates transaction record for audit trail
4. Logs results and exits with appropriate status code

## DigitalOcean App Platform Setup

### Option 1: Scheduled Job Component (Recommended)

Add a new component to your app spec:

```yaml
jobs:
  - name: process-scheduled-pauses
    kind: PRE_DEPLOY
    git:
      branch: main
      repo_clone_url: https://github.com/your-repo/pos.git
    run_command: npm run cron:process-pauses
    envs:
      - key: MONGODB_URI
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
      - key: STRIPE_SECRET_KEY
        scope: RUN_TIME
        type: SECRET
        value: YOUR_STRIPE_SECRET_KEY
```

Then schedule it using DigitalOcean's job scheduling:

```yaml
jobs:
  - name: process-scheduled-pauses
    kind: SCHEDULED
    schedule: "0 0 * * *"  # Daily at midnight UTC
    git:
      branch: main
      repo_clone_url: https://github.com/your-repo/pos.git
    run_command: npm run cron:process-pauses
    envs:
      - key: MONGODB_URI
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
      - key: STRIPE_SECRET_KEY
        scope: RUN_TIME
        type: SECRET
        value: YOUR_STRIPE_SECRET_KEY
```

### Option 2: Worker Component with Node Cron

If scheduled jobs aren't available, create a worker component with node-cron:

1. Install node-cron:
```bash
npm install node-cron
```

2. Create `scripts/cron-worker.js`:
```javascript
import cron from 'node-cron';
import { spawn } from 'child_process';

// Schedule task to run every day at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Running scheduled pause processor...');

  const process = spawn('node', ['scripts/process-scheduled-pauses.js']);

  process.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  process.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  process.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
  });
});

console.log('Cron worker started - will process pauses daily at midnight');

// Keep the process alive
setInterval(() => {}, 1000);
```

3. Add to app spec:
```yaml
workers:
  - name: cron-worker
    git:
      branch: main
      repo_clone_url: https://github.com/your-repo/pos.git
    run_command: node scripts/cron-worker.js
    envs:
      - key: MONGODB_URI
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
      - key: STRIPE_SECRET_KEY
        scope: RUN_TIME
        type: SECRET
        value: YOUR_STRIPE_SECRET_KEY
```

### Option 3: External Cron Service

Use an external service like:
- **Cron-job.org**: Free online cron service
- **EasyCron**: Reliable paid cron service
- **GitHub Actions**: Use scheduled workflows

Example GitHub Actions workflow:

```yaml
name: Process Scheduled Pauses

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  process-pauses:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Process scheduled pauses
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
        run: npm run cron:process-pauses
```

## Environment Variables

The script requires the following environment variables:

- `MONGODB_URI`: MongoDB connection string
- `STRIPE_SECRET_KEY`: Stripe API secret key

## Testing

### Manual Testing

Run the script manually to test:

```bash
npm run cron:process-pauses
```

### Test with Specific Date

To test with a specific date, you can modify the script temporarily to look for pauses on a different date:

```javascript
// Change this line in the script:
const todayStart = dayjs().startOf('day').toDate();

// To test with a specific date:
const todayStart = dayjs('2025-09-25').startOf('day').toDate();
```

## Monitoring

### Logging

The script logs all activities with timestamps:
- Number of memberships found for processing
- Success/failure for each membership
- Credit amounts created
- Stripe API responses
- Error details

### Error Handling

- Script continues processing even if individual memberships fail
- Exits with code 1 if any failures occurred
- Exits with code 0 if all successful

### Monitoring Recommendations

1. **Set up alerts** for job failures in DigitalOcean App Platform
2. **Monitor logs** for error patterns
3. **Check daily** that the job is running (especially first week)
4. **Verify** Stripe credits are being applied correctly

## Troubleshooting

### Common Issues

1. **Script not finding memberships**
   - Check timezone settings
   - Verify `scheduledPauseDate` is set correctly in database
   - Check database connection

2. **Stripe API errors**
   - Verify API key is correct
   - Check Stripe account status
   - Ensure connected account IDs are valid

3. **Credit calculations incorrect**
   - Verify membership billing period settings
   - Check `nextBillingDate` is accurate
   - Review credit calculation logic

### Debug Mode

Add verbose logging by setting environment variable:

```bash
DEBUG=true npm run cron:process-pauses
```

## Fallback Plan

If the cron job fails to run:

1. **Manual Processing**: Run the script manually when noticed
2. **Catch-up Mode**: The script will process any pauses for "today" when run
3. **Local Pause**: Memberships are still paused locally even if Stripe fails

## Security Considerations

1. **API Keys**: Ensure Stripe keys are stored as secrets
2. **Database Access**: Use read replica if available for better performance
3. **Rate Limiting**: Script includes 1-second delay between Stripe API calls
4. **Audit Trail**: All actions are logged and transaction records created