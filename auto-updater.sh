#!/bin/bash

# Auto-updater script for subnet-111
# Usage: ./auto-updater.sh [validator|miner] [netuid] [wallet_name] [wallet_hotkey] [axon_port] [subtensor_network] [subtensor_chain_endpoint] [check_interval]
#
# This script runs continuously and checks for Git updates at regular intervals.
# It will only restart processes when changes are detected.
#
# Usage examples:
#   ./auto-updater.sh validator 2 my-validator default 9000
#   ./auto-updater.sh validator 2 my-validator default 9000 ws://localhost:9944 ws://localhost:9944 300
#   ./auto-updater.sh miner 2 my-miner default-2 9002
#
# Run with PM2 (no cron-restart needed):
#   pm2 start ./auto-updater.sh --name "autoupdater-validator" -- validator 2 my-validator default 9000
#
# The last parameter is the check interval in seconds (default: 300 = 5 minutes)

set -e

# Configuration
REPO_URL="https://github.com/oneoneone-io/subnet-111"
BRANCH="main"
LOG_FILE="/tmp/subnet-111-autoupdater.log"
DEFAULT_CHECK_INTERVAL=1800  # 30 minutes

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Validate arguments first to get NODE_TYPE
if [ $# -lt 1 ] || [ $# -gt 8 ]; then
    echo "Usage: $0 [validator|miner] [netuid] [wallet_name] [wallet_hotkey] [axon_port] [subtensor_network] [subtensor_chain_endpoint] [check_interval]"
    echo "Example: $0 validator 2 test-validator default 9000"
    echo "Example: $0 validator 2 test-validator default 9000 ws://localhost:9944 ws://localhost:9944"
    echo "Example: $0 miner 2 test-miner default-2 9002"
    exit 1
fi

if [ "$1" != "validator" ] && [ "$1" != "miner" ]; then
    echo "First argument must be 'validator' or 'miner'"
    exit 1
fi

NODE_TYPE="$1"

# Set default values or use provided arguments
NETUID="${2:-2}"
WALLET_NAME="${3:-test-$NODE_TYPE}"
WALLET_HOTKEY="${4:-default}"
AXON_PORT="${5:-9000}"
SUBTENSOR_NETWORK="$6"
SUBTENSOR_CHAIN_ENDPOINT="$7"
CHECK_INTERVAL="${8:-$DEFAULT_CHECK_INTERVAL}"

# Adjust default axon port for miner if not specified
if [ "$NODE_TYPE" = "miner" ] && [ $# -lt 5 ]; then
    AXON_PORT="9002"
    if [ $# -lt 4 ]; then
        WALLET_HOTKEY="default-2"
    fi
fi

log "Starting auto-updater for $NODE_TYPE with parameters:"
log "  NETUID: $NETUID"
log "  WALLET_NAME: $WALLET_NAME"
log "  WALLET_HOTKEY: $WALLET_HOTKEY"
log "  AXON_PORT: $AXON_PORT"
if [ -n "$SUBTENSOR_NETWORK" ]; then
    log "  SUBTENSOR_NETWORK: $SUBTENSOR_NETWORK"
fi
if [ -n "$SUBTENSOR_CHAIN_ENDPOINT" ]; then
    log "  SUBTENSOR_CHAIN_ENDPOINT: $SUBTENSOR_CHAIN_ENDPOINT"
fi
log "  CHECK_INTERVAL: $CHECK_INTERVAL seconds"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    log "Error: Not in a git repository. Please run this script from the subnet-111 directory."
    exit 1
fi

# Stop existing processes
stop_processes() {
    log "Stopping existing processes..."
    pm2 delete "node-$NODE_TYPE" 2>/dev/null || true
    pm2 delete "$NODE_TYPE" 2>/dev/null || true
}

# Start processes based on node type
start_processes() {
    log "Starting $NODE_TYPE processes..."
    
    # Build subtensor arguments if provided
    SUBTENSOR_ARGS=""
    if [ -n "$SUBTENSOR_NETWORK" ]; then
        SUBTENSOR_ARGS="$SUBTENSOR_ARGS --subtensor.network $SUBTENSOR_NETWORK"
    fi
    if [ -n "$SUBTENSOR_CHAIN_ENDPOINT" ]; then
        SUBTENSOR_ARGS="$SUBTENSOR_ARGS --subtensor.chain_endpoint $SUBTENSOR_CHAIN_ENDPOINT"
    fi
    
    if [ "$NODE_TYPE" = "validator" ]; then
        # Start validator processes
        pm2 start npm --name node-validator --cwd ./node -- run validator:start
        pm2 start "python neurons/validator.py --netuid $NETUID --wallet.name $WALLET_NAME --wallet.hotkey $WALLET_HOTKEY --axon.port $AXON_PORT --logging.debug$SUBTENSOR_ARGS" --name validator
    elif [ "$NODE_TYPE" = "miner" ]; then
        # Start miner processes
        pm2 start npm --name node-miner --cwd ./node -- run miner:start
        pm2 start "python neurons/miner.py --netuid $NETUID --wallet.name $WALLET_NAME --wallet.hotkey $WALLET_HOTKEY --logging.debug --axon.port $AXON_PORT$SUBTENSOR_ARGS" --name miner
    fi
    
    log "$NODE_TYPE processes started successfully"
}

# Function to check if processes are running
check_processes_running() {
    # Check for exact process names in PM2 list
    if pm2 list | grep -q "│ node-$NODE_TYPE " && pm2 list | grep -q "│ $NODE_TYPE "; then
        return 0  # Both processes exist
    else
        return 1  # At least one process doesn't exist
    fi
}

# Main auto-updater loop
log "Starting auto-updater loop for $NODE_TYPE (checking every $CHECK_INTERVAL seconds)"

while true; do
    # Fetch latest changes from remote
    log "Fetching latest changes from $REPO_URL"
    git fetch origin "$BRANCH" 2>&1 | tee -a "$LOG_FILE"

    # Check if there are updates
    LOCAL_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse "origin/$BRANCH")

    if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
        log "Repository is up to date. No changes detected."
        
        # Check if processes are running, start them if not
        if ! check_processes_running; then
            log "Processes not running or not online. Starting $NODE_TYPE processes..."
            start_processes
            # Save PM2 configuration
            pm2 save
        else
            log "Processes are already running and online. Nothing to do."
        fi
    else
        log "Updates detected! Local: $LOCAL_COMMIT, Remote: $REMOTE_COMMIT"
        log "Pulling latest changes and restarting processes..."

        # Stop existing processes
        stop_processes

        # Wait a moment for processes to fully stop
        sleep 5
        
        # Discard any local changes before pulling
        log "Discarding local changes before pull..."
        git checkout . 2>&1 | tee -a "$LOG_FILE" || true
        
        # Pull latest changes
        log "Pulling latest changes..."
        git config pull.rebase false 2>/dev/null || true
        git pull origin "$BRANCH" 2>&1 | tee -a "$LOG_FILE"

        # Install/update dependencies after pulling changes
        log "Updating Python dependencies..."
        pip install -r requirements.txt 2>&1 | tee -a "$LOG_FILE"

        log "Updating Node.js dependencies..."
        cd node && rm -rf node_modules package-lock.json && npm install 2>&1 | tee -a "$LOG_FILE" && cd ..        

        # Start new processes
        start_processes

        # Save PM2 configuration
        pm2 save

        log "Auto-update completed successfully for $NODE_TYPE"
        log "Current commit: $(git rev-parse HEAD)"
        
        # Restart the script itself to use the updated version
        log "Restarting auto-updater script with updated code..."
        log "Script path: $0, Args: $@"
        exec "$0" "$@"
    fi
    
    log "Sleeping for $CHECK_INTERVAL seconds before next check..."
    sleep "$CHECK_INTERVAL"
done