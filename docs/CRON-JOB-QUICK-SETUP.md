# Quick Setup: Scheduled Pause Processing

## ⚠️ SECURITY WARNING
**NEVER commit your .env file to git!** Your API keys have been added to .env.
Make sure .env is in your .gitignore file.

## Option 1: External Cron Service (Recommended) 🌐

### Using cron-job.org (Free):

1. **Sign up** at https://cron-job.org

2. **Create a new cron job**:
   - URL: `https://cultcha.app/api/cron/process-pauses`
   - Schedule: Daily at 00:00
   - Request method: POST
   - Request headers:
     ```
     X-Cron-Secret: 77fd4214d184615944a98f6e3f4b3c861e6506628e1f8f608c21474f443afd28
     ```

3. **Test it**:
   ```bash
   curl -X POST https://cultcha.app/api/cron/process-pauses \
     -H "X-Cron-Secret: 77fd4214d184615944a98f6e3f4b3c861e6506628e1f8f608c21474f443afd28"
   ```

### Using EasyCron (More reliable, paid):

1. **Sign up** at https://www.easycron.com

2. **Create a new cron job**:
   - URL: `https://cultcha.app/api/cron/process-pauses`
   - Method: POST
   - Cron Expression: `0 0 * * *` (daily at midnight)
   - HTTP Headers:
     - Name: `X-Cron-Secret`
     - Value: `77fd4214d184615944a98f6e3f4b3c861e6506628e1f8f608c21474f443afd28`

## Option 2: Manual Trigger 🚀

Run the deployment script to set up on DigitalOcean:

```bash
# This will attempt to add a job to your DO app
node scripts/deploy-scheduled-jobs.js
```

Note: DigitalOcean App Platform has limited cron support, so GitHub Actions is recommended.

## Testing the Script Locally

Before deploying, test the script locally:

```bash
# Run the script manually
npm run cron:process-pauses

# Or test via the API endpoint (start dev server first)
curl -X POST http://localhost:3000/api/cron/process-pauses \
  -H "X-Cron-Secret: 77fd4214d184615944a98f6e3f4b3c861e6506628e1f8f608c21474f443afd28"
```

## Environment Variables Added

The following have been added to your `.env` file:

- `DIGITALOCEAN_API_TOKEN` - Your DO API token (keep secret!)
- `CRON_SECRET` - Authentication for the cron endpoint

## Files Created

- `/scripts/process-scheduled-pauses.js` - Main cron script
- `/scripts/deploy-scheduled-jobs.js` - DO deployment script
- `/app/api/cron/process-pauses/route.js` - HTTP endpoint for external cron
- `/.github/workflows/process-scheduled-pauses.yml` - GitHub Action
- `/Dockerfile.jobs` - Docker config for DO jobs

## Monitoring

### Check if it's working:

1. **GitHub Actions**:
   - Go to Actions tab → See run history

2. **Database**:
   - Check for memberships with `status: 'suspended'` that were scheduled

3. **Stripe Dashboard**:
   - Verify subscriptions are paused
   - Check for credit invoice items

### Logs:

- GitHub Actions: Check workflow run logs
- External cron: Check your cron service logs
- Manual: Check console output

## Troubleshooting

### Script not finding memberships?
- Check timezone (runs at UTC midnight)
- Verify `scheduledPauseDate` in database

### Stripe errors?
- Verify `STRIPE_SECRET_KEY` is correct
- Check Stripe dashboard for API logs

### GitHub Action not running?
- Check secrets are added correctly
- Verify workflow file is in `.github/workflows/`
- Check Actions tab for error messages

## Support

If you need help:
1. Check the logs first
2. Verify environment variables
3. Test the script locally
4. Check Stripe dashboard for API activity