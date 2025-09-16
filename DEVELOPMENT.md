# Development Guide

## 🔄 Deployment Process

### Automatic Deployment
Il progetto usa **GitHub Actions** per deploy automatico:

- **Branch**: `api-server`
- **Trigger**: Push automatico
- **Target**: Google Cloud Run
- **URL**: `https://mymovies-api-rflzoyubyq-oc.a.run.app`

### Workflow per Modifiche

```bash
# 1. Modifica codice
git add .
git commit -m "Descrizione modifiche"

# 2. Push attiva automaticamente il deploy
git push origin api-server

# 3. Monitoraggio deploy
gh run list --branch api-server
```

**⚠️ IMPORTANTE**: Tutte le modifiche devono essere committate e pushate per essere deployate su Cloud Run.

## 🔧 GitHub Actions

### File: `.github/workflows/deploy-cloudrun.yml`

**Processo automatico**:
1. Build Docker image
2. Push su Artifact Registry
3. Deploy su Cloud Run con configurazione:
   - CPU: 1 core
   - Memory: 1Gi
   - Timeout: 300s
   - Concurrency: 10
   - Environment: Puppeteer headless

### Monitoraggio

```bash
# Status deploy corrente
gh run list --branch api-server --limit 1

# Dettagli run specifico
gh run view <run-id>

# Logs deploy
gh run view <run-id> --log
```

## 🎯 AI Assistant Integration

### Claude Web (Web Connectors)
- **Endpoint**: `POST /extract`
- **OpenAPI**: `/openapi.json`
- **Payload**: `{"title": "Film", "year": 2023}`

### Claude Desktop (MCP)
- **Endpoint**: JSON-RPC su `/`
- **Tools**: `extract_movie_review`
- **Config**: `~/.claude/claude_desktop_config.json`

### Differenze Critiche

| Feature | Claude Web | Claude Desktop |
|---------|------------|----------------|
| Protocol | REST API + OpenAPI | JSON-RPC 2.0 (MCP) |
| Endpoint | `/extract` | `/` |
| Format | `{title, year}` | `{name, arguments}` |
| Auth | None | MCP handshake |

## 🛠️ Local Development

```bash
# Installa dipendenze
npm install

# Server locale (porta 3000)
npm run api

# Test estrazione
curl -X POST localhost:3000/extract \
  -H "Content-Type: application/json" \
  -d '{"title":"Oppenheimer","year":2023}'

# Test OpenAPI
curl localhost:3000/openapi.json | jq
```

## 🔍 Debugging

### Verifiche Post-Deploy

```bash
# 1. Health check
curl https://mymovies-api-rflzoyubyq-oc.a.run.app/health

# 2. OpenAPI spec
curl https://mymovies-api-rflzoyubyq-oc.a.run.app/openapi.json | jq '.paths'

# 3. Test extraction
curl -X POST https://mymovies-api-rflzoyubyq-oc.a.run.app/extract \
  -H "Content-Type: application/json" \
  -d '{"title":"Oppenheimer","year":2023}'
```

### Problemi Comuni

1. **Claude Web non funziona**: Verifica che `/openapi.json` punti a `/extract`, non `/tools/call`
2. **Deploy non avvenuto**: Controlla che le modifiche siano state pushate su `api-server`
3. **Timeout**: Estrazione può richiedere 15-30s, normale per Puppeteer
4. **Rate limit**: 30 richieste/minuto per IP

## 📊 Monitoring

- **GitHub**: Actions tab per deploy status
- **Cloud Run**: Console Google Cloud per logs e metriche
- **Health**: `/health` endpoint sempre disponibile
- **Stats**: `/api/stats` per statistiche estrattore