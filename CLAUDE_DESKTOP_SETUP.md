# Claude Desktop MCP Setup

## 🖥️ Configurazione Completa per Claude Desktop

### 1. File di Configurazione

Modifica `~/.claude/claude_desktop_config.json`:

#### Opzione A - Server Cloud (Consigliata)

```json
{
  "mcpServers": {
    "mymovies": {
      "command": "curl",
      "args": [
        "-N",
        "-H", "Accept: text/event-stream",
        "-H", "Cache-Control: no-cache",
        "-H", "Connection: keep-alive",
        "https://mymovies-api-rflzoyubyq-oc.a.run.app/mcp"
      ]
    }
  }
}
```

#### Opzione B - Server Locale

Se hai clonato il repository localmente:

```json
{
  "mcpServers": {
    "mymovies": {
      "command": "node",
      "args": ["./mcp-server.js"],
      "cwd": "/percorso/completo/al/mymovies_extractor",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 2. Test Configurazione

Prima di riavviare Claude Desktop, testa la connessione:

```bash
# Test SSE endpoint
curl -N -H "Accept: text/event-stream" \
  https://mymovies-api-rflzoyubyq-oc.a.run.app/mcp

# Test MCP tools list
curl -X POST https://mymovies-api-rflzoyubyq-oc.a.run.app/tools/list \
  -H "Content-Type: application/json" \
  -d '{}'

# Test tool call
curl -X POST https://mymovies-api-rflzoyubyq-oc.a.run.app/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name":"extract_movie_review","arguments":{"title":"Dune","year":2021}}'
```

### 3. Riavvio Claude Desktop

1. **Chiudi completamente** Claude Desktop
2. **Riapri** l'applicazione
3. **Verifica** che il server MCP sia connesso

### 4. Test in Claude Desktop

Una volta configurato, puoi chiedere:

```
"Estrai la recensione di Oppenheimer del 2023 da MyMovies"
"Cosa dice MyMovies su Dune 2021?"
"Trova la recensione di Interstellar del 2014"
```

### 5. Tool Disponibile

Claude Desktop avrà accesso a:

- **Nome**: `extract_movie_review`
- **Parametri**:
  - `title` (stringa): Titolo del film
  - `year` (numero): Anno di uscita
- **Output**: Recensione completa con autore, data e contenuto

### 6. Troubleshooting

#### Problema: "Server non connesso"

```bash
# Verifica che il server cloud sia attivo
curl https://mymovies-api-rflzoyubyq-oc.a.run.app/health

# Test MCP endpoint
curl -I https://mymovies-api-rflzoyubyq-oc.a.run.app/mcp
```

#### Problema: "Tool non disponibile"

Controlla i log di Claude Desktop per errori MCP.

#### Problema: "Timeout errori"

L'estrazione può richiedere 15-30 secondi. È normale per il web scraping.

### 7. Configurazione Avanzata

Per debug avanzato, aggiungi logging:

```json
{
  "mcpServers": {
    "mymovies": {
      "command": "bash",
      "args": [
        "-c",
        "curl -N -H 'Accept: text/event-stream' -H 'User-Agent: Claude-Desktop-MCP/1.0' https://mymovies-api-rflzoyubyq-oc.a.run.app/mcp 2>&1 | tee /tmp/mcp-debug.log"
      ]
    }
  }
}
```

Questo salva i log MCP in `/tmp/mcp-debug.log` per troubleshooting.

### 8. Vantaggi MCP vs Web Connectors

| Feature | Claude Web | Claude Desktop |
|---------|------------|----------------|
| **Setup** | URL OpenAPI | File config |
| **Persistenza** | Per sessione | Permanente |
| **Debug** | Limitato | Log completi |
| **Performance** | Variabile | Stabile |
| **Offline** | No | Possibile (locale) |

### 9. Più Server MCP

Puoi aggiungere più server contemporaneamente:

```json
{
  "mcpServers": {
    "mymovies": {
      "command": "curl",
      "args": ["-N", "-H", "Accept: text/event-stream", "https://mymovies-api-rflzoyubyq-oc.a.run.app/mcp"]
    },
    "altro-server": {
      "command": "node",
      "args": ["path/to/altro-server.js"]
    }
  }
}
```

Claude Desktop caricherà tutti i server configurati e i relativi tool.