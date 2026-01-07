#!/bin/bash

# Budget Planner Update Script

echo "Starting Budget Planner update..."

# 1. Pull latest changes
echo "Pulling latest changes from git..."
git pull

# 2. Install dependencies
echo "Installing dependencies..."
npm install

# 3. Build frontend
echo "Building frontend..."
npm run build

# 4. Restart backend
echo "Restarting application..."
pm2 restart budget-planner

echo "Update complete! Application is running."
