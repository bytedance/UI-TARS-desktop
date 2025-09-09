#!/bin/bash

# Basic JSON Format Example
# This example demonstrates processing a standard JSON trace file

echo "🚀 Running Basic JSON Example..."
echo "📁 Processing: trace.json"
echo "📄 Format: Standard JSON with events array"
echo ""

# Generate HTML output
agui trace.json --out basic-json-demo.html

echo ""
echo "✅ Generated: basic-json-demo.html"
echo "🌐 Open the HTML file in your browser to view the agent replay"
echo ""
echo "💡 This example shows:"
echo "   - Standard JSON format processing"
echo "   - Calculator agent with Jupyter tool calls"
echo "   - Tool execution and results visualization"
echo "   - Agent thinking process display"
