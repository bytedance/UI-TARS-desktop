#!/bin/bash

# Test script for MCP query parameters
# This demonstrates how to query the marketplace via the /mcp endpoint

echo "MCP Query Parameter Tests"
echo "========================="
echo ""
echo "Make sure MCP Hub is running on port 3000"
echo "Start with: mcp-hub --port 3000"
echo ""
echo "Press Enter to continue..."
read

BASE_URL="http://localhost:3000/mcp"

echo "1. Search for database servers:"
echo "   GET /mcp?search=database"
curl -s "$BASE_URL?search=database" | jq '.'
echo ""

echo "2. Filter by category:"
echo "   GET /mcp?category=data"
curl -s "$BASE_URL?category=data" | jq '.'
echo ""

echo "3. Filter by tags:"
echo "   GET /mcp?tags=sql,postgres"
curl -s "$BASE_URL?tags=sql,postgres" | jq '.'
echo ""

echo "4. Get top 5 servers sorted by stars:"
echo "   GET /mcp?sort=stars&limit=5"
curl -s "$BASE_URL?sort=stars&limit=5" | jq '.'
echo ""

echo "5. List all categories:"
echo "   GET /mcp?categories"
curl -s "$BASE_URL?categories" | jq '.'
echo ""

echo "6. List all tags (top 50):"
echo "   GET /mcp?alltags"
curl -s "$BASE_URL?alltags" | jq '.'
echo ""

echo "7. Get detailed info about a specific server:"
echo "   GET /mcp?info=github-mcp"
curl -s "$BASE_URL?info=github-mcp" | jq '.'
echo ""

echo "8. Complex query - search for API integration servers:"
echo "   GET /mcp?search=api&category=integration&sort=newest&limit=3"
curl -s "$BASE_URL?search=api&category=integration&sort=newest&limit=3" | jq '.'
echo ""

echo "Tests completed!"