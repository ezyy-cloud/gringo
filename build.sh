#!/bin/bash

# Exit on error
set -e

echo "=== Building Gringo Application for Production ==="

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Build documentation app
echo "Building documentation app..."
cd clients/docs
npm install
npm run build
echo "Documentation app build complete."
cd ../..

# Build admin client
echo "Building admin client..."
cd clients/admin
npm install
npm run build
echo "Admin client build complete."
cd ../..

# Build server
echo "Building server..."
cd server
npm install
# If you have a build script for the server, uncomment the next line
# npm run build
echo "Server build complete."
cd ..

# Copy all .env.example files to .env if they don't exist
echo "Setting up environment files..."
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  echo "Created root .env file from example"
fi

if [ ! -f "server/.env" ] && [ -f "server/.env.example" ]; then
  cp server/.env.example server/.env
  echo "Created server .env file from example"
fi

if [ ! -f "clients/docs/.env" ] && [ -f "clients/docs/.env.example" ]; then
  cp clients/docs/.env.example clients/docs/.env
  echo "Created docs client .env file from example"
fi

if [ ! -f "clients/admin/.env" ] && [ -f "clients/admin/.env.example" ]; then
  cp clients/admin/.env.example clients/admin/.env
  echo "Created admin client .env file from example"
fi

echo "=== Production build completed successfully ==="
echo "To start the application, run: npm start" 