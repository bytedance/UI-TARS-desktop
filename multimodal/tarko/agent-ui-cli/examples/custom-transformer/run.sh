#!/bin/bash

echo "Running custom transformer example..."
node ../../dist/cli.js custom-format.json \
  --transformer transformer.ts \
  --config agui.config.ts \
  --out custom-transformer-demo.html \
  --dump-transformed
echo "Generated: custom-transformer-demo.html"
echo "Debug file: custom-format-transformed.json"
