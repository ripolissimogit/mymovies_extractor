#!/bin/bash

# MyMovies MCP Server Release Script

set -e

VERSION="1.1.0"
PACKAGE_NAME="@mymovies/mcp-server"

echo "🚀 Releasing MyMovies MCP Server v$VERSION"

# Test standalone package
cd mcp-standalone
echo "✅ Testing standalone package..."
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node index.js > /dev/null

# Update main package.json
cd ..
npm version patch --no-git-tag-version

echo "📦 Package ready for distribution:"
echo "  • Standalone: ./mcp-standalone/"
echo "  • NPM: npm install -g ./mcp-standalone"
echo "  • GitHub: Ready for release"

echo "🎉 Release v$VERSION complete!"
