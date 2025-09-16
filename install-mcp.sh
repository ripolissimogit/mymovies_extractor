#!/bin/bash

# MyMovies MCP Server Installation Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_SERVER="$SCRIPT_DIR/mcp-server.js"

echo "🎬 MyMovies MCP Server Installation"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Make server executable
chmod +x "$MCP_SERVER"
echo "✅ MCP server made executable"

# Claude Desktop configuration
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

echo ""
echo "📋 Claude Desktop Configuration:"
echo "================================"

if [ -d "$CLAUDE_CONFIG_DIR" ]; then
    echo "✅ Claude Desktop directory found"
    
    # Backup existing config
    if [ -f "$CLAUDE_CONFIG_FILE" ]; then
        cp "$CLAUDE_CONFIG_FILE" "$CLAUDE_CONFIG_FILE.backup.$(date +%s)"
        echo "✅ Existing config backed up"
    fi
    
    # Create or update config
    cat > "$CLAUDE_CONFIG_FILE" << EOF
{
  "mcpServers": {
    "mymovies": {
      "command": "node",
      "args": ["$MCP_SERVER"],
      "env": {
        "MYMOVIES_API_URL": "https://mymovies-api-61434647155.europe-west8.run.app"
      }
    }
  }
}
EOF
    
    echo "✅ Claude Desktop config updated"
    echo "📍 Config file: $CLAUDE_CONFIG_FILE"
    
else
    echo "⚠️  Claude Desktop not found. Manual configuration required:"
    echo "   1. Install Claude Desktop"
    echo "   2. Add this config to claude_desktop_config.json:"
    echo ""
    cat claude-desktop-config.json
fi

echo ""
echo "🧪 Testing MCP Server:"
echo "====================="

# Test stdio mode
echo "Testing stdio mode..."
if echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node "$MCP_SERVER" > /dev/null 2>&1; then
    echo "✅ Stdio mode working"
else
    echo "❌ Stdio mode failed"
fi

# Test HTTP mode
echo "Testing HTTP mode..."
node "$MCP_SERVER" --http --port 3002 &
SERVER_PID=$!
sleep 2

if curl -s -X POST http://localhost:3002/mcp \
   -H "Content-Type: application/json" \
   -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' > /dev/null 2>&1; then
    echo "✅ HTTP mode working"
else
    echo "❌ HTTP mode failed"
fi

kill $SERVER_PID 2>/dev/null || true

echo ""
echo "🎉 Installation Complete!"
echo "========================"
echo ""
echo "📖 Usage:"
echo "  • Claude Desktop: Restart Claude Desktop to load the MCP server"
echo "  • HTTP mode: node $MCP_SERVER --http --port 3001"
echo "  • Test: node $SCRIPT_DIR/test-mcp.js"
echo ""
echo "🛠️ Available Tools:"
echo "  • extract_movie_review - Extract movie reviews from MyMovies.it"
echo "  • list_reviews - List all extracted reviews"
echo "  • get_api_info - Get API server information"
echo ""
echo "📚 Documentation: $SCRIPT_DIR/MCP-README.md"
