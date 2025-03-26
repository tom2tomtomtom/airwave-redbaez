#!/bin/bash

# Script to start the AIrWAVE application in production mode

# Change to the project root directory
cd "$(dirname "$0")/.."

# Display startup banner
echo "-------------------------------------"
echo "Starting AIrWAVE in production mode"
echo "-------------------------------------"

# Check if .env files exist
if [ ! -f ".env" ]; then
    echo "Warning: Root .env file not found."
fi

if [ ! -f "server/.env" ]; then
    echo "Warning: Server .env file not found."
fi

if [ ! -f "client/.env" ]; then
    echo "Warning: Client .env file not found."
fi

# Set NODE_ENV to production
export NODE_ENV=production

# Function to check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
        echo "Docker and Docker Compose are required but not found."
        echo "Would you like to proceed with the non-Docker startup method? (y/n)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            return 1
        else
            echo "Exiting..."
            exit 1
        fi
    fi
    return 0
}

# Start with Docker
start_with_docker() {
    echo "Starting with Docker..."
    
    # Build the Docker images if they don't exist
    echo "Building Docker images..."
    docker-compose build
    
    # Start the containers
    echo "Starting Docker containers..."
    docker-compose up -d
    
    echo "Docker containers started."
    echo "Client available at: http://localhost:3002"
    echo "Server API available at: http://localhost:3001"
    echo "WebSocket available at: ws://localhost:3001/ws"
}

# Start without Docker
start_without_docker() {
    echo "Starting without Docker..."
    
    # Check if dependencies are installed
    if [ ! -d "server/node_modules" ]; then
        echo "Installing server dependencies..."
        cd server && npm install && cd ..
    fi
    
    # Build the server if not already built
    if [ ! -d "server/dist" ]; then
        echo "Building server..."
        cd server && npm run build && cd ..
    fi
    
    # Start the server
    echo "Starting server in production mode..."
    cd server && NODE_ENV=production PROTOTYPE_MODE=false npm start &
    SERVER_PID=$!
    
    echo "Server started (PID: $SERVER_PID)"
    echo "Server API available at: http://localhost:3001"
    echo "WebSocket available at: ws://localhost:3001/ws"
    
    # Serve the client using a simple HTTP server
    if [ -d "client/build" ]; then
        cd ../client/build
        if command -v npx &> /dev/null; then
            echo "Starting client server..."
            npx serve -s -l 3002 &
            CLIENT_PID=$!
            echo "Client available at: http://localhost:3002"
        else
            echo "npx command not found. Please serve the client files manually from the client/build directory."
        fi
    else
        echo "Client build directory not found. Please build the client or check the path."
    fi
    
    # Wait for Ctrl+C to stop the servers
    echo "Press Ctrl+C to stop the servers..."
    trap "kill $SERVER_PID 2>/dev/null; kill $CLIENT_PID 2>/dev/null; echo 'Servers stopped.'" EXIT
    wait
}

# Check if Docker is available and start accordingly
if check_docker; then
    start_with_docker
else
    start_without_docker
fi