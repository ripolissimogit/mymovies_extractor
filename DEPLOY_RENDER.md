# Deploy su Render (Docker)

Questa guida pubblica l’API Express (con Puppeteer) su Render usando Docker.

## Perché Docker
Puppeteer richiede librerie di sistema per Chromium. Con Docker le includiamo nell’immagine, evitando errori in runtime.

## Contenuti aggiunti
- `Dockerfile`: immagine Node + librerie Chromium + `npm ci` + avvio `api-server.js`.
- `.dockerignore`: evita di copiare asset inutili.
- `render.yaml`: blueprint per creare il servizio Web su Render con disco persistente per `reviews/`.

## Passi
1) Collega il repository a Render
- Su Render: New → Blueprint → collega il repo → seleziona `render.yaml`.

2) Crea il servizio
- Region: scegli vicina (es. Frankfurt)
- Plan: Free o a pagamento (nota: il disco potrebbe richiedere piano a pagamento).
- Health check: già configurato su `/health`.
- Disco: montato su `/app/reviews` (persistenza dei file estratti).

3) Deploy
- Render costruirà l’immagine e avvierà il servizio leggendo `PORT`.
- Verifica:
  - `https://<dominio-render>/health`
  - `https://<dominio-render>/api/info`

4) Note su Puppeteer
- Il `Dockerfile` lascia a Puppeteer il download del suo Chromium in build.
- Se vuoi usare il Chromium di sistema, imposta `PUPPETEER_SKIP_DOWNLOAD=true` in build e aggiungi `executablePath` in `mymovies_extractor.js` al `puppeteer.launch`.

5) Persistenza
- I file di recensione vengono salvati in `reviews/` (montato su disco Render). Se cambi percorso, aggiorna `render.yaml` e `api-server.js` di conseguenza.

6) Variabili d’ambiente (opzionali)
- `PORT`: gestita da Render automaticamente.
- `NODE_ENV=production` (già impostata).

## Troubleshooting
- Build fallisce per librerie mancanti: aggiorna l’elenco nel `Dockerfile` con dipendenze aggiuntive richieste da Chromium.
- Timeout o crash in scraping: verifica `--no-sandbox` (già presente) e che l’istanza abbia risorse sufficienti.
- 502/Bad Gateway: controlla che l’app legga `process.env.PORT` (già supportato) e che il servizio sia in `Healthy`.

*** Buon deploy! ***

