#!/bin/bash

if [ -z "$OPENAI_API_KEY" ]; then
  echo "Error: Environment variable OPENAI_API_KEY is not set"
  exit 1
fi

curl "https://api.openai.com/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-4o",
        "messages": [
            {
                "role": "user",
                "content": "Hello, world."
            }
        ]
    }'