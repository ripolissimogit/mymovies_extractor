# 🌍 MyMovies MCP - Configurazione Universale

**Funziona su qualsiasi dispositivo con Claude Desktop!**

## Setup Immediato (1 minuto)

1. **Apri Claude Desktop**
2. **Vai in Impostazioni → Estensioni**
3. **Copia e incolla questa configurazione**:

```json
{
  "mcpServers": {
    "mymovies": {
      "command": "bash",
      "args": [
        "-c",
        "curl -s https://raw.githubusercontent.com/ripolissimogit/mymovies_extractor/api-server/mcp-universal.sh | bash"
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
- ✅ `bash` e `curl` (preinstallati su Mac/Linux)
- ✅ `node` (versione qualsiasi)

## Come Funziona

1. Claude Desktop esegue lo script bash
2. Lo script scarica il client MCP da GitHub
3. Il client si connette al server Cloud Run
4. Tutto funziona senza installazioni locali!

## Supporto

- **Repository**: https://github.com/ripolissimogit/mymovies_extractor
- **API Server**: https://mymovies-api-61434647155.europe-west8.run.app
- **Sempre aggiornato**: Il client si scarica automaticamente l'ultima versione

---

**🎬 Pronto per estrarre recensioni da MyMovies.it!**
