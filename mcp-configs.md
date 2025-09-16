# MCP Server Configuration Examples

## 🎯 Claude Desktop

**File**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "mymovies": {
      "command": "node",
      "args": ["/Users/claudioripoli/mymovies_extractor/mcp-server.js"],
      "env": {
        "MYMOVIES_API_URL": "https://mymovies-api-61434647155.europe-west8.run.app"
      }
    }
  }
}
```

## 🎯 Cursor

**HTTP Endpoint**: `http://localhost:3001/mcp`

```bash
# Start server
node mcp-server.js --http --port 3001
```

**Cursor Settings** (JSON):
```json
{
  "mcp.servers": {
    "mymovies": {
      "url": "http://localhost:3001/mcp",
      "name": "MyMovies Review Extractor"
    }
  }
}
```

## 🎯 Amazon Q CLI

```bash
# Add MCP server
q mcp add mymovies http://localhost:3001/mcp

# Or configure manually
q config set mcp.servers.mymovies.url "http://localhost:3001/mcp"
q config set mcp.servers.mymovies.name "MyMovies Review Extractor"
```

## 🎯 OpenAI ChatGPT (Custom GPT)

**Action Schema**:
```yaml
openapi: 3.0.0
info:
  title: MyMovies MCP Server
  version: 1.0.0
servers:
  - url: http://localhost:3001
paths:
  /mcp:
    post:
      summary: Call MCP tools
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                jsonrpc:
                  type: string
                  example: "2.0"
                id:
                  type: integer
                method:
                  type: string
                  enum: ["tools/call"]
                params:
                  type: object
                  properties:
                    name:
                      type: string
                      enum: ["extract_movie_review", "list_reviews", "get_api_info"]
                    arguments:
                      type: object
```

## 🎯 Generic HTTP Client

```bash
# Initialize
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# List tools
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Extract review
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"extract_movie_review",
      "arguments":{
        "title":"Oppenheimer",
        "year":2023,
        "options":{"noSave":true}
      }
    }
  }'
```

## 🎯 Docker Deployment

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3001
CMD ["node", "mcp-server.js", "--http", "--port", "3001"]
```

```bash
# Build and run
docker build -t mymovies-mcp .
docker run -p 3001:3001 -e MYMOVIES_API_URL="https://mymovies-api-61434647155.europe-west8.run.app" mymovies-mcp
```

## 🎯 Systemd Service (Linux)

**File**: `/etc/systemd/system/mymovies-mcp.service`

```ini
[Unit]
Description=MyMovies MCP Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/mymovies-mcp
ExecStart=/usr/bin/node mcp-server.js --http --port 3001
Environment=MYMOVIES_API_URL=https://mymovies-api-61434647155.europe-west8.run.app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable mymovies-mcp
sudo systemctl start mymovies-mcp
```

## 🎯 PM2 (Process Manager)

```json
{
  "name": "mymovies-mcp",
  "script": "mcp-server.js",
  "args": ["--http", "--port", "3001"],
  "env": {
    "MYMOVIES_API_URL": "https://mymovies-api-61434647155.europe-west8.run.app"
  },
  "instances": 1,
  "autorestart": true,
  "watch": false,
  "max_memory_restart": "1G"
}
```

```bash
# Start with PM2
pm2 start ecosystem.config.json
pm2 save
pm2 startup
```
