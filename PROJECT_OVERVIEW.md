# MyMovies Extractor - Panoramica Progetto

## 🚀 Due Versioni Disponibili

Questo progetto offre **due implementazioni** dell'estrattore di recensioni da MyMovies.it:

### 📱 **Branch `main` - Versione CLI**
Applicazione a riga di comando per uso interattivo diretto.

**Caratteristiche:**
- Interfaccia CLI interattiva
- Ricerca film via TMDB API
- Estrazione recensioni tramite Puppeteer
- Salvataggio automatico con timestamp
- Perfect per uso personale e script

**Come usare:**
```bash
git checkout main
npm install
npm run mym  # Ricerca interattiva
```

### 🌐 **Branch `api-server` - Versione API REST**
Server API REST per integrazione con altre applicazioni.

**Caratteristiche:**
- Server Express.js completo
- Endpoint REST standardizzati
- Rate limiting e sicurezza
- Batch processing
- Perfect per integrazioni e applicazioni web

**Come usare:**
```bash
git checkout api-server
npm install
npm run api  # Avvia server su porta 3000
```

## 🔄 Confronto Versioni

| Funzionalità | CLI (main) | API (api-server) |
|--------------|------------|------------------|
| **Ricerca interattiva** | ✅ | ❌ |
| **Estrazione singola** | ✅ | ✅ |
| **Batch processing** | ❌ | ✅ |
| **Integrazione app** | ❌ | ✅ |
| **Rate limiting** | ❌ | ✅ |
| **Output JSON** | ✅ | ✅ |
| **Documentazione API** | ❌ | ✅ |
| **Health checks** | ❌ | ✅ |
| **Lista recensioni** | ❌ | ✅ |
| **Statistiche** | ✅ | ✅ |

## 📖 Documentazione Specifica

### Versione CLI (Branch main)
- Leggi `README.md` per setup e uso completo
- Supporta ricerca TMDB interattiva
- Comando `mym` per uso rapido

### Versione API (Branch api-server)
- Leggi `API_README.md` per documentazione completa
- Server REST su porta 3000 di default
- Test suite inclusa: `npm run test:api`

## 🎯 Quale Versione Scegliere?

### Usa la **Versione CLI** se:
- Vuoi estrarre recensioni manualmente
- Preferisci interfaccia interattiva
- Lavori principalmente da terminale
- Hai bisogno di ricerca film guidata

### Usa la **Versione API** se:
- Sviluppi un'app web o mobile
- Hai bisogno di automazione batch
- Vuoi integrare l'estrattore in sistemi esistenti
- Servono rate limiting e sicurezza

## 🚀 Quick Start

### Per sviluppatori - API REST:
```bash
# Clona e vai al branch API
git clone https://github.com/ripolissimogit/mymovies_extractor.git
cd mymovies_extractor
git checkout api-server

# Setup
npm install
export TMDB_API_KEY='your_tmdb_api_key'

# Avvia server
npm run api

# Testa API
curl http://localhost:3000/api/info
```

### Per uso personale - CLI:
```bash
# Clona repository (branch main)
git clone https://github.com/ripolissimogit/mymovies_extractor.git
cd mymovies_extractor

# Setup
npm install
export TMDB_API_KEY='your_tmdb_api_key'

# Uso interattivo
mym
```

## 🔑 Setup TMDB API Key

Entrambe le versioni richiedono una API key TMDB:

1. Registrati su https://www.themoviedb.org/
2. Vai su https://www.themoviedb.org/settings/api
3. Crea e copia la tua API key
4. Imposta la variabile d'ambiente:

```bash
export TMDB_API_KEY='your_api_key_here'
```

## 🏗️ Architettura Tecnica

### Core Shared (Entrambe le versioni)
- **mymovies_extractor.js**: Engine di estrazione Puppeteer
- **search_and_extract.py**: Logica di ricerca TMDB
- **ai_wrapper.sh**: Wrapper per AI integration

### CLI Specifici (Branch main)
- **bin/mymovies**: Script CLI wrapper
- Ricerca interattiva Python
- Output formattato per terminale

### API Specifici (Branch api-server)
- **api-server.js**: Server Express.js completo
- **test-api.js**: Suite di test automatizzati
- Endpoint REST standardizzati
- Rate limiting e sicurezza

## 📊 Statistiche Progetto

- **Linguaggi**: JavaScript (Node.js), Python, Bash
- **Framework**: Express.js (API), Puppeteer (scraping)
- **Database**: File system (reviews/ directory)
- **Testing**: Suite automatizzata per API
- **Sicurezza**: Rate limiting, input validation
- **Documentazione**: README dettagliati per ogni versione

## 🤝 Contributi

I contributi sono benvenuti su entrambi i branch:

1. **Fork** del repository
2. **Branch** appropriato (main per CLI, api-server per API)
3. **Implementa** le modifiche
4. **Test** completi
5. **Pull request** con descrizione dettagliata

## 📄 Licenza

MIT License - Vedi LICENSE file per dettagli completi.

## 🔗 Links Utili

- **Repository**: https://github.com/ripolissimogit/mymovies_extractor
- **Issues**: https://github.com/ripolissimogit/mymovies_extractor/issues
- **TMDB API**: https://www.themoviedb.org/documentation/api
- **MyMovies.it**: https://www.mymovies.it/

---

*Ultimo aggiornamento: Settembre 2025*
*Sviluppato con Claude Code - https://claude.ai/code*