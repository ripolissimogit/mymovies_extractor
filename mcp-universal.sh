#!/bin/bash

# Universal MyMovies MCP Client
# Downloads and runs the MCP client from GitHub

SCRIPT_URL="https://raw.githubusercontent.com/ripolissimogit/mymovies_extractor/api-server/mcp-universal.js"
TEMP_FILE="/tmp/mymovies-mcp-$$.js"

# Download the script
curl -s "$SCRIPT_URL" > "$TEMP_FILE"

# Check if download was successful
if [ $? -eq 0 ] && [ -s "$TEMP_FILE" ]; then
    # Run with node
    node "$TEMP_FILE"
    # Cleanup
    rm -f "$TEMP_FILE"
else
    echo '{"jsonrpc":"2.0","id":null,"error":{"code":-32603,"message":"Failed to download MCP client"}}' >&2
    exit 1
fi
