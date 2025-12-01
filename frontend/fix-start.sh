#!/bin/bash

# Fix React App Start Issues Script
# This script resolves common issues with npm start hanging or not working

echo "🔧 React App Fix Script"
echo "======================"
echo ""

# Step 1: Kill any existing React processes
echo "1️⃣  Killing any existing React development server processes..."
pkill -f "react-scripts start" 2>/dev/null || echo "   No existing processes found"

# Step 2: Clear all caches
echo ""
echo "2️⃣  Clearing all caches..."
rm -rf node_modules/.cache 2>/dev/null
rm -rf .eslintcache 2>/dev/null
npm cache clean --force 2>/dev/null || echo "   NPM cache already clean"

# Step 3: Remove node_modules and package-lock
echo ""
echo "3️⃣  Removing node_modules and package-lock.json for fresh install..."
rm -rf node_modules
rm -f package-lock.json

# Step 4: Check React version compatibility
echo ""
echo "4️⃣  Checking React version in package.json..."
if grep -q '"react": ".*19\.' package.json; then
    echo "   ⚠️  Detected React 19 - This is incompatible with react-scripts 5.0.1"
    echo "   Would you like to downgrade to React 18? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        echo "   Downgrading to React 18..."
        # Use sed to replace React 19 with React 18
        sed -i '' 's/"react": ".*19\..*"/"react": "^18.2.0"/g' package.json
        sed -i '' 's/"react-dom": ".*19\..*"/"react-dom": "^18.2.0"/g' package.json
        sed -i '' 's/"@types\/react": ".*19\..*"/"@types\/react": "^18.2.6"/g' package.json
        sed -i '' 's/"@types\/react-dom": ".*19\..*"/"@types\/react-dom": "^18.2.3"/g' package.json
        echo "   ✅ Downgraded to React 18"
    fi
else
    echo "   ✅ React version is compatible"
fi

# Step 5: Reinstall dependencies
echo ""
echo "5️⃣  Installing dependencies..."
npm install

# Step 6: Check if port 3000 is in use
echo ""
echo "6️⃣  Checking if port 3000 is available..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "   ⚠️  Port 3000 is in use. Kill the process? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        lsof -ti:3000 | xargs kill -9 2>/dev/null
        echo "   ✅ Port 3000 cleared"
    fi
else
    echo "   ✅ Port 3000 is available"
fi

# Step 7: Start the development server
echo ""
echo "7️⃣  Starting the development server..."
echo ""
echo "========================================="
echo "Your app should start momentarily at http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo "========================================="
echo ""

npm start