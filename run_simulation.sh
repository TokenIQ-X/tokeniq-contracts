#!/bin/bash

# Run TokenIQ Simulation Script
# This script starts a local Hardhat node and runs the simulation script

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to clean up background processes on exit
cleanup() {
  echo -e "\n${GREEN}Stopping Hardhat node...${NC}"
  kill $HARDHAT_PID 2>/dev/null || true
}

# Set up trap to ensure cleanup happens even if script exits early
trap cleanup EXIT

echo -e "${GREEN}Starting local Hardhat node in the background...${NC}
"

# Start Hardhat node in the background
npx hardhat node >/dev/null 2>&1 &
HARDHAT_PID=$!

# Give the node some time to start up
echo -e "${GREEN}Waiting for Hardhat node to initialize...${NC}
sleep 5

# Check if the node is running
if ! kill -0 $HARDHAT_PID 2>/dev/null; then
  echo "Error: Failed to start Hardhat node"
  exit 1
fi

echo -e "${GREEN}Hardhat node is running (PID: $HARDHAT_PID)${NC}"
echo -e "${GREEN}Running simulation script...${NC}\n"

# Run the simulation script
try {
  npx hardhat run scripts/simulate.js --network localhost
} catch {
  echo "Error running simulation script"
  exit 1
}

echo -e "\n${GREEN}Simulation completed successfully!${NC}
"
