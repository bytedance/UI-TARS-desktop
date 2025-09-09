#!/bin/bash

# JSONL Format Example
# This example demonstrates processing a JSONL (JSON Lines) trace file

echo "🚀 Running JSONL Format Example..."
echo "📁 Processing: trace.jsonl"
echo "📄 Format: JSON Lines (one event per line)"
echo ""

# Generate HTML output
agui trace.jsonl --out jsonl-demo.html

echo ""
echo "✅ Generated: jsonl-demo.html"
echo "🌐 Open the HTML file in your browser to view the agent replay"
echo ""
echo "💡 This example shows:"
echo "   - JSONL format auto-detection (.jsonl extension)"
echo "   - Same calculator agent demo as JSON example"
echo "   - How JSONL is automatically converted to events array"
echo "   - Streaming-friendly format processing"
echo ""
echo "🔍 Compare with basic-json example to see format differences"
