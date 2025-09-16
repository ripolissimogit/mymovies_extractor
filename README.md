# MyMovies.it Review Extractor

![Deploy](https://github.com/ripolissimogit/mymovies_extractor/actions/workflows/deploy-cloudrun.yml/badge.svg)

🎬 **Strumento completo per estrarre recensioni da MyMovies.it con MCP Server integrato per AI assistants**

## 🚀 **MCP Server Cloud Ready**

**Server MCP deployato su Google Cloud Run - Compatibile con tutti i client AI!**

**URL Server**: `https://mymovies-api-rflzoyubyq-oc.a.run.app`

### Quick Integration

**Claude Desktop:**
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

**ChatGPT/Custom GPTs:**
```
POST https://mymovies-api-rflzoyubyq-oc.a.run.app/tools/call
Body: {"name":"extract_movie_review","arguments":{"title":"Film","year":2023}}
```

**Postman/API Testing:**
```
GET https://mymovies-api-rflzoyubyq-oc.a.run.app/health
POST https://mymovies-api-rflzoyubyq-oc.a.run.app/tools/list
```

## 📋 **Tool Disponibile**

- **`extract_movie_review`** - Estrai recensioni complete con metadata
  - Parametri: `title` (string), `year` (number)
  - Output: JSON con recensione, autore, data, metadata

## 🎯 **Uso Locale**

### Installazione
```bash
git clone https://github.com/ripolissimogit/mymovies_extractor.git
cd mymovies_extractor
npm install
```

### Comando Principale
```bash
# Ricerca interattiva (raccomandato)
./mym

# Estrazione diretta
./mym "Oppenheimer" 2023
./mym "Dune" 2021 --json
```

### Setup TMDB (opzionale)
```bash
export TMDB_API_KEY='your_api_key_here'
```

## 🔧 **API Endpoints**

### MCP Standard
- `POST /initialize` - Inizializzazione server
- `POST /tools/list` - Lista tools disponibili  
- `POST /tools/call` - Esecuzione tool

### JSON-RPC 2.0
- `POST /` - Endpoint root per JSON-RPC
- `POST /mcp-jsonrpc` - Endpoint legacy

### Utility
- `GET /health` - Health check
- `GET /openapi.json` - Specifica OpenAPI

## 📊 **Performance**

- **Tasso successo**: >95% su film con recensioni
- **Tempo medio**: 15-30 secondi per estrazione
- **Timeout**: 180 secondi
- **Rate limiting**: 30 richieste/minuto

## 🎬 **Film Testati**

- Oppenheimer (2023) - Andrea Fornasiero - 6420 caratteri
- Dune (2021) - Giancarlo Zappoli - 3650 caratteri  
- Interstellar (2014) - Gabriele Niola - 5086 caratteri
- The Brutalist (2024) - Emanuele Sacchi - 4856 caratteri

## 🔗 **Repository**

**GitHub**: https://github.com/ripolissimogit/mymovies_extractor

## 📄 **Licenza**

MIT License - Progetto open source per uso educativo e di ricerca.

**Importante**: Rispettare sempre i termini di servizio di MyMovies.it.

---

*Ultimo aggiornamento: Settembre 2025*
*Sviluppato con Amazon Q*
