#!/bin/bash

echo "Running JSONL format example..."
node ../../dist/cli.js trace.jsonl --out jsonl-demo.html
echo "Generated: jsonl-demo.html"
