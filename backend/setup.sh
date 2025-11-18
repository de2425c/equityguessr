#!/bin/bash

# Setup script for Poker Equity Backend

echo "Setting up Poker Equity Backend..."

# Clone OMPEval library
if [ ! -d "lib/OMPEval" ]; then
    echo "Cloning OMPEval library..."
    git clone https://github.com/zekyll/OMPEval.git lib/OMPEval
else
    echo "OMPEval already exists, skipping clone"
fi

# Download cpp-httplib (header-only library)
if [ ! -f "include/httplib.h" ]; then
    echo "Downloading cpp-httplib..."
    curl -L https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h -o include/httplib.h
else
    echo "httplib.h already exists, skipping download"
fi

# Download nlohmann/json (header-only library)
if [ ! -f "include/json.hpp" ]; then
    echo "Downloading nlohmann/json..."
    curl -L https://raw.githubusercontent.com/nlohmann/json/develop/single_include/nlohmann/json.hpp -o include/json.hpp
else
    echo "json.hpp already exists, skipping download"
fi

echo "Setup complete!"
echo ""
echo "To build and run:"
echo "  mkdir build && cd build"
echo "  cmake .. -DCMAKE_BUILD_TYPE=Release"
echo "  make"
echo "  ./poker_server"
