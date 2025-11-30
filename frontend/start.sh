#!/bin/bash

# Simple, reliable start script for Node 24 + react-scripts

# Clean cache first (the issue you mentioned)
rm -rf node_modules/.cache

# Set the compatibility flag for Node 24
export NODE_OPTIONS="--openssl-legacy-provider"

# Start the dev server
exec npm start