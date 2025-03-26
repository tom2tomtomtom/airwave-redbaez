#!/bin/bash

# Set auth mode script
# This script helps set the correct auth mode for the application

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}AIrWAVE - Auth Mode Configuration${NC}"
echo "------------------------------------"
echo "This script will help you set up the authentication mode"
echo

# Determine the server env file
SERVER_ENV_FILE="./server/.env"
if [ ! -f "$SERVER_ENV_FILE" ]; then
  echo -e "${RED}Server .env file not found at $SERVER_ENV_FILE${NC}"
  echo "Creating a new .env file..."
  touch "$SERVER_ENV_FILE"
fi

# Determine the client env file
CLIENT_ENV_FILE="./client/.env"
if [ ! -f "$CLIENT_ENV_FILE" ]; then
  echo -e "${RED}Client .env file not found at $CLIENT_ENV_FILE${NC}"
  echo "Creating a new .env file..."
  touch "$CLIENT_ENV_FILE"
fi

# Function to update or add a variable to an env file
update_env_var() {
  local file=$1
  local var_name=$2
  local var_value=$3
  
  # Check if variable exists
  if grep -q "^$var_name=" "$file"; then
    # Update existing variable
    sed -i '' "s|^$var_name=.*|$var_name=$var_value|" "$file"
  else
    # Add new variable
    echo "$var_name=$var_value" >> "$file"
  fi
  
  echo "Set $var_name=$var_value in $file"
}

# Ask user which auth mode they want
echo "Please select the authentication mode:"
echo "1) Production (Full authentication with Supabase)"
echo "2) Development (Normal auth flow with optional bypass)"
echo "3) Prototype (File-based storage with auth bypass)"
read -p "Enter your choice (1-3): " AUTH_CHOICE

case $AUTH_CHOICE in
  1)
    echo -e "\n${GREEN}Setting up PRODUCTION mode${NC}"
    update_env_var "$SERVER_ENV_FILE" "NODE_ENV" "production"
    update_env_var "$SERVER_ENV_FILE" "DEV_BYPASS_AUTH" "false"
    update_env_var "$SERVER_ENV_FILE" "PROTOTYPE_MODE" "false"
    ;;
    
  2)
    echo -e "\n${GREEN}Setting up DEVELOPMENT mode${NC}"
    update_env_var "$SERVER_ENV_FILE" "NODE_ENV" "development"
    update_env_var "$SERVER_ENV_FILE" "PROTOTYPE_MODE" "false"
    
    # Ask if they want to bypass auth
    read -p "Enable authentication bypass for development? (y/n): " BYPASS_CHOICE
    if [[ $BYPASS_CHOICE =~ ^[Yy] ]]; then
      update_env_var "$SERVER_ENV_FILE" "DEV_BYPASS_AUTH" "true"
      echo -e "${YELLOW}Auth bypass enabled - mock admin user will be used${NC}"
    else
      update_env_var "$SERVER_ENV_FILE" "DEV_BYPASS_AUTH" "false"
      echo "Normal authentication flow will be used"
    fi
    ;;
    
  3)
    echo -e "\n${GREEN}Setting up PROTOTYPE mode${NC}"
    update_env_var "$SERVER_ENV_FILE" "NODE_ENV" "development"
    update_env_var "$SERVER_ENV_FILE" "PROTOTYPE_MODE" "true"
    
    # In prototype mode, we usually want auth bypass
    read -p "Enable authentication bypass for prototype mode? (recommended) (y/n): " BYPASS_CHOICE
    if [[ $BYPASS_CHOICE =~ ^[Yy] ]] || [[ $BYPASS_CHOICE == "" ]]; then
      update_env_var "$SERVER_ENV_FILE" "DEV_BYPASS_AUTH" "true"
      echo -e "${YELLOW}Auth bypass enabled - mock admin user will be used${NC}"
    else
      update_env_var "$SERVER_ENV_FILE" "DEV_BYPASS_AUTH" "false"
      echo "Normal authentication flow will be used with prototype storage"
    fi
    
    # Make sure we have the uploads directory
    echo "Creating uploads directory if needed..."
    mkdir -p ./server/uploads
    mkdir -p ./server/temp
    chmod -R 755 ./server/uploads
    chmod -R 755 ./server/temp
    echo "Uploads directory set up complete"
    ;;
    
  *)
    echo -e "${RED}Invalid choice. Exiting.${NC}"
    exit 1
    ;;
esac

# Update port settings if needed
if [ "$AUTH_CHOICE" == "3" ]; then
  # For prototype mode, make sure server is on port 3002
  update_env_var "$SERVER_ENV_FILE" "PORT" "3002"
  update_env_var "$CLIENT_ENV_FILE" "REACT_APP_SERVER_URL" "http://localhost:3002"
  update_env_var "$CLIENT_ENV_FILE" "REACT_APP_WEBSOCKET_URL" "ws://localhost:3002/ws"
else
  # For other modes, use port 3001 by default
  update_env_var "$SERVER_ENV_FILE" "PORT" "3001"
  update_env_var "$CLIENT_ENV_FILE" "REACT_APP_SERVER_URL" "http://localhost:3001"
  update_env_var "$CLIENT_ENV_FILE" "REACT_APP_WEBSOCKET_URL" "ws://localhost:3001/ws"
fi

echo -e "\n${GREEN}Auth mode configuration complete!${NC}"
echo "To apply changes, restart your server with:"
echo "  cd server && npm run start:dev"
echo "And restart your client with:"
echo "  cd client && npm start"

# Make the script executable
chmod +x $0

exit 0