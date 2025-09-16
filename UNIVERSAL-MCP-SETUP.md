# 🌍 MyMovies MCP - Configurazione Universale

**Funziona su qualsiasi dispositivo con Claude Desktop!**

## Setup Immediato (30 secondi)

1. **Apri Claude Desktop**
2. **Vai in Impostazioni → Estensioni**
3. **Copia e incolla questa configurazione**:

```json
{
  "mcpServers": {
    "mymovies": {
      "command": "curl",
      "args": [
        "-s", "-X", "POST",
        "-H", "Content-Type: application/json",
        "--data-binary", "@-",
        "https://mymovies-api-61434647155.europe-west8.run.app/mcp-jsonrpc"
      ]
    }
  }
}
```

4. **Riavvia Claude Desktop**
5. **Prova**: "Estrai la recensione di Oppenheimer 2023"

## Tools Disponibili

- `extract_movie_review` - Estrai recensioni da MyMovies.it
- `list_reviews` - Lista recensioni estratte  
- `get_api_info` - Info server API

## Requisiti

- ✅ Claude Desktop
- ✅ Connessione internet
- ✅ `curl` (preinstallato su Mac/Linux/Windows)

## Come Funziona

1. Claude Desktop usa `curl` per inviare richieste JSON-RPC
2. Il server Cloud Run processa le richieste
3. Estrae recensioni da MyMovies.it
4. Restituisce risultati strutturati

## Vantaggi

- 🌍 **Universale**: Funziona su qualsiasi dispositivo
- ☁️ **Cloud-based**: Sempre aggiornato, nessuna installazione locale
- 🚀 **Veloce**: Connessione diretta HTTP
- 🔒 **Sicuro**: Server Google Cloud Run

## Supporto

- **Repository**: https://github.com/ripolissimogit/mymovies_extractor
- **API Server**: https://mymovies-api-61434647155.europe-west8.run.app
- **Endpoint MCP**: `/mcp-jsonrpc`

---

**🎬 Pronto per estrarre recensioni da MyMovies.it ovunque!**
