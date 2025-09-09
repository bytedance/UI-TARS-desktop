#!/bin/bash

# Custom Transformer Example
# This example demonstrates processing custom log format with transformer and config

echo "🚀 Running Custom Transformer Example..."
echo "📁 Processing: custom-format.json"
echo "📄 Format: Custom log format (requires transformer)"
echo "🔧 Transformer: transformer.ts"
echo "⚙️  Config: agui.config.ts"
echo ""

# Generate HTML with transformer, config, and debug output
agui custom-format.json \
  --transformer transformer.ts \
  --config agui.config.ts \
  --out custom-transformer-demo.html \
  --dump-transformed

echo ""
echo "✅ Generated: custom-transformer-demo.html"
echo "🔍 Debug file: custom-format-transformed.json"
echo "🌐 Open the HTML file in your browser to view the agent replay"
echo ""
echo "💡 This example shows:"
echo "   - Custom log format transformation"
echo "   - TypeScript transformer with defineTransformer"
echo "   - Custom UI configuration with defineConfig"
echo "   - Debug output with --dump-transformed"
echo "   - Tool call collection and proper ID matching"
echo "   - Calculator and weather agent interactions"
echo ""
echo "🔍 Check custom-format-transformed.json to see the transformation result"
