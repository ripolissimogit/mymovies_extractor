# MCP da MyMovies Extractor API (via Tadata)

Questa guida spiega come ottenere un server MCP partendo dalle API Express di questo repository usando Tadata.

## 1) Esporre la specifica OpenAPI

- Avvia l'API in locale:

```bash
npm run api
```

- La specifica sarà disponibile in JSON su:

```
http://localhost:3000/api/openapi.json
```

Nota: Tadata necessita di una URL raggiungibile pubblicamente per poter leggere la specifica. In alternativa puoi caricare/incollare la spec nella UI di Tadata.

Opzioni per rendere la spec pubblica:
- Pubblica temporaneamente la spec (e opzionalmente l'API) su un host accessibile (Render, Railway, Fly.io, Vercel, ecc.).
- Usa un tunnel (ngrok, Cloudflared) per esporre `http://localhost:3000` su Internet e fornisci a Tadata l'URL risultante di `/api/openapi.json`.

## 2) Creare il server MCP su Tadata (solo OpenAPI)

1. Vai su https://tadata.com e apri la sezione Documentation/Installation.
2. Scegli “Connect your OpenAPI spec” e inserisci l’URL pubblico della tua spec (`/api/openapi.json`).
3. Dai un nome al server (es. "MyMovies MCP").
4. Tadata genererà un endpoint MCP, di forma simile a:

```
https://<tuo-sottodominio>.api.tadata.com/mcp/mymovies
```

Annota l’URL esatto perché servirà al client MCP.

## 3) Alternativa: integrazione via SDK (Node/Express)

Se preferisci integrare Tadata direttamente nell'app:

1. Installa l’SDK:

```bash
npm install @tadata-js/sdk
```

2. Esporta la variabile d’ambiente con la tua API key Tadata:

```bash
export TADATA_API_KEY="<la_tua_api_key>"
```

3. Avvia il server. All’avvio verrà tentato automaticamente il deploy MCP usando `openapi.json`:

```bash
npm run api
```

Note:
- Il deploy è “best effort”: se l’SDK non è installato o la chiave manca, viene ignorato senza interrompere l’avvio.
- La logica è in `tadata-mcp.js` e viene invocata da `api-server.js`.

Una volta completato il deploy, Tadata fornisce un URL MCP (es. `https://<subdomain>.api.tadata.com/mcp/mymovies`). Usa quell’URL nel tuo client MCP.

## 4) Configurare il client MCP (es. Cursor)

Per Cursor:

1. Apri le impostazioni MCP (Shift+Command+J su Mac, Shift+Ctrl+J su Win/Linux) o via ⚙️.
2. Aggiungi un nuovo "Global MCP server".
3. Modifica `~/.cursor/mcp.json` aggiungendo una voce simile a questa:

```json
{
  "mcpServers": {
    "MyMovies MCP": {
      "url": "https://<tuo-sottodominio>.api.tadata.com/mcp/mymovies"
    }
  }
}
```

Sostituisci l’URL con quello fornito da Tadata.

## 5) Test rapido

- In Cursor, apri il pannello Tools e verifica che il server "MyMovies MCP" sia visibile.
- Prova ad invocare lo strumento corrispondente (Tadata mappa gli endpoint OpenAPI in tool MCP). Ad esempio, cerca uno strumento legato a `POST /api/extract`.

## 6) Suggerimenti

- Mantieni aggiornata la spec `openapi.json` quando cambi gli endpoint.
- Se vuoi usare Swagger UI localmente, puoi aggiungerlo più avanti; per ora serviamo la sola spec su `/api/openapi.json`.
- Se non vuoi usare Tadata, puoi anche creare un MCP server self‑hosted con i pacchetti MCP ufficiali (Node/TS o Python) mappando queste rotte in tool.
