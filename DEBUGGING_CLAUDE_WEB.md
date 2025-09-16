# 🔍 Debug Claude Web Integration

## 🚨 Come Individuare Errori di Claude Web

Claude Web non fornisce feedback sugli errori. Usa questi strumenti per diagnosticare i problemi:

### 1. 📊 Debug Endpoints Disponibili

```bash
# Info generale server
curl https://mymovies-api-rflzoyubyq-oc.a.run.app/debug/claude

# Test veloce senza estrazione
curl -X POST https://mymovies-api-rflzoyubyq-oc.a.run.app/debug/test-extract \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Movie","year":2023}'

# Verifica OpenAPI spec
curl https://mymovies-api-rflzoyubyq-oc.a.run.app/openapi.json | jq

# Well-known endpoint
curl https://mymovies-api-rflzoyubyq-oc.a.run.app/.well-known/ai-plugin.json | jq
```

### 2. 🔍 Monitoraggio Log in Tempo Reale

**Google Cloud Console**:
1. Vai su [Cloud Run Console](https://console.cloud.google.com/run)
2. Clicca su `mymovies-api`
3. Tab "LOGS" → "View in Logs Explorer"
4. Filtra per timestamp recente

**CLI (se hai gcloud)**:
```bash
gcloud logs tail projects/YOUR_PROJECT/logs/run.googleapis.com%2Fstderr \
  --filter="resource.labels.service_name=mymovies-api"
```

### 3. 🤖 Riconoscimento Richieste Claude

Il sistema rileva automaticamente richieste AI da:
- User-Agent contenente: `claude`, `anthropic`, `web-connector`
- Accesso a: `/openapi.json`, `/.well-known/`
- Headers specifici Claude Web

**Formato Log per Claude**:
```
🤖 AI REQUEST: 2025-09-16T17:00:00.000Z GET /openapi.json
   User-Agent: Claude-Web-Connector/1.0
   IP: 142.250.xxx.xxx
   Headers: {...}
```

### 4. 📋 Checklist Diagnostica

Quando Claude Web non funziona, verifica:

```bash
# ✅ 1. Server raggiungibile
curl https://mymovies-api-rflzoyubyq-oc.a.run.app/health

# ✅ 2. OpenAPI spec valido
curl -s https://mymovies-api-rflzoyubyq-oc.a.run.app/openapi.json | jq '.openapi'

# ✅ 3. Endpoint extract funziona
curl -X POST https://mymovies-api-rflzoyubyq-oc.a.run.app/debug/test-extract \
  -H "Content-Type: application/json" \
  -d '{"title":"Oppenheimer","year":2023}'

# ✅ 4. CORS abilitato
curl -I -X OPTIONS https://mymovies-api-rflzoyubyq-oc.a.run.app/extract

# ✅ 5. Well-known endpoint
curl https://mymovies-api-rflzoyubyq-oc.a.run.app/.well-known/ai-plugin.json
```

### 5. 🔧 Log Patterns per Problemi Comuni

**Claude Web non trova il server**:
```
# Cerca nei log:
🤖 AI REQUEST: ... GET /openapi.json
```
Se non vedi questa riga → Claude non riesce a raggiungere il server

**Claude Web non valida lo schema**:
```
🤖 AI REQUEST: ... GET /openapi.json
# Seguito da:
🎬 [req_xxx] EXTRACT REQUEST STARTED
```
Se vedi solo la prima → Problema nello schema OpenAPI

**Claude Web invia richieste malformate**:
```
❌ [req_xxx] VALIDATION ERROR: Missing fields
   Received: title="undefined", year="undefined"
```
→ Claude sta inviando parametri nel formato sbagliato

### 6. 🛠️ Test Automatizzato

Crea questo script per test ricorrenti:

```bash
#!/bin/bash
# test-claude-web.sh

echo "🔍 Testing Claude Web compatibility..."

# Test 1: OpenAPI
echo "1. OpenAPI spec..."
curl -s https://mymovies-api-rflzoyubyq-oc.a.run.app/openapi.json | jq -r '.openapi' || echo "❌ FAILED"

# Test 2: Well-known
echo "2. Well-known endpoint..."
curl -s https://mymovies-api-rflzoyubyq-oc.a.run.app/.well-known/ai-plugin.json | jq -r '.name_for_human' || echo "❌ FAILED"

# Test 3: Extract
echo "3. Extract endpoint..."
RESULT=$(curl -s -X POST https://mymovies-api-rflzoyubyq-oc.a.run.app/debug/test-extract \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","year":2023}')
echo $RESULT | jq -r '.success' || echo "❌ FAILED"

echo "✅ Tests completed"
```

### 7. 🚨 Troubleshooting Comune

**Problema**: Claude Web non rileva il connector
**Soluzione**: Verifica che l'URL OpenAPI sia esatto e accessibile

**Problema**: Schema validation errors
**Soluzione**: Controlla che i tipi nel requestBody corrispondano ai dati inviati

**Problema**: CORS errors
**Soluzione**: Headers `Access-Control-Allow-Origin: *` sono già impostati

**Problema**: Timeout errors
**Soluzione**: L'estrazione richiede 15-30s, normale per Puppeteer

### 8. 📞 Debug in Tempo Reale

Per test live durante configurazione Claude Web:

1. **Apri 2 terminali**
2. **Terminale 1** - Monitor logs:
   ```bash
   # Segue i log in tempo reale (se hai gcloud)
   gcloud logs tail projects/YOUR_PROJECT/logs/run.googleapis.com%2Fstderr
   ```
3. **Terminale 2** - Test manuale:
   ```bash
   # Simula richiesta Claude Web
   curl -X POST https://mymovies-api-rflzoyubyq-oc.a.run.app/extract \
     -H "Content-Type: application/json" \
     -H "User-Agent: Claude-Web-Test/1.0" \
     -d '{"title":"Dune","year":2021}'
   ```

Così vedi esattamente cosa riceve il server e come risponde!