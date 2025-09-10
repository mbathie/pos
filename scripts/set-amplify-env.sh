#!/bin/bash

# Set environment variables for AWS Amplify app
# Usage: ./scripts/set-amplify-env.sh

APP_ID="d13i9c884b2upc"  # Your Amplify App ID

echo "Setting environment variables for Amplify app: $APP_ID"

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &>/dev/null; then
    echo "Error: AWS credentials not configured."
    echo "Please run 'aws configure' first"
    exit 1
fi

# Create JSON string for environment variables
ENV_VARS='{
  "NODE_ENV": "production",
  "MONGODB_URI": "mongodb+srv://mbathie_db_user:2Vfgq5fPQs8jNxHq@cultchacluster.uigqlce.mongodb.net/pos?retryWrites=true&w=majority&appName=cultchaCluster",
  "JWT_SECRET": "9+xiwSSxdCm+KBttrfeGlbnizZTWYPJswDhsj/d/+wY=",
  "HOST": "https://cultcha.app",
  "STRIPE_PUB_KEY": "pk_test_51RXCG6H0DYvVUxcGn1kQRQJDYb5iUwAbP9jUZC0YqmyZ9BcW3unA7HE4sBc0TE5QbH0Cxx3o1mkL6dFGn0f4teQ4jCx00cInaNoH3",
  "STRIPE_SECRET_KEY": "sk_test_51RXCG6H0DYvVUxcGPKD3LfR7iUwAbP9jUZC0YqmyZ9Bcw3unA7HE4sBc0TE5QbH0Cxx3o1mkL6dFGn0f4teQ4jCx00cInaNoH3",
  "NEXT_PUBLIC_API_BASE_URL": "https://cultcha.app",
  "NEXT_PUBLIC_DOMAIN": "https://cultcha.app"
}'

# Update environment variables
aws amplify update-app \
  --app-id "$APP_ID" \
  --environment-variables "$ENV_VARS" \
  --region ap-southeast-2

if [ $? -eq 0 ]; then
    echo "✅ Environment variables set successfully!"
    echo "You may need to redeploy for changes to take effect."
else
    echo "❌ Failed to set environment variables"
    exit 1
fi