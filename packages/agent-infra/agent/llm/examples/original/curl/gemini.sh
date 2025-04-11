#!/bin/bash

if [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: Environment variable GEMINI_API_KEY is not set"
  exit 1
fi

curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [{
      "parts":[{"text": "Hello, world."}]
    }]
  }'
