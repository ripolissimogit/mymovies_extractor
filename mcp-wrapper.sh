#!/bin/bash

# MCP Wrapper for Claude Desktop
# Reads JSON-RPC from stdin and forwards to HTTP endpoint

while IFS= read -r line; do
    if [ -n "$line" ]; then
        echo "$line" | curl -s -X POST \
            -H "Content-Type: application/json" \
            --data-binary "@-" \
            "https://mymovies-api-61434647155.europe-west8.run.app/mcp-jsonrpc"
    fi
done
