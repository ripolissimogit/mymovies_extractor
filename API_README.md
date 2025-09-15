# MyMovies Extractor API

REST API server per l'estrazione automatizzata di recensioni da MyMovies.it.

## Installazione

```bash
# Installa dipendenze API
npm install express cors express-rate-limit

# Avvia server API
npm run api

# Sviluppo con auto-reload
npm install nodemon --save-dev
npm run api:dev
```

## Avvio Rapido

```bash
# Avvia il server
npm run api

# Il server sarà disponibile su:
# http://localhost:3000
```

## API Endpoints

### Health Check
```bash
GET /health
```
Verifica stato del server.

### Informazioni API
```bash
GET /api/info
```
Informazioni generali sull'API e endpoint disponibili.

### Estrazione Singola
```bash
POST /api/extract
Content-Type: application/json

{
    "title": "Oppenheimer",
    "year": 2023,
    "options": {
        "noSave": false
    }
}
```

**Risposta di successo:**
```json
{
    "success": true,
    "data": {
        "title": "Oppenheimer",
        "year": 2023,
        "review": {
            "content": "Gocce di pioggia sollevano increspature...",
            "author": "Andrea Fornasiero",
            "date": "domenica 23 luglio 2023"
        },
        "metadata": {
            "contentLength": 6444,
            "wordCount": 1029,
            "processingTime": 4250,
            "extractionMethod": "HTML_RESPONSE"
        },
        "url": "https://www.mymovies.it/film/2023/oppenheimer/#recensione",
        "filePath": "reviews/oppenheimer_2023_review.txt"
    }
}
```

### Estrazione Batch
```bash
POST /api/extract/batch
Content-Type: application/json

{
    "films": [
        { "title": "Oppenheimer", "year": 2023 },
        { "title": "Barbie", "year": 2023 },
        { "title": "Dune", "year": 2021 }
    ],
    "options": {
        "noSave": false
    }
}
```

**Risposta:**
```json
{
    "success": true,
    "batch": {
        "total": 3,
        "successful": 2,
        "failed": 1,
        "processingTime": 12450
    },
    "results": [
        {
            "index": 0,
            "success": true,
            "data": {
                "title": "Oppenheimer",
                "year": 2023,
                "author": "Andrea Fornasiero",
                "contentLength": 6444
            },
            "input": { "title": "Oppenheimer", "year": 2023 }
        },
        // ...altri risultati
    ]
}
```

### Lista Recensioni
```bash
GET /api/reviews
```

Ritorna lista di tutte le recensioni estratte:
```json
{
    "reviews": [
        {
            "filename": "oppenheimer_2023_review.txt",
            "title": "oppenheimer",
            "year": 2023,
            "size": 6444,
            "modified": "2025-09-14T16:52:12.790Z",
            "downloadUrl": "/api/reviews/oppenheimer_2023_review.txt"
        }
    ],
    "total": 1
}
```

### Download Recensione
```bash
# Testo plain
GET /api/reviews/oppenheimer_2023_review.txt

# Formato JSON
GET /api/reviews/oppenheimer_2023_review.txt?format=json
```

### Statistiche
```bash
GET /api/stats
```

```json
{
    "totalFiles": 5,
    "totalSize": 32240,
    "averageSize": 6448,
    "oldestReview": "interstellar_2014_review.txt",
    "newestReview": "oppenheimer_2023_review.txt",
    "timestamp": "2025-09-14T16:52:12.790Z"
}
```

## Rate Limiting

- **Limite**: 30 richieste per minuto per IP
- **Headers di risposta**:
  - `X-RateLimit-Limit`: Limite massimo
  - `X-RateLimit-Remaining`: Richieste rimanenti
  - `X-RateLimit-Reset`: Timestamp di reset

## Gestione Errori

Tutti gli errori seguono il formato standard:

```json
{
    "success": false,
    "error": "Error Type",
    "message": "Descrizione dettagliata dell'errore"
}
```

### Codici di Stato
- `200` - Success
- `400` - Bad Request (parametri mancanti/invalidi)
- `404` - Not Found (recensione/risorsa non trovata)
- `429` - Too Many Requests (rate limit superato)
- `500` - Internal Server Error

## Esempi d'Uso

### cURL

```bash
# Estrazione singola
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"title": "Oppenheimer", "year": 2023}'

# Batch extraction
curl -X POST http://localhost:3000/api/extract/batch \
  -H "Content-Type: application/json" \
  -d '{
    "films": [
      {"title": "Oppenheimer", "year": 2023},
      {"title": "Barbie", "year": 2023}
    ]
  }'

# Lista recensioni
curl http://localhost:3000/api/reviews

# Statistiche
curl http://localhost:3000/api/stats
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: { 'Content-Type': 'application/json' }
});

// Estrazione singola
async function extractReview(title, year) {
    try {
        const response = await api.post('/extract', { title, year });
        return response.data;
    } catch (error) {
        console.error('Errore:', error.response?.data || error.message);
    }
}

// Uso
extractReview('Oppenheimer', 2023)
    .then(result => console.log(result));
```

### Python

```python
import requests

API_BASE = 'http://localhost:3000/api'

def extract_review(title, year):
    response = requests.post(f'{API_BASE}/extract',
        json={'title': title, 'year': year})
    return response.json()

# Uso
result = extract_review('Oppenheimer', 2023)
print(result)
```

## Configurazione

### Variabili d'Ambiente

- `PORT`: Porta del server (default: 3000)
- `NODE_ENV`: Ambiente (development/production)

### Personalizzazione Rate Limiting

Modifica nel file `api-server.js`:

```javascript
const limiter = rateLimit({
    windowMs: 60 * 1000, // Finestra temporale
    max: 30,             // Richieste massime
    // ... altre opzioni
});
```

## Logging

Il server logga automaticamente:
- Timestamp delle richieste
- Metodo HTTP e endpoint
- IP del client
- Errori interni

Formato log: `2025-09-14T16:52:12.790Z POST /api/extract - 127.0.0.1`

## Sicurezza

- Rate limiting per IP
- Validazione input rigorosa
- Sanitizzazione nomi file
- Headers CORS configurabili
- Gestione errori senza esposizione di dettagli interni

## Performance

- Caching automatico delle recensioni estratte
- Rate limiting interno per batch (2s tra richieste)
- Timeout configurabili per estrazioni
- Limite massimo 10 film per batch

## Integrazione

L'API può essere facilmente integrata in:
- Applicazioni web (React, Vue, Angular)
- App mobile
- Sistemi di automazione
- Bot e chatbot
- Pipeline di data processing

## Documentazione Completa

- Visita `/api/docs` per la documentazione completa in formato Markdown.
- Spec OpenAPI JSON: `/api/openapi.json` (può essere importata in strumenti come Swagger UI, Postman o Tadata per generare un MCP)

## Supporto

Per problemi o feature request:
1. Controlla i log del server
2. Verifica rate limiting
3. Testa con cURL prima
4. Apri issue su GitHub se necessario
