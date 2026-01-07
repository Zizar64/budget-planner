#!/bin/bash

# Budget Planner Setup Script

echo "Starting Budget Planner setup..."

# 1. Install dependencies
echo "Installing dependencies..."
npm install

# 2. Build frontend
echo "Building frontend..."
npm run build

# 3. Start backend with PM2
echo "Starting application with PM2..."
pm2 start server/index.js --name budget-planner
pm2 save

echo "Setup complete! Application is running on port 3000."
