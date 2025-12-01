#!/bin/bash

echo "🚀 Starting React dev server with compatibility fixes..."
echo ""

# Kill any hanging processes
pkill -f react-scripts 2>/dev/null || true
pkill -f webpack-dev-server 2>/dev/null || true

# Clear all caches (the main issue you mentioned)
echo "→ Clearing all caches..."
rm -rf node_modules/.cache
rm -rf /tmp/react-*
rm -f .eslintcache

# For Node 17+ we need the OpenSSL legacy provider
NODE_VERSION=$(node --version | cut -d. -f1 | sed 's/v//')
if [ "$NODE_VERSION" -ge 17 ]; then
    echo "→ Node $NODE_VERSION detected, enabling compatibility mode..."
    export NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=4096"
else
    export NODE_OPTIONS="--max-old-space-size=4096"
fi

# Disable some features that can cause hangs
export FAST_REFRESH=false
export ESLINT_NO_DEV_ERRORS=true
export TSC_COMPILE_ON_ERROR=true
export DISABLE_ESLINT_PLUGIN=true

echo "→ Environment configured:"
echo "   Node: $(node --version)"
echo "   npm: $(npm --version)"
echo "   NODE_OPTIONS: $NODE_OPTIONS"
echo ""

# Run the dev server
echo "→ Starting server on port 3000..."
exec npx --no-install react-scripts start