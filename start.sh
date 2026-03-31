#!/bin/bash
# Tanu Bridge — start the bridge server for Claude Code mobile access
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BRIDGE_DIR="$SCRIPT_DIR/bridge"

# Default config
export TANU_PORT="${TANU_PORT:-4567}"
export TANU_HOST="${TANU_HOST:-0.0.0.0}"
export TANU_CWD="${TANU_CWD:-$HOME}"

# Check claude is installed
if ! command -v claude &> /dev/null; then
  echo "Error: 'claude' CLI not found in PATH"
  echo "Install it: npm install -g @anthropic-ai/claude-code"
  exit 1
fi

echo ""
echo "Starting Tanu Bridge..."
echo ""

# Install deps if needed
if [ ! -d "$BRIDGE_DIR/node_modules" ]; then
  echo "Installing bridge dependencies..."
  cd "$BRIDGE_DIR" && npm install
fi

# Start bridge
cd "$BRIDGE_DIR" && npx tsx src/index.ts
