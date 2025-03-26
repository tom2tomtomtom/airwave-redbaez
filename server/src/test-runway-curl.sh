#!/bin/bash

# Get API key from .env file
API_KEY=$(grep RUNWAY_API_KEY .env | cut -d '=' -f2)

echo "Testing Runway API with curl..."
echo "API Key (first 10 chars): ${API_KEY:0:10}..."

# Try the models endpoint
echo -e "\n==== CHECKING AVAILABLE MODELS ===="
curl -s -X GET \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  https://api.runwayml.com/v1/models

# Try an image generation request
echo -e "\n\n==== TRYING IMAGE GENERATION ===="
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  https://api.runwayml.com/v1/inferences \
  -d '{
    "model": "runwayml/gen-2",
    "inputs": {
      "prompt": "A cat in a tree",
      "negative_prompt": "",
      "width": 1024,
      "height": 1024,
      "num_samples": 1
    }
  }'

echo -e "\n"
