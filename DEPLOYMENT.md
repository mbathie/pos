# AWS Elastic Beanstalk Deployment Guide

## Setup Instructions

### 1. Prerequisites

- AWS Account with Elastic Beanstalk application created
- AWS CLI installed and configured
- EB CLI installed (`pip install awsebcli`)
- GitHub repository for your project

### 2. Configuration Files Created

- **`.ebextensions/nodecommand.config`** - Node.js runtime configuration
- **`.ebextensions/environment.config`** - Environment variables configuration
- **`.elasticbeanstalk/config.yml`** - Elastic Beanstalk application configuration
- **`.github/workflows/deploy-to-eb.yml`** - GitHub Actions deployment workflow
- **`scripts/deploy-eb.sh`** - Manual deployment script
- **`.ebignore`** - Files to exclude from deployment

### 3. GitHub Secrets Setup

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
- `AWS_REGION` - `ap-southeast-2`
- `EB_APPLICATION_NAME` - `cultcha`
- `EB_ENVIRONMENT_NAME` - `cultcha-env`

### 4. Update Configuration

1. Edit `.elasticbeanstalk/config.yml`:
   - Replace `your-app-name` with your actual application name
   - Update `default_region` if needed
   - Update `environment` name if different from `production`

2. Edit `.ebextensions/environment.config`:
   - Add your environment variables (DATABASE_URL, API keys, etc.)

### 5. Initialize Elastic Beanstalk

```bash
# Initialize EB CLI in your project
eb init

# Create environment (if not already created)
eb create production

# Or link to existing environment
eb use production
```

### 6. Deployment Methods

#### Option A: Automatic Deployment via GitHub Actions
Simply push to the `main` branch:
```bash
git add .
git commit -m "Setup EB deployment"
git push origin main
```

#### Option B: Manual Deployment via Script
```bash
./scripts/deploy-eb.sh production
```

#### Option C: Manual Deployment via EB CLI
```bash
eb deploy production
```

### 7. Monitoring and Logs

```bash
# Check environment status
eb status

# View application logs
eb logs

# Open application in browser
eb open

# SSH into EC2 instance
eb ssh
```

### 8. Important Notes

- The application will run on port 8080 by default (configured in environment.config)
- Node.js version is set to 20.x
- Build output is included in deployment package
- `node_modules` are excluded; they'll be installed on the server using `npm ci`

### 9. Troubleshooting

If deployment fails:
1. Check logs: `eb logs`
2. Verify all environment variables are set
3. Ensure `package.json` has a `start` script
4. Check that all dependencies are in `package.json` (not just devDependencies)
5. Verify Node.js version compatibility

### 10. Rollback

To rollback to a previous version:
```bash
# List application versions
eb appversion

# Deploy specific version
eb deploy --version=<version-label>
```# Deployment trigger Wed 10 Sep 2025 14:05:42 AEST
