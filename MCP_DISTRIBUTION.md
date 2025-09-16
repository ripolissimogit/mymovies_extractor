# 🌐 Distribuzione MCP per Altri Utenti

## 🎯 Opzioni di Utilizzo per Utenti Esterni

### Opzione 1: Server Remoto (Più Semplice)

**Claude Desktop** (`~/.claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "mymovies": {
      "command": "curl",
      "args": [
        "-s", "-X", "POST",
        "-H", "Content-Type: application/json",
        "-d", "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":{}}",
        "https://mymovies-api-rflzoyubyq-oc.a.run.app/"
      ]
    }
  }
}
```

⚠️ **Limitazione**: Funziona solo per `tools/list`, non per chiamate dinamiche.

### Opzione 2: Proxy MCP (Consigliata)

1. **Download del proxy**:
```bash
curl -O https://raw.githubusercontent.com/ripolissimogit/mymovies_extractor/api-server/mcp-remote-proxy.js
```

2. **Configurazione Claude Desktop**:
```json
{
  "mcpServers": {
    "mymovies": {
      "command": "node",
      "args": ["/percorso/al/mcp-remote-proxy.js"]
    }
  }
}
```

### Opzione 3: Installazione Completa

1. **Clone repository**:
```bash
git clone https://github.com/ripolissimogit/mymovies_extractor.git
cd mymovies_extractor
npm install
```

2. **Configurazione Claude Desktop**:
```json
{
  "mcpServers": {
    "mymovies": {
      "command": "node",
      "args": ["./mcp-server.js"],
      "cwd": "/percorso/completo/a/mymovies_extractor"
    }
  }
}
```

## 🔄 Per Altri AI Assistant

### ChatGPT/OpenAI

**Web Connectors**: Usa l'OpenAPI
```
https://mymovies-api-rflzoyubyq-oc.a.run.app/openapi.json
```

**API diretta**:
```bash
curl -X POST https://mymovies-api-rflzoyubyq-oc.a.run.app/extract \
  -H "Content-Type: application/json" \
  -d '{"title":"Oppenheimer","year":2023}'
```

### Cursor/VS Code

**HTTP Client**:
```javascript
const response = await fetch('https://mymovies-api-rflzoyubyq-oc.a.run.app/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Dune', year: 2021 })
});
const data = await response.json();
```

## 🚀 Distribuzione Package NPM

Per massima facilità, possiamo pubblicare su NPM:

```bash
npm install -g mymovies-extractor
mymovies-mcp  # Avvia server MCP
```

**Claude Desktop config**:
```json
{
  "mcpServers": {
    "mymovies": {
      "command": "mymovies-mcp"
    }
  }
}
```

## 🔧 Self-Hosted

Gli utenti possono anche hostare il proprio server:

1. **Deploy su Vercel/Netlify**:
   - Fork del repository
   - Deploy automatico
   - Configurazione variabili ambiente

2. **Docker**:
```bash
docker run -p 3000:3000 mymovies-api
```

3. **Railway/Render**:
   - One-click deploy da GitHub
   - URL personalizzato

## 📊 Comparazione Opzioni

| Opzione | Setup | Performance | Affidabilità |
|---------|-------|-------------|--------------|
| Server Remoto | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| Proxy MCP | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Locale | ⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| NPM Package | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

## 🎯 Raccomandazione

**Per utenti finali**: Proxy MCP (download singolo file)
**Per sviluppatori**: Installazione completa
**Per aziende**: Self-hosted con proprio dominio