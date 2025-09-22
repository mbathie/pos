#!/usr/bin/env node

/**
 * Deploy Scheduled Jobs to DigitalOcean App Platform
 *
 * This script deploys or updates scheduled jobs (cron jobs) for the POS application
 * on DigitalOcean App Platform.
 *
 * Usage:
 *   node scripts/deploy-scheduled-jobs.js [--app-id YOUR_APP_ID]
 *
 * Requirements:
 *   - DIGITALOCEAN_API_TOKEN in .env file
 *   - Existing app on DigitalOcean App Platform
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_TOKEN = process.env.DIGITALOCEAN_API_TOKEN;
const API_BASE = 'https://api.digitalocean.com/v2';

if (!API_TOKEN) {
  console.error('❌ DIGITALOCEAN_API_TOKEN not found in .env file');
  process.exit(1);
}

// Utility functions
const log = (message, data = null) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
};

// Get app ID from command line or list apps
const getAppId = async () => {
  const args = process.argv.slice(2);
  const appIdFlag = args.find(arg => arg.startsWith('--app-id='));

  if (appIdFlag) {
    return appIdFlag.split('=')[1];
  }

  // List available apps
  log('Fetching available apps...');
  const { apps } = await apiCall('/apps');

  if (apps.length === 0) {
    throw new Error('No apps found in your DigitalOcean account');
  }

  console.log('\nAvailable apps:');
  apps.forEach((app, index) => {
    console.log(`${index + 1}. ${app.spec.name} (ID: ${app.id})`);
  });

  // For this script, we'll look for an app with 'pos' or 'cultcha' in the name
  const posApp = apps.find(app =>
    app.spec.name.toLowerCase().includes('pos') ||
    app.spec.name.toLowerCase().includes('cultcha')
  );

  if (posApp) {
    log(`\nUsing app: ${posApp.spec.name} (${posApp.id})`);
    return posApp.id;
  }

  // Use the first app if no POS app found
  log(`\nUsing first app: ${apps[0].spec.name} (${apps[0].id})`);
  return apps[0].id;
};

// Create the job specification
const createJobSpec = () => {
  return {
    name: 'process-scheduled-pauses',
    kind: 'POST_DEPLOY',  // Using POST_DEPLOY as SCHEDULED might not be available
    git: {
      repo_clone_url: 'https://github.com/your-repo/pos.git', // Update this with your repo
      branch: 'main'
    },
    dockerfile_path: 'Dockerfile.jobs',  // We'll create this
    run_command: 'npm run cron:process-pauses',
    instance_count: 1,
    instance_size_slug: 'professional-xs',  // Smallest instance
    envs: [
      {
        key: 'NODE_ENV',
        value: 'production',
        scope: 'RUN_TIME',
        type: 'GENERAL'
      }
    ]
  };
};

// Create a Dockerfile for the job
const createJobDockerfile = () => {
  const dockerfileContent = `# Dockerfile for scheduled jobs
FROM node:18-alpine

# Install dependencies for bcrypt and other native modules
RUN apk add --no-cache python3 make g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# The run command will be specified in the app spec
CMD ["node", "scripts/process-scheduled-pauses.js"]
`;

  const dockerfilePath = path.join(__dirname, '../Dockerfile.jobs');
  fs.writeFileSync(dockerfilePath, dockerfileContent);
  log(`Created Dockerfile.jobs for scheduled jobs`);

  return dockerfilePath;
};


// Update app with new job
const deployJob = async (appId) => {
  try {
    // Get current app spec
    log(`Fetching current app spec for ${appId}...`);
    const { app } = await apiCall(`/apps/${appId}`);

    const currentSpec = app.spec;

    // Add or update jobs array
    if (!currentSpec.jobs) {
      currentSpec.jobs = [];
    }

    // Check if job already exists
    const existingJobIndex = currentSpec.jobs.findIndex(
      job => job.name === 'process-scheduled-pauses'
    );

    const jobSpec = createJobSpec();

    if (existingJobIndex >= 0) {
      log('Updating existing scheduled job...');
      currentSpec.jobs[existingJobIndex] = jobSpec;
    } else {
      log('Adding new scheduled job...');
      currentSpec.jobs.push(jobSpec);
    }

    // Update the app
    log('Deploying updated app spec...');
    const updateResponse = await apiCall(`/apps/${appId}`, {
      method: 'PUT',
      body: JSON.stringify({ spec: currentSpec })
    });

    log('✅ Job deployed successfully!');
    return updateResponse;

  } catch (error) {
    log('❌ Failed to deploy job:', error.message);
    throw error;
  }
};

// Main function
const main = async () => {
  console.log('='.repeat(60));
  console.log('DigitalOcean Scheduled Job Deployment');
  console.log('='.repeat(60));

  try {
    // Get app ID
    const appId = await getAppId();

    // Create necessary files
    log('\nCreating deployment files...');
    createJobDockerfile();

    // Deploy the job
    log('\nDeploying scheduled job to DigitalOcean...');

    // Note: DigitalOcean App Platform doesn't directly support cron syntax
    // So we're creating a POST_DEPLOY job that can be triggered manually
    // or you can use the GitHub Action for true scheduled execution

    console.log('\n' + '='.repeat(60));
    console.log('IMPORTANT: DigitalOcean App Platform Limitations');
    console.log('='.repeat(60));
    console.log(`
DigitalOcean App Platform doesn't natively support cron-style scheduled jobs.
Here are your options:

1. External Cron Service (RECOMMENDED)
   Use services like cron-job.org or EasyCron to call:
   POST https://cultcha.app/api/cron/process-pauses

   Headers:
   X-Cron-Secret: ${process.env.CRON_SECRET || '[YOUR_CRON_SECRET from .env]'}

2. DigitalOcean Functions (Serverless)
   Deploy as a scheduled function using DO Functions

3. Manual Trigger
   Run manually when needed:
   npm run cron:process-pauses

Next Steps:
1. Sign up for a cron service (cron-job.org is free)
2. Configure it to POST to your endpoint daily
3. Add the X-Cron-Secret header for authentication
`);

    // Try to update the app spec anyway (for manual runs)
    await deployJob(appId);

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
};

// Run the script
main().catch(console.error);