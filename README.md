# MyMovies.it Review Extractor

![Deploy](https://github.com/ripolissimogit/mymovies_extractor/actions/workflows/deploy-cloudrun.yml/badge.svg)

🎬 **Estrai recensioni da MyMovies.it con MCP Server per AI assistants**

## 🚀 **MCP Server Cloud**

**URL**: `https://mymovies-api-rflzoyubyq-oc.a.run.app`

### Integrazione AI

**Claude Desktop** (`~/.claude/claude_desktop_config.json`):
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

**Claude Web** (Web Connectors):
OpenAPI URL: `https://mymovies-api-rflzoyubyq-oc.a.run.app/openapi.json`

**API diretta**:
```bash
curl -X POST https://mymovies-api-rflzoyubyq-oc.a.run.app/extract \
  -H "Content-Type: application/json" \
  -d '{"title":"Oppenheimer","year":2023}'
```

## 🎯 **Uso Locale**

```bash
git clone https://github.com/ripolissimogit/mymovies_extractor.git
cd mymovies_extractor
npm install

# Estrazione diretta
./mym "Dune" 2021

# Server locale
npm start  # http://localhost:3000
```

## 🔧 **API**

- `POST /tools/call` - Estrai recensione
- `POST /tools/list` - Lista tools
- `GET /health` - Status server

**Tool**: `extract_movie_review(title, year)` → JSON con recensione, autore, data

## 📊 **Performance**

- Successo: >95%
- Tempo: 15-30s
- Rate limit: 30/min

**Film testati**: Oppenheimer (2023), Dune (2021), Interstellar (2014)

## 🔄 **Development**

**GitHub Actions**: Auto-deploy su push al branch `api-server`

Vedi [DEVELOPMENT.md](./DEVELOPMENT.md) per:
- Processo di deploy
- Differenze Claude Web vs Claude Desktop
- Debug e troubleshooting
- Local development setup

---

*MIT License - Rispettare ToS MyMovies.it*
