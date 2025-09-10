# AWS Amplify Setup Guide

## Prerequisites
- AWS Account with Amplify access
- GitHub repository connected
- Environment variables ready

## Setup Steps

### 1. Connect GitHub Repository to Amplify

1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/
2. Click "New app" → "Host web app"
3. Choose "GitHub" as your source provider
4. Authenticate with GitHub and select your repository
5. Select the branch to deploy (main)

### 2. Configure Build Settings

The `amplify.yml` file in the project root handles build configuration automatically.

### 3. Environment Variables

In Amplify Console, go to "App settings" → "Environment variables" and add:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://pos:857v1O03zVbR94Hf@db-bath-mongo-35cc9574.mongo.ondigitalocean.com/staging?authSource=admin
JWT_SECRET=9+xiwSSxdCm+KBttrfeGlbnizZTWYPJswDhsj/d/+wY=
HOST=https://cultcha.app
STRIPE_PUB_KEY=sk_test_51RXCG6H0DYvVUxcGPKD3LfR7iUwAbP9jUZC0YqmyZ9Bcw3unA7HE4sBc0TE5QbH0Cxx3o1mkL6dFGn0f4teQ4jCx00cInaNoH3
STRIPE_SECRET_KEY=sk_test_51RXCG6H0DYvVUxcGPKD3LfR7iUwAbP9jUZC0YqmyZ9Bcw3unA7HE4sBc0TE5QbH0Cxx3o1mkL6dFGn0f4teQ4jCx00cInaNoH3
NEXT_PUBLIC_API_BASE_URL=https://cultcha.app
NEXT_PUBLIC_DOMAIN=https://cultcha.app
GOOGLE_APP_PASS=xiar krox litn vceg
GOOGLE_APP_USER=mbathie@gmail.com
```

### 4. Domain Configuration

1. In Amplify Console, go to "Domain management"
2. Add custom domain: cultcha.app
3. You'll get CNAME records to add to your DNS provider (DigitalOcean)
4. Add the CNAME records in DigitalOcean DNS settings

### 5. Deploy

Amplify will automatically deploy when you push to your main branch.

## Manual Deployment

To trigger a manual deployment:
1. Go to Amplify Console
2. Click "Redeploy this version"

## Monitoring

- Check build logs in Amplify Console under "Build history"
- Monitor app performance in "Monitoring" section
- Set up alarms for failures in "Alarms & notifications"

## AWS SES Integration

AWS SES works independently of your hosting provider. Your current SES configuration remains unchanged:
- Email sending continues to work through AWS SES
- DKIM, SPF, and DMARC records stay in DigitalOcean DNS
- No changes needed to email functionality

## Cost Estimation

AWS Amplify Free Tier includes:
- 1000 build minutes per month
- 15 GB served per month
- 5 GB stored per month

For a basic POS app, you'll likely stay within free tier or pay minimal costs ($5-10/month).

## Troubleshooting

### Build Failures
- Check `amplify.yml` configuration
- Verify all environment variables are set
- Review build logs for specific errors

### 404 Errors on Routes
- Next.js routing is handled automatically by Amplify
- No additional configuration needed for dynamic routes

### Environment Variables Not Working
- Ensure variables are set in Amplify Console
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)