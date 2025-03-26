#!/bin/bash

# Health Check Script for AIrWAVE Production Environment
echo "========================================================"
echo "🔍 AIrWAVE Production Health Check"
echo "========================================================"
echo "Time: $(date)"
echo "Environment: ${NODE_ENV:-unknown}"
echo "========================================================" 

# Variables for API endpoints
SERVER_URL=${SERVER_URL:-"http://localhost:3001"}
CLIENT_URL=${CLIENT_URL:-"http://localhost:3002"}

# Check if Docker is running and check container status if it is
if command -v docker &> /dev/null; then
  echo "Checking Docker containers..."
  if docker ps -a | grep -q airwave; then
    echo "▶️ Docker containers found:"
    docker ps -a | grep airwave
    
    # Check container health
    RUNNING_CONTAINERS=$(docker ps -q --filter "name=airwave" | wc -l)
    TOTAL_CONTAINERS=$(docker ps -aq --filter "name=airwave" | wc -l)
    
    if [ "$RUNNING_CONTAINERS" -eq "$TOTAL_CONTAINERS" ] && [ "$TOTAL_CONTAINERS" -gt 0 ]; then
      echo "✅ All AIrWAVE containers are running"
    else
      echo "⚠️ Some AIrWAVE containers are not running ($RUNNING_CONTAINERS/$TOTAL_CONTAINERS)"
    fi
  else
    echo "❓ No AIrWAVE containers found"
  fi
  echo "--------------------------------------------------------"
fi

# Check if the server is running
echo "Checking server health at ${SERVER_URL}/health..."
SERVER_RESPONSE=$(curl -s -m 5 ${SERVER_URL}/health)

if [[ $SERVER_RESPONSE == *"status"*"OK"* ]]; then
  echo "✅ Server is running correctly"
  
  # Extract environment information from response if available
  if [[ $SERVER_RESPONSE == *"environment"* ]]; then
    ENV=$(echo $SERVER_RESPONSE | grep -o '"environment":"[^"]*"' | cut -d'"' -f4)
    echo "   Server environment: $ENV"
  fi
  
  if [[ $SERVER_RESPONSE == *"prototype_mode"* ]]; then
    PROTOTYPE=$(echo $SERVER_RESPONSE | grep -o '"prototype_mode":[^,}]*' | cut -d':' -f2)
    if [[ $PROTOTYPE == *"true"* ]]; then
      echo "⚠️ Server is running in PROTOTYPE MODE - not suitable for production"
    else
      echo "✅ Server is running in PRODUCTION MODE"
    fi
  fi
else
  echo "❌ Server health check failed"
  echo "   Response: $SERVER_RESPONSE"
fi

# Check database connection
echo "--------------------------------------------------------"
echo "Checking database connection..."
DB_RESPONSE=$(curl -s -m 5 ${SERVER_URL}/api/auth/check)

if [[ $DB_RESPONSE == *"connected"*"true"* ]]; then
  echo "✅ Database connection is working"
else
  echo "❌ Database connection check failed"
  echo "   Response: $DB_RESPONSE"
fi

# Check Supabase connection
echo "--------------------------------------------------------"
echo "Checking Supabase connection..."
SUPABASE_RESPONSE=$(curl -s -m 5 ${SERVER_URL}/api/auth/supabase-status)

if [[ $SUPABASE_RESPONSE == *"connected"*"true"* ]]; then
  echo "✅ Supabase connection is working"
else
  echo "❌ Supabase connection check failed"
  echo "   Response: $SUPABASE_RESPONSE"
fi

# Check external API connections
echo "--------------------------------------------------------"
echo "Checking Creatomate API connection..."
CREATOMATE_RESPONSE=$(curl -s -m 5 ${SERVER_URL}/api/creatomate/status)

if [[ $CREATOMATE_RESPONSE == *"connected"*"true"* ]]; then
  echo "✅ Creatomate API connection is working"
else
  echo "❌ Creatomate API connection check failed"
  echo "   Response: $CREATOMATE_RESPONSE"
fi

echo "--------------------------------------------------------"
echo "Checking OpenAI API connection..."
OPENAI_RESPONSE=$(curl -s -m 5 ${SERVER_URL}/api/llm/status)

if [[ $OPENAI_RESPONSE == *"connected"*"true"* ]]; then
  echo "✅ OpenAI API connection is working"
  
  # Extract API key status if available
  if [[ $OPENAI_RESPONSE == *"apiKey"* ]]; then
    API_KEY_STATUS=$(echo $OPENAI_RESPONSE | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
    echo "   API Key status: $API_KEY_STATUS"
  fi
else
  echo "❌ OpenAI API connection check failed"
  echo "   Response: $OPENAI_RESPONSE"
fi

# Check WebSocket connection
echo "--------------------------------------------------------"
echo "Checking WebSocket server..."
WS_STATUS=$(curl -s -m 5 ${SERVER_URL}/websocket-status)

if [[ $WS_STATUS == *"running"*"true"* ]]; then
  echo "✅ WebSocket server is running"
  
  # Extract connection count if available
  if [[ $WS_STATUS == *"connections"* ]]; then
    CONNECTIONS=$(echo $WS_STATUS | grep -o '"connections":[^,}]*' | cut -d':' -f2)
    echo "   Active connections: $CONNECTIONS"
  fi
else
  echo "❌ WebSocket server check failed"
  echo "   Response: $WS_STATUS"
fi

# Check client availability
echo "--------------------------------------------------------"
echo "Checking client availability at ${CLIENT_URL}..."
CLIENT_RESPONSE=$(curl -s -m 5 -o /dev/null -w "%{http_code}" ${CLIENT_URL})

if [[ $CLIENT_RESPONSE == "200" ]]; then
  echo "✅ Client application is accessible"
else
  echo "❌ Client application check failed (HTTP Status: $CLIENT_RESPONSE)"
fi

echo "========================================================"
echo "Health check complete at $(date)"
echo "========================================================"