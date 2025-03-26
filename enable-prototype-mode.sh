#!/bin/bash

# Stop any running server and client processes
echo "Stopping any running server and client processes..."
pkill -f "node.*server"
pkill -f "node.*client"

# Ensure PROTOTYPE_MODE=true is set in the .env file
echo "Setting PROTOTYPE_MODE=true in the server .env file..."
if grep -q "PROTOTYPE_MODE=" ./server/.env; then
  # Update existing PROTOTYPE_MODE
  sed -i '' 's/PROTOTYPE_MODE=.*/PROTOTYPE_MODE=true/' ./server/.env
else
  # Add PROTOTYPE_MODE if it doesn't exist
  echo "PROTOTYPE_MODE=true" >> ./server/.env
fi

# Update the port in server .env if needed
echo "Ensuring server is set to run on port 3002..."
if grep -q "PORT=" ./server/.env; then
  sed -i '' 's/PORT=.*/PORT=3002/' ./server/.env
else
  echo "PORT=3002" >> ./server/.env
fi

# Update client .env to use the correct server URL
echo "Updating client to connect to server on port 3002..."
if grep -q "REACT_APP_SERVER_URL=" ./client/.env; then
  sed -i '' 's|REACT_APP_SERVER_URL=.*|REACT_APP_SERVER_URL=http://localhost:3002|' ./client/.env
else
  echo "REACT_APP_SERVER_URL=http://localhost:3002" >> ./client/.env
fi

if grep -q "REACT_APP_WEBSOCKET_URL=" ./client/.env; then
  sed -i '' 's|REACT_APP_WEBSOCKET_URL=.*|REACT_APP_WEBSOCKET_URL=ws://localhost:3002/ws|' ./client/.env
else
  echo "REACT_APP_WEBSOCKET_URL=ws://localhost:3002/ws" >> ./client/.env
fi

# Create uploads directory if it doesn't exist
echo "Ensuring uploads directory exists..."
mkdir -p ./server/uploads
mkdir -p ./server/temp

# Set permissions
echo "Setting directory permissions..."
chmod -R 755 ./server/uploads
chmod -R 755 ./server/temp

# Build server if not already built
echo "Building server..."
cd ./server
npm run build

# Start server with prototype mode
echo "Starting server with prototype mode enabled..."
PROTOTYPE_MODE=true PORT=3002 npm run start:dev &
SERVER_PID=$!
cd ..

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Start client
echo "Starting client..."
cd ./client
npm start &
CLIENT_PID=$!
cd ..

echo "=========================="
echo "Prototype mode is enabled!"
echo "Server running on port 3002 (PID: $SERVER_PID)"
echo "Client should connect to http://localhost:3002"
echo "=========================="
echo "To stop both processes, run: kill $SERVER_PID $CLIENT_PID"
echo "or press Ctrl+C if you're running this in the foreground"

# Wait for Ctrl+C
wait