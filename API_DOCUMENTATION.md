# API Documentation

## 🌐 **Server MCP Cloud**

**Base URL**: `https://mymovies-api-rflzoyubyq-oc.a.run.app`

## 📡 **Endpoints**

### **MCP Standard Endpoints**

#### POST /initialize
Inizializza il server MCP.

**Request:**
```json
{}
```

**Response:**
```json
{
  "protocolVersion": "2024-11-05",
  "capabilities": {"tools": {}},
  "serverInfo": {"name": "mymovies-extractor", "version": "1.0.0"}
}
```

#### POST /tools/list
Lista i tools disponibili.

**Response:**
```json
{
  "tools": [
    {
      "name": "extract_movie_review",
      "description": "Estrai recensione completa da MyMovies.it con metadata",
      "inputSchema": {
        "type": "object",
        "properties": {
          "title": {"type": "string", "description": "Titolo del film"},
          "year": {"type": "number", "description": "Anno di uscita"}
        },
        "required": ["title", "year"]
      }
    }
  ]
}
```

#### POST /tools/call
Esegue un tool.

**Request:**
```json
{
  "name": "extract_movie_review",
  "arguments": {
    "title": "Oppenheimer",
    "year": 2023
  }
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"review\":{\"content\":\"...\",\"author\":\"Andrea Fornasiero\",\"date\":\"domenica 23 luglio 2023\"},\"metadata\":{\"contentLength\":6420,\"wordCount\":1027,\"processingTime\":21817}}"
    }
  ]
}
```

### **JSON-RPC 2.0 Endpoints**

#### POST /
Endpoint root per richieste JSON-RPC 2.0.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "extract_movie_review",
    "arguments": {"title": "Dune", "year": 2021}
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{"type": "text", "text": "..."}]
  }
}
```

### **Utility Endpoints**

#### GET /health
Health check del server.

**Response:**
```json
{
  "status": "ok",
  "service": "MyMovies API",
  "version": "1.0.0",
  "timestamp": "2025-09-16T10:46:48.231Z"
}
```

#### GET /openapi.json
Specifica OpenAPI per integrazione con client esterni.

#### GET /mcp
Server-Sent Events stream per MCP clients.

## 🔧 **Configurazioni Client**

### **Claude Desktop**
File: `~/.claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "mymovies": {
      "command": "curl",
      "args": ["-N", "https://mymovies-api-rflzoyubyq-oc.a.run.app/mcp"]
    }
  }
}
```

### **Custom GPT (ChatGPT)**
**Actions Schema:**
```json
{
  "openapi": "3.0.0",
  "info": {"title": "MyMovies Extractor", "version": "1.0.0"},
  "servers": [{"url": "https://mymovies-api-rflzoyubyq-oc.a.run.app"}],
  "paths": {
    "/tools/call": {
      "post": {
        "summary": "Extract movie review",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {"type": "string", "enum": ["extract_movie_review"]},
                  "arguments": {
                    "type": "object",
                    "properties": {
                      "title": {"type": "string"},
                      "year": {"type": "number"}
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### **Postman Collection**
```json
{
  "info": {"name": "MyMovies MCP API"},
  "item": [
    {
      "name": "Extract Review",
      "request": {
        "method": "POST",
        "url": "https://mymovies-api-rflzoyubyq-oc.a.run.app/tools/call",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "raw": "{\"name\":\"extract_movie_review\",\"arguments\":{\"title\":\"Oppenheimer\",\"year\":2023}}"
        }
      }
    }
  ]
}
```

## ⚡ **Rate Limiting**

- **Limite**: 30 richieste per minuto per IP
- **Headers**: `RateLimit-*` headers inclusi nelle risposte
- **Bypass**: Endpoint `/health` escluso dal rate limiting

## 🔒 **CORS**

- **Access-Control-Allow-Origin**: `*`
- **Metodi supportati**: GET, POST, OPTIONS
- **Headers supportati**: Content-Type, Authorization

## 📊 **Monitoring**

- **Health Check**: `GET /health`
- **Logs**: Google Cloud Run logs
- **Metrics**: Request count, response time, error rate

## 🚨 **Error Handling**

### **Errori Comuni**

**400 Bad Request:**
```json
{"error": "Missing parameters", "required": "title and year"}
```

**429 Too Many Requests:**
```json
{"error": "Too many requests", "message": "Limite di 30 richieste per minuto superato"}
```

**500 Internal Server Error:**
```json
{"error": "Extraction failed", "message": "Film not found or network error"}
```

### **JSON-RPC Errors**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {"code": -32603, "message": "Internal error"}
}
```

## 🧪 **Testing**

### **cURL Examples**
```bash
# Health check
curl https://mymovies-api-rflzoyubyq-oc.a.run.app/health

# List tools
curl -X POST https://mymovies-api-rflzoyubyq-oc.a.run.app/tools/list \
  -H "Content-Type: application/json" -d '{}'

# Extract review
curl -X POST https://mymovies-api-rflzoyubyq-oc.a.run.app/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name":"extract_movie_review","arguments":{"title":"Dune","year":2021}}'
```

### **HTTPie Examples**
```bash
# Health check
http GET https://mymovies-api-rflzoyubyq-oc.a.run.app/health

# Extract review
http POST https://mymovies-api-rflzoyubyq-oc.a.run.app/tools/call \
  name=extract_movie_review arguments:='{"title":"Interstellar","year":2014}'
```
