#!/usr/bin/env bash
set -e

# Install dependencies
npm ci

# Build the NestJS application
npm run build

# Start the production server
npm run start:prod
