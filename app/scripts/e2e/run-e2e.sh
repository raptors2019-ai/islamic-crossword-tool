#!/bin/bash
#
# Shell wrapper for E2E tests (for launchd scheduling)
#
# This script:
# 1. Sets up the Node.js environment (NVM)
# 2. Starts the dev server if not running
# 3. Runs the E2E tests
# 4. Logs everything to e2e-results/logs/

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
LOG_DIR="$APP_DIR/e2e-results/logs"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$LOG_DIR/run-$DATE.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting E2E Test Run ==="
log "Script directory: $SCRIPT_DIR"
log "App directory: $APP_DIR"

# Load NVM if available
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    log "Loading NVM..."
    . "$NVM_DIR/nvm.sh"
fi

# Ensure we're using the right Node version
if command -v nvm &> /dev/null; then
    log "Setting Node version..."
    cd "$APP_DIR"
    nvm use || nvm use default
fi

log "Node version: $(node --version)"
log "npm version: $(npm --version)"

# Change to app directory
cd "$APP_DIR"

# Check if dev server is already running
DEV_SERVER_STARTED=false
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    log "Dev server not running. Starting it..."
    npm run dev > "$LOG_DIR/dev-server-$DATE.log" 2>&1 &
    DEV_SERVER_PID=$!
    DEV_SERVER_STARTED=true

    # Wait for server to be ready (max 60 seconds)
    log "Waiting for dev server to start..."
    for i in {1..60}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            log "Dev server is ready (took ${i}s)"
            break
        fi
        sleep 1
    done

    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        log "ERROR: Dev server failed to start within 60 seconds"
        exit 1
    fi
else
    log "Dev server already running"
fi

# Run E2E tests
log "Running E2E tests..."
npm run e2e 2>&1 | tee -a "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}

# Stop dev server if we started it
if [ "$DEV_SERVER_STARTED" = true ]; then
    log "Stopping dev server (PID: $DEV_SERVER_PID)..."
    kill $DEV_SERVER_PID 2>/dev/null || true
fi

log "=== E2E Test Run Complete (exit code: $EXIT_CODE) ==="

exit $EXIT_CODE
