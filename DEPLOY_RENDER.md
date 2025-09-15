# Deploy su Render (Docker)

Questa guida pubblica l’API Express (con Puppeteer) su Render usando Docker.

## Perché Docker
Puppeteer richiede librerie di sistema per Chromium. Con Docker le includiamo nell’immagine, evitando errori in runtime.

## Contenuti aggiunti
- `Dockerfile`: immagine Node + librerie Chromium + `npm ci` + avvio `api-server.js`.
- `.dockerignore`: evita di copiare asset inutili.
- `render.yaml`: blueprint per creare il servizio Web su Render. Per piano Free usa filesystem effimero (nessun `disk`).

## Passi
1) Collega il repository a Render
- Su Render: New → Blueprint → collega il repo → seleziona `render.yaml`.

2) Crea il servizio
- Region: scegli vicina (es. Frankfurt)
- Plan: Standard (o superiore) per risorse stabili
- Health check: già configurato su `/health`.
- Storage:
  - Con piano Standard+: blueprint già include un `disk` (5 GB) montato su `/app/reviews` e `REVIEWS_DIR=/app/reviews`.
  - Se vuoi modificare dimensione/path, aggiorna `render.yaml`.

3) Deploy
- Render costruirà l’immagine e avvierà il servizio leggendo `PORT`.
- Verifica:
  - `https://<dominio-render>/health`
  - `https://<dominio-render>/api/info`

4) Note su Puppeteer
- Il `Dockerfile` lascia a Puppeteer il download del suo Chromium in build.
- Se vuoi usare il Chromium di sistema, imposta `PUPPETEER_SKIP_DOWNLOAD=true` in build e aggiungi `executablePath` in `mymovies_extractor.js` al `puppeteer.launch`.

5) Persistenza
- Con disco: i file sono persistenti su `/app/reviews` (dimensione configurabile in `render.yaml`).
- Senza disco: imposta `REVIEWS_DIR` su una directory effimera (non consigliato in produzione).

6) Variabili d’ambiente (opzionali)
- `PORT`: gestita da Render automaticamente.
- `NODE_ENV=production` (già impostata).

## Troubleshooting
- Build fallisce per librerie mancanti: aggiorna l’elenco nel `Dockerfile` con dipendenze aggiuntive richieste da Chromium.
- Timeout o crash in scraping: verifica `--no-sandbox` (già presente) e che l’istanza abbia risorse sufficienti.
- 502/Bad Gateway: controlla che l’app legga `process.env.PORT` (già supportato) e che il servizio sia in `Healthy`.

*** Buon deploy! ***
