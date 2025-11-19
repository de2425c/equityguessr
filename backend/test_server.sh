#!/bin/bash

# Test script for poker equity backend

echo "Testing Poker Equity Backend..."
echo ""

# Test health endpoint
echo "1. Testing health endpoint:"
curl -s http://localhost:8080/health | jq .
echo ""

# Test equity calculation - preflop
echo "2. Testing equity calculation (AA vs KK preflop):"
curl -s -X POST http://localhost:8080/equity \
  -H "Content-Type: application/json" \
  -d '{"hands": ["AhAc", "KdKs"]}' | jq .
echo ""

# Test equity calculation with flop
echo "3. Testing equity calculation with flop (AK vs QQ on 2h4h5h):"
curl -s -X POST http://localhost:8080/equity \
  -H "Content-Type: application/json" \
  -d '{"hands": ["AhKh", "QdQc"], "board": "2h4h5h"}' | jq .
echo ""

# Test hand evaluation - full house
echo "4. Testing hand evaluation (Full House):"
curl -s -X POST http://localhost:8080/evaluate \
  -H "Content-Type: application/json" \
  -d '{"hand": "AhAcAdKhKc"}' | jq .
echo ""

# Test hand evaluation - straight flush
echo "5. Testing hand evaluation (Straight Flush):"
curl -s -X POST http://localhost:8080/evaluate \
  -H "Content-Type: application/json" \
  -d '{"hand": "AhKhQhJhTh"}' | jq .
echo ""

echo "Tests complete!"
