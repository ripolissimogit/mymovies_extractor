# MyMovies MCP Server

🎬 **Standard MCP Server per estrazione recensioni da MyMovies.it**

Compatibile con **Claude Desktop**, **Cursor**, **Amazon Q**, e tutti i client che supportano il **Model Context Protocol**.

## 🚀 Quick Start

### Claude Desktop

1. **Configura Claude Desktop**:
```json
{
  "mcpServers": {
    "mymovies": {
      "command": "node",
      "args": ["/path/to/mymovies_extractor/mcp-server.js"],
      "env": {
        "MYMOVIES_API_URL": "https://mymovies-api-61434647155.europe-west8.run.app"
      }
    }
  }
}
```

2. **Riavvia Claude Desktop**

3. **Usa i tools**:
   - `extract_movie_review` - Estrai recensione film
   - `list_reviews` - Lista recensioni estratte  
   - `get_api_info` - Info API server

### Cursor / Altri Client

```bash
# Avvia server HTTP
node mcp-server.js --http --port 3001

# Endpoint: http://localhost:3001/mcp
```

### Amazon Q CLI

```bash
# Configura Q CLI per usare il server MCP
q config set mcp.servers.mymovies.url "http://localhost:3001/mcp"
```

## 🛠️ Tools Disponibili

### `extract_movie_review`
Estrae recensione completa da MyMovies.it con metadata dettagliati.

**Parametri**:
- `title` (string): Titolo del film
- `year` (number): Anno di uscita
- `options` (object, opzionale):
  - `noSave` (boolean): Non salvare su storage

**Esempio**:
```json
{
  "name": "extract_movie_review",
  "arguments": {
    "title": "Oppenheimer",
    "year": 2023,
    "options": { "noSave": true }
  }
}
```

### `list_reviews`
Lista tutte le recensioni estratte e salvate.

### `get_api_info`
Informazioni sul server API e stato operativo.

## 🧪 Test

```bash
# Test stdio (Claude Desktop mode)
node test-mcp.js

# Test HTTP mode
node test-mcp.js --http
```

## 📋 Protocollo

- **Standard**: JSON-RPC 2.0 MCP Protocol
- **Trasporti**: stdio (Claude Desktop), HTTP (altri client)
- **Versione MCP**: 2024-11-05

## 🔧 Configurazione

### Variabili d'Ambiente

- `MYMOVIES_API_URL`: URL del server API (default: produzione)

### Modalità di Avvio

```bash
# Stdio mode (Claude Desktop)
node mcp-server.js

# HTTP mode (Cursor, Q, etc.)
node mcp-server.js --http --port 3001
```

## 📦 Installazione Globale

```bash
# Copia package.json
cp mcp-package.json package.json

# Installa globalmente
npm install -g .

# Usa ovunque
mymovies-mcp --http
```

## 🔗 Integrazione Client

### Claude Desktop
Aggiungi configurazione in `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

### Cursor
Configura MCP server nelle impostazioni o via HTTP endpoint

### Amazon Q
```bash
q mcp add mymovies http://localhost:3001/mcp
```

## ✅ Compatibilità

- ✅ **Claude Desktop** (stdio)
- ✅ **Cursor** (HTTP)  
- ✅ **Amazon Q CLI** (HTTP)
- ✅ **Altri client MCP** (JSON-RPC 2.0 standard)

## 🎯 Vantaggi

- **Un server** → funziona con tutti i client AI
- **Protocollo standard** → compatibilità garantita  
- **Zero modifiche** → usa API esistente
- **Logging avanzato** → sempre incluso nelle risposte
- **Auto-detect** → stdio o HTTP automatico

---

**Repository**: https://github.com/ripolissimogit/mymovies_extractor  
**API Server**: https://mymovies-api-61434647155.europe-west8.run.app
