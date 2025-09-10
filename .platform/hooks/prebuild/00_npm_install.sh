#!/bin/bash
# Install dependencies during prebuild phase
cd /var/app/staging
npm ci --production=false