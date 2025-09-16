# MyMovies.it Review Extractor

![Deploy](https://github.com/ripolissimogit/mymovies_extractor/actions/workflows/deploy-cloudrun.yml/badge.svg)

🎬 **Strumento completo per estrarre recensioni da MyMovies.it con ricerca interattiva, logging avanzato e MCP Server integrato**

Utilizza Puppeteer per superare le limitazioni dell'architettura AMP e include integrazione TMDB per ricerca intelligente dei film.

## 🚀 **NUOVO: MCP Server Integrato**

**Compatibile con Claude Desktop, Cursor, Amazon Q e tutti i client AI che supportano il Model Context Protocol!**

### Quick Start MCP

```bash
# Installazione automatica per Claude Desktop
./install-mcp.sh

# Installazione globale NPM
npm install -g ./mcp-standalone

# Avvio manuale
npm run mcp              # Stdio mode (Claude Desktop)
npm run mcp:http         # HTTP mode (Cursor, Q, etc.)
npm run mcp:test         # Test del server

# Standalone
mymovies-mcp             # Auto-detect mode
mymovies-mcp --http      # HTTP + WebSocket mode
```

**Tools disponibili**:
- `extract_movie_review` - Estrai recensioni con metadata completi
- `list_reviews` - Lista recensioni estratte
- `get_api_info` - Info server API

📖 **Documentazione completa**: [MCP-README.md](MCP-README.md) | [Configurazioni client](mcp-configs.md)

## Installazione Rapida

```bash
git clone https://github.com/ripolissimogit/mymovies_extractor.git
cd mymovies_extractor
npm install
```

### Setup TMDB API (per ricerca interattiva)

1. Ottieni API key da: https://www.themoviedb.org/settings/api
2. Imposta la variabile d'ambiente:
   ```bash
   export TMDB_API_KEY='your_api_key_here'
   # O aggiungi al tuo .bashrc/.zshrc per renderla permanente
   echo 'export TMDB_API_KEY="your_api_key"' >> ~/.zshrc
   ```

### Comando Principale: `mym`

Il comando `mym` è l'interfaccia unificata per tutte le operazioni:

```bash
# RICERCA INTERATTIVA (raccomandato)
mym
# Ti guida nella ricerca e selezione del film

# 🎯 ESTRAZIONE DIRETTA
mym "Titolo Film" ANNO [opzioni]

# Esempi:
mym "Oppenheimer" 2023           # Estrazione completa con salvataggio
mym "Interstellar" 2014 --json   # Output JSON
mym "Dune" 2021 --verbose        # Mostra browser (debug)
mym "Avatar" 2009 --no-save      # Non salvare file
```

### Ricerca Interattiva (Modalita Principale)

```bash
mym
Cerca film (o "quit" per uscire): Interstellar

# Mostra risultati TMDB:
1. Interstellar (2014) - Christopher Nolan
2. The Science of Interstellar (2014)
...

Scegli film (1-10): 1
Vuoi estrarre la recensione? (s/n): s

Recensione estratta e salvata automaticamente!
```

## Nuovo Formato Recensioni

Ogni recensione salvata include **timestamp** e **log dettagliato**:

```
ESTRATTO IL: domenica 14 settembre 2025 alle ore 16:10:31

Interstellar (2014)
Autore: Gabriele Niola
Data: sabato 22 novembre 2014
Lunghezza: 5086 caratteri

RECENSIONE:
================================================================================
[Contenuto della recensione completa]
================================================================================

LOG ESTRAZIONE:
================================================================================
URL: https://www.mymovies.it/film/2014/interstellar/#recensione
Tempo elaborazione: 4250ms
Metodo estrazione: HTML_RESPONSE
Parole: 815
File: interstellar_2014_review.txt
Timestamp: 2025-09-14T14:10:31.353Z
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
Selettori utilizzati: p.corpo, .corpo, #recensione
Viewport: Default Puppeteer
Lingua: Italiano
================================================================================
```

## Architettura del Progetto

### **Script Principali**
- **`mym`** - Comando unificato (ricerca + estrazione)
- **`mymovies_extractor.js`** - Core extractor con timestamp e logging
- **`search_and_extract.py`** - Ricerca interattiva con TMDB API
- **`ai_wrapper.sh`** - Wrapper per AI integration
- **`bin/mymovies`** - CLI wrapper per l'extractor

### **Documentazione**
- **`README.md`** - Questa guida
- **`GUIDA_ESTRAZIONE_MYMOVIES.md`** - Guida tecnica dettagliata
- **`AI_EXAMPLES.md`** - Esempi per integrazione AI

### **Directory**
- **`reviews/`** - Recensioni estratte con timestamp e log

## Uso come Modulo JavaScript

```javascript
const { extractMovieReview } = require('./mymovies_extractor');

// Estrazione base
const result = await extractMovieReview("Oppenheimer", 2023);
if (result.success) {
    console.log(`Autore: ${result.review.author}`);
    console.log(`Contenuto: ${result.review.content}`);
    console.log(`File salvato: ${result.filePath}`);
}

// Con opzioni
const result = await extractMovieReview("Dune", 2021, {
    headless: false,    // Mostra browser
    noSave: true       // Non salvare file
});
```

## Output JSON Strutturato

```json
{
  "success": true,
  "input": { "title": "Oppenheimer", "year": 2023 },
  "url": "https://www.mymovies.it/film/2023/oppenheimer/#recensione",
  "review": {
    "content": "Gocce di pioggia sollevano increspature...",
    "author": "Andrea Fornasiero",
    "date": "domenica 23 luglio 2023",
    "title": "Oppenheimer"
  },
  "metadata": {
    "extractionMethod": "HTML_RESPONSE",
    "contentLength": 6444,
    "wordCount": 1029,
    "confidence": 1
  }
}
```

## Film Testati con Successo

- **Oppenheimer (2023)** - Andrea Fornasiero - 6420 caratteri
- **Interstellar (2014)** - Gabriele Niola - 5086 caratteri
- **The Brutalist (2024)** - Emanuele Sacchi - 4856 caratteri
- **The Smashing Machine (2025)** - 4963 caratteri
- **Un Film Fatto Per Bene (2025)** - Roberto Manassero - 4731 caratteri
- **La Grazia (2025)** - 5439 caratteri
- **Nosferatu (2024)** - 5411 caratteri

## Nuove Funzionalita v2.0

### Ricerca Intelligente
- **Integrazione TMDB**: Cerca film nel database mondiale
- **Selezione interattiva**: Scegli dai risultati trovati
- **Fallback titoli**: Prova titolo originale se quello italiano non funziona

### Timestamp e Logging
- **Timestamp completo** all'inizio di ogni file
- **Log dettagliato** con metadati di estrazione
- **Tracking performance** per debug e ottimizzazione

### Performance Migliorate
- **Timeout esteso** (180 secondi) per estrazioni stabili
- **Error handling** migliorato
- **Salvataggio automatico** con nomi file normalizzati

## Troubleshooting

### TMDB API Key mancante
```bash
# Imposta la variabile d'ambiente
export TMDB_API_KEY='your_api_key_here'
# O aggiungi al .zshrc per renderla permanente
echo 'export TMDB_API_KEY="your_key"' >> ~/.zshrc
source ~/.zshrc
```

### Film non trovato nella ricerca
1. **Usa la ricerca interattiva**: `mym` trova più facilmente i film
2. **Prova varianti del titolo**: titolo originale vs tradotto
3. **Verifica l'anno**: potrebbero esserci più versioni

### Recensione non trovata
1. Il film potrebbe non avere recensioni su MyMovies.it
2. Film molto nuovi potrebbero non avere ancora recensioni
3. Prova l'estrazione diretta: `mym "Titolo" Anno --verbose`

### Timeout/Errori di rete
1. **Timeout esteso**: ora usa 180 secondi (era 60)
2. **Controlla connessione** a MyMovies.it
3. **Riprova più tardi**: il sito potrebbe essere sovraccarico

### Debug Mode
```bash
mym "Film" 2023 --verbose    # Mostra browser
mym "Film" 2023 --no-save    # Test senza salvare
```

## Metodologia

L'extractor utilizza **intercettazione della response HTML** invece del DOM parsing per superare le limitazioni dell'architettura AMP di MyMovies.it:

1. **Intercetta** l'HTML completo della pagina
2. **Cerca** il pattern `<p class="corpo">` 
3. **Estrae** il contenuto della recensione
4. **Valida** la qualità del testo estratto

## Performance & Statistiche

## MCP Server Integration

L'API include un endpoint MCP (Model Context Protocol) per integrazione diretta con AI assistants:

- **Endpoint**: `GET/POST /mcp` 
- **Protocollo**: Server-Sent Events (SSE) per streaming
- **URL**: `https://mymovies-api-61434647155.europe-west8.run.app/mcp`

### Tool MCP Disponibili

- `checkServerHealth` → Verifica stato server
- `getApiInformation` → Info API e endpoints  
- `listApiReviews` → Lista recensioni estratte
- `extractSingleReview` → Estrazione recensione singola
  - Parametri: `{ title: string, year: number, options?: object }`

### Configurazione Client

**Cursor/Claude Desktop/ChatGPT Developer:**
```json
{
  "mcpServers": {
    "mymovies": {
      "command": "curl",
      "args": ["-N", "https://mymovies-api-61434647155.europe-west8.run.app/mcp"]
    }
  }
}
```

**Test manuale:**
```bash
# Apri stream SSE
curl -N https://mymovies-api-61434647155.europe-west8.run.app/mcp

# Invoca tool (in altro terminale)
curl -X POST https://mymovies-api-61434647155.europe-west8.run.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"id":"test-1","method":"extractSingleReview","params":{"title":"Oppenheimer","year":2023}}'
```

## Deploy Cloud Run (Automazione)

- Script locale: `scripts/deploy-cloudrun.sh`
  - Parametri via env o argomenti (ordine): `PROJECT_ID REGION SERVICE IMAGE_REPO IMAGE_NAME`
  - Esempio:
    - `PROJECT_ID=workspace-mcp-682108 REGION=europe-west8 ./scripts/deploy-cloudrun.sh`

- GitHub Actions: deploy continuo su branch `api-server`
  - Workflow: `.github/workflows/deploy-cloudrun.yml`
  - Configurazione repo (Settings → Secrets and variables → Actions):
    - Secrets: `GOOGLE_CLOUD_CREDENTIALS` (JSON key account di deploy)
    - Variables: `GCP_PROJECT_ID=workspace-mcp-682108`, `GCP_REGION=europe-west8`

- GitHub Actions: aggiornamento variabili d'ambiente (manuale)
  - Workflow: `.github/workflows/update-cloudrun-env.yml`
  - Avvio manuale da GitHub → Actions → "Update Cloud Run Env (manual)"
  - Input:
    - `service` (default: `mymovies-api`)
    - `region` (default: `europe-west8`)
    - `envPairs` (es: `GCS_BUCKET=mymovies-reviews,PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`)

- **Tasso di successo**: >95% su film con recensioni pubblicate
- **Tempo medio**: 4-6 secondi per estrazione (più timeout)
- **Timeout**: 180 secondi (3 minuti) per gestire connessioni lente
- **Metodi supportati**: HTML_RESPONSE, DOM_FALLBACK
- **Formati output**: JSON, Testo formattato con timestamp
- **Auto-save**: Salvataggio automatico con log dettagliato

## 🔗 Repository & Sviluppo

```bash
# Clona il repository
git clone https://github.com/ripolissimogit/mymovies_extractor.git

# Contribuisci
git checkout -b feature/nuova-funzionalita
# ... fai le tue modifiche ...
git commit -m "Aggiunta nuova funzionalità"
git push origin feature/nuova-funzionalita
```

**Repository**: https://github.com/ripolissimogit/mymovies_extractor

## 🔗 URL Pattern

```
https://www.mymovies.it/film/[ANNO]/[titolo-normalizzato]/#recensione
```

Il titolo viene automaticamente normalizzato:
- Minuscolo
- Caratteri speciali rimossi  
- Spazi → trattini

## Licenza

MIT License - Progetto open source per uso educativo e di ricerca.

**Importante**: Rispettare sempre i termini di servizio di MyMovies.it e utilizzare lo strumento responsabilmente.

---

## Contributi

Contributi benvenuti! Per bug report o feature request:
1. Apri una [Issue](https://github.com/ripolissimogit/mymovies_extractor/issues)
2. Fai fork del progetto
3. Crea una feature branch
4. Commit le modifiche
5. Push alla branch
6. Apri una Pull Request

---

*Ultimo aggiornamento: Settembre 2025*
*Sviluppato con [Claude Code](https://claude.ai/code)*
*Se il progetto ti e' utile, lascia una stella su GitHub!*
