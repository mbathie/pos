#!/bin/bash

# Deploy script for AWS Elastic Beanstalk
# Usage: ./scripts/deploy-eb.sh [environment-name]

set -e

ENVIRONMENT=${1:-cultcha-env}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
VERSION_LABEL="v-${TIMESTAMP}-${GITHUB_SHA:0:7}"

echo "🚀 Starting deployment to Elastic Beanstalk environment: ${ENVIRONMENT}"

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo "❌ EB CLI is not installed. Please install it first:"
    echo "pip install awsebcli"
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
zip -r deploy-${VERSION_LABEL}.zip . \
  -x "*.git*" \
  -x "node_modules/*" \
  -x ".env.local" \
  -x ".env.development" \
  -x "*.log" \
  -x ".DS_Store" \
  -x "deploy-*.zip" \
  -x "scripts/*" \
  -x ".github/*"

# Deploy to Elastic Beanstalk
echo "🚀 Deploying to Elastic Beanstalk..."
eb deploy ${ENVIRONMENT} --label ${VERSION_LABEL}

# Clean up
echo "🧹 Cleaning up..."
rm deploy-${VERSION_LABEL}.zip

echo "✅ Deployment complete!"
echo "View your application at: $(eb status ${ENVIRONMENT} | grep "CNAME" | awk '{print $2}')"