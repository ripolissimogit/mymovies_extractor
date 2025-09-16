#!/usr/bin/env node

/**
 * MyMovies API Server
 * REST API per estrazione recensioni da MyMovies.it
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { extractMovieReview } = require('./mymovies_extractor');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Google Cloud Storage setup
let gcs = null;
const GCS_BUCKET = process.env.GCS_BUCKET;
if (GCS_BUCKET) {
    try {
        const { Storage } = require('@google-cloud/storage');
        gcs = new Storage();
        console.log(`✅ Google Cloud Storage inizializzato per bucket: ${GCS_BUCKET}`);
    } catch (error) {
        console.warn('⚠️ Google Cloud Storage non disponibile:', error.message);
    }
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const REVIEWS_DIR = process.env.REVIEWS_DIR || path.join(__dirname, 'reviews');

// Middleware
app.use(express.json());
app.use(cors());

// Rate limiting - 30 richieste per minuto per IP
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 30,
    message: {
        error: 'Too many requests',
        message: 'Limite di 30 richieste per minuto superato'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health'
});

app.use(limiter);

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Swagger UI endpoint
app.get('/api/openapi.html', (req, res) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>MyMovies API - Swagger UI</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({
            url: '/api/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ]
        });
    </script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'MyMovies API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// API Info endpoint
app.get('/api/info', (req, res) => {
    res.json({
        name: 'MyMovies Extractor API',
        version: '1.0.1',
        description: 'REST API per estrazione recensioni da MyMovies.it',
        endpoints: {
            'POST /api/extract': 'Estrae recensione singola',
            'POST /api/extract/batch': 'Estrazione batch multipla',
            'GET /api/reviews': 'Lista recensioni estratte',
            'GET /api/reviews/:filename': 'Download recensione specifica',
            'GET /api/stats': 'Statistiche estrattore',
            'GET /api/openapi.html': 'Swagger UI Documentation'
        },
        rate_limit: '30 richieste per minuto per IP',
        documentation: `${req.protocol}://${req.get('host')}/api/openapi.html`,
        swagger: `${req.protocol}://${req.get('host')}/api/openapi.html`,
        repository: 'https://github.com/ripolissimogit/mymovies_extractor'
    });
});

// Estrazione singola recensione
app.post('/api/extract', async (req, res) => {
    try {
        const { title, year, options = {} } = req.body;

        // Validazione input
        if (!title || !year) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Parametri "title" e "year" obbligatori',
                example: {
                    title: 'Oppenheimer',
                    year: 2023,
                    options: { headless: true, noSave: false }
                }
            });
        }

        if (!Number.isInteger(year) || year < 1900 || year > 2030) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Anno deve essere intero tra 1900 e 2030'
            });
        }

        // Estrai recensione
        const startTime = Date.now();
        const result = await extractMovieReview(title, year, {
            headless: true,
            noSave: options.noSave === true,
            ...options
        });

        const processingTime = Date.now() - startTime;

        if (result.success) {
            res.json({
                success: true,
                data: {
                    title: result.review.title || title,
                    year: year,
                    review: {
                        content: result.review.content,
                        author: result.review.author,
                        date: result.review.date
                    },
                    metadata: {
                        ...result.metadata,
                        processingTime: processingTime,
                        apiVersion: '1.0.0'
                    },
                    url: result.url,
                    filePath: result.filePath || null
                }
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Not Found',
                message: result.error || 'Recensione non trovata',
                url: result.url
            });
        }

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Errore interno del server'
        });
    }
});

// Estrazione batch
app.post('/api/extract/batch', async (req, res) => {
    try {
        const { films, options = {} } = req.body;

        // Validazione input
        if (!Array.isArray(films) || films.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Parametro "films" deve essere array non vuoto',
                example: {
                    films: [
                        { title: 'Oppenheimer', year: 2023 },
                        { title: 'Barbie', year: 2023 }
                    ]
                }
            });
        }

        if (films.length > 10) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Massimo 10 film per richiesta batch'
            });
        }

        const results = [];
        const startTime = Date.now();

        for (let i = 0; i < films.length; i++) {
            const { title, year } = films[i];

            if (!title || !year) {
                results.push({
                    index: i,
                    success: false,
                    error: 'Parametri title/year mancanti',
                    input: { title, year }
                });
                continue;
            }

            try {
                const result = await extractMovieReview(title, year, {
                    headless: true,
                    noSave: options.noSave === true,
                    ...options
                });

                results.push({
                    index: i,
                    success: result.success,
                    data: result.success ? {
                        title: result.review.title || title,
                        year: year,
                        author: result.review.author,
                        contentLength: result.metadata.contentLength,
                        filePath: result.filePath || null
                    } : null,
                    error: result.success ? null : result.error,
                    input: { title, year }
                });

                // Rate limiting interno per batch
                if (i < films.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                results.push({
                    index: i,
                    success: false,
                    error: error.message,
                    input: { title, year }
                });
            }
        }

        const totalTime = Date.now() - startTime;
        const successful = results.filter(r => r.success).length;

        res.json({
            success: true,
            batch: {
                total: films.length,
                successful: successful,
                failed: films.length - successful,
                processingTime: totalTime
            },
            results: results
        });

    } catch (error) {
        console.error('Batch API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Errore interno del server'
        });
    }
});

// Lista recensioni estratte (supporta GCS se configurato)
app.get('/api/reviews', async (req, res) => {
    try {
        if (gcs) {
            const [entries] = await gcs.bucket(GCS_BUCKET).getFiles({ prefix: 'reviews/' });
            const files = entries
                .filter(f => f.name.endsWith('.txt'))
                .map(f => {
                    const file = f.name.split('/').pop();
                    const match = file.match(/^(.+)_\d{4}_review\.txt$/) || file.match(/^(.+?)_(\d{4})_review\.txt$/);
                    const title = match ? match[1].replace(/-/g, ' ') : file;
                    const yearMatch = file.match(/_(\d{4})_review\.txt$/);
                    const year = yearMatch ? parseInt(yearMatch[1]) : null;
                    return {
                        filename: file,
                        title,
                        year,
                        size: Number(f.metadata.size || 0),
                        modified: f.metadata.updated,
                        downloadUrl: `/api/reviews/${file}`
                    };
                })
                .sort((a, b) => new Date(b.modified) - new Date(a.modified));
            return res.json({ reviews: files, total: files.length });
        }

        const reviewsDir = REVIEWS_DIR;
        if (!fs.existsSync(reviewsDir)) {
            return res.json({ reviews: [], total: 0 });
        }
        const files = fs.readdirSync(reviewsDir)
            .filter(file => file.endsWith('.txt'))
            .map(file => {
                const filePath = path.join(reviewsDir, file);
                const stats = fs.statSync(filePath);
                const match = file.match(/^(.+?)_(\d{4})_review\.txt$/);
                const title = match ? match[1].replace(/-/g, ' ') : file;
                const year = match ? parseInt(match[2]) : null;
                return {
                    filename: file,
                    title,
                    year,
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                    downloadUrl: `/api/reviews/${file}`
                };
            })
            .sort((a, b) => new Date(b.modified) - new Date(a.modified));

        res.json({ reviews: files, total: files.length });

    } catch (error) {
        console.error('Reviews list error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Errore nel recupero lista recensioni'
        });
    }
});

// Download recensione specifica
// Download recensione specifica (supporta GCS se configurato)
app.get('/api/reviews/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;

        // Validazione nome file per sicurezza
        if (!/^[a-z0-9_-]+\.txt$/i.test(filename)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Nome file non valido'
            });
        }

        const filePath = path.join(REVIEWS_DIR, filename);

        // Determina formato output
        const format = req.query.format || 'text';

        if (format === 'json') {
            // Leggi e parsa il file per JSON
            let content = '';
            if (gcs) {
                const remotePath = `reviews/${filename}`;
                const [buf] = await gcs.bucket(GCS_BUCKET).file(remotePath).download();
                content = buf.toString('utf8');
            } else {
                if (!fs.existsSync(filePath)) {
                    return res.status(404).json({ error: 'Not Found', message: 'Recensione non trovata' });
                }
                content = fs.readFileSync(filePath, 'utf8');
            }

            // Parse semplice del contenuto
            const lines = content.split('\n');
            const titleLine = lines.find(line => line.includes('(') && line.includes(')'));
            const authorLine = lines.find(line => line.startsWith('Autore:'));
            const dateLine = lines.find(line => line.startsWith('Data:'));

            const reviewStartIndex = lines.findIndex(line => line.includes('RECENSIONE:')) + 2;
            const reviewEndIndex = lines.findIndex((line, index) =>
                index > reviewStartIndex && line.includes('================================================================================')
            );

            const reviewContent = reviewEndIndex > reviewStartIndex ?
                lines.slice(reviewStartIndex, reviewEndIndex).join('\n').trim() : '';

            res.json({
                filename: filename,
                title: titleLine || '',
                author: authorLine ? authorLine.replace('Autore: ', '') : '',
                date: dateLine ? dateLine.replace('Data: ', '') : '',
                content: reviewContent,
                fullText: content
            });
        } else {
            // Ritorna testo plain
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            if (gcs) {
                const remotePath = `reviews/${filename}`;
                const [buf] = await gcs.bucket(GCS_BUCKET).file(remotePath).download();
                return res.send(buf.toString('utf8'));
            }
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Not Found', message: 'Recensione non trovata' });
            }
            return res.sendFile(filePath);
        }

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Errore nel download della recensione'
        });
    }
});

// Statistiche
app.get('/api/stats', (req, res) => {
    try {
        const reviewsDir = REVIEWS_DIR;

        if (!fs.existsSync(reviewsDir)) {
            return res.json({
                totalFiles: 0,
                totalSize: 0,
                averageSize: 0,
                oldestReview: null,
                newestReview: null
            });
        }

        const files = fs.readdirSync(reviewsDir)
            .filter(file => file.endsWith('.txt'))
            .map(file => {
                const filePath = path.join(reviewsDir, file);
                const stats = fs.statSync(filePath);
                return {
                    file: file,
                    size: stats.size,
                    modified: stats.mtime
                };
            });

        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const averageSize = files.length > 0 ? Math.round(totalSize / files.length) : 0;

        files.sort((a, b) => a.modified - b.modified);
        const oldestReview = files.length > 0 ? files[0].file : null;
        const newestReview = files.length > 0 ? files[files.length - 1].file : null;

        res.json({
            totalFiles: files.length,
            totalSize: totalSize,
            averageSize: averageSize,
            oldestReview: oldestReview,
            newestReview: newestReview,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Errore nel recupero statistiche'
        });
    }
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
    const docs = `
# MyMovies Extractor API Documentation

## Base URL
\`http://localhost:3000\`

## Rate Limiting
- 30 richieste per minuto per IP
- Headers di risposta includono limite e reset time

## Endpoints

### POST /api/extract
Estrae una singola recensione

**Body:**
\`\`\`json
{
    "title": "Oppenheimer",
    "year": 2023,
    "options": {
        "noSave": false
    }
}
\`\`\`

**Response:**
\`\`\`json
{
    "success": true,
    "data": {
        "title": "Oppenheimer",
        "year": 2023,
        "review": {
            "content": "...",
            "author": "Andrea Fornasiero",
            "date": "domenica 23 luglio 2023"
        },
        "metadata": {
            "contentLength": 6444,
            "processingTime": 4250
        }
    }
}
\`\`\`

### POST /api/extract/batch
Estrazione multipla (massimo 10 film)

**Body:**
\`\`\`json
{
    "films": [
        { "title": "Oppenheimer", "year": 2023 },
        { "title": "Barbie", "year": 2023 }
    ]
}
\`\`\`

### GET /api/reviews
Lista tutte le recensioni estratte

### GET /api/reviews/:filename
Download recensione specifica
- Query param: \`format=json\` per output JSON

### GET /api/stats
Statistiche dell'estrattore

## Error Handling
Tutti gli errori seguono il formato:
\`\`\`json
{
    "success": false,
    "error": "Error Type",
    "message": "Descrizione errore"
}
\`\`\`

## Status Codes
- 200: Success
- 400: Bad Request (parametri mancanti/invalidi)
- 404: Not Found (recensione non trovata)
- 429: Too Many Requests (rate limit superato)
- 500: Internal Server Error
`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(docs);
});

// OpenAPI JSON endpoint
app.get('/api/openapi.json', (req, res) => {
    try {
        const specPath = path.join(__dirname, 'openapi.json');
        if (!fs.existsSync(specPath)) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'OpenAPI spec non trovata'
            });
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        const data = fs.readFileSync(specPath, 'utf8');
        res.send(data);
    } catch (error) {
        console.error('OpenAPI serve error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Errore nel servire la specifica OpenAPI'
        });
    }
});

// JSON-RPC MCP endpoint for Claude Desktop
app.post('/mcp-jsonrpc', express.json(), async (req, res) => {
    const { id, method, params } = req.body || {};
    
    try {
        let result;
        
        switch (method) {
            case 'initialize':
                result = {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'mymovies-api', version: '1.0.1' }
                };
                break;
                
            case 'tools/list':
                result = {
                    tools: [
                        {
                            name: 'extract_movie_review',
                            description: 'Extract movie review from MyMovies.it',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string' },
                                    year: { type: 'number' }
                                },
                                required: ['title', 'year']
                            }
                        }
                    ]
                };
                break;
                
            case 'tools/call':
                if (params?.name === 'extract_movie_review') {
                    const { title, year } = params.arguments || {};
                    const extractResult = await extractMovieReview(title, year);
                    result = {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(extractResult, null, 2)
                        }]
                    };
                } else {
                    throw new Error('Unknown tool');
                }
                break;
                
            default:
                throw new Error('Unknown method');
        }
        
        res.json({ jsonrpc: '2.0', id, result });
    } catch (error) {
        res.json({ 
            jsonrpc: '2.0', 
            id, 
            error: { code: -32603, message: error.message } 
        });
    }
});

(() => {
    const clients = new Set();

    function getBaseUrl(req) {
        if (process.env.API_BASE_URL) return process.env.API_BASE_URL;
        const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
        const host = req.headers['x-forwarded-host'] || req.get('host');
        return `${proto}://${host}`;
    }

    function httpCall(method, urlStr, body) {
        return new Promise((resolve, reject) => {
            const url = new URL(urlStr);
            const mod = url.protocol === 'https:' ? https : http;
            const data = body ? Buffer.from(JSON.stringify(body)) : null;
            const req = mod.request(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(data ? { 'Content-Length': String(data.length) } : {})
                }
            }, (resp) => {
                let chunks = '';
                resp.on('data', c => chunks += c);
                resp.on('end', () => {
                    if (resp.statusCode >= 200 && resp.statusCode < 300) {
                        try { resolve(JSON.parse(chunks)); } catch { resolve(chunks); }
                    } else {
                        reject(new Error(`HTTP ${resp.statusCode}: ${chunks}`));
                    }
                });
            });
            req.on('error', reject);
            if (data) req.write(data);
            req.end();
        });
    }

    // Open SSE stream
    app.get('/mcp', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders && res.flushHeaders();

        clients.add(res);
        const hello = { type: 'ready', tools: [
            { name: 'checkServerHealth', params: {}, description: 'Check API server health status' },
            { name: 'getApiInformation', params: {}, description: 'Get API information and available endpoints' },
            { name: 'listApiReviews', params: {}, description: 'List all extracted movie reviews' },
            { 
                name: 'extractSingleReview', 
                params: { title: 'string', year: 'number', options: 'object?' },
                description: 'Extract movie review with detailed logs, metadata, and structured output including processing time, content stats, and storage info'
            }
        ]};
        res.write(`data: ${JSON.stringify(hello)}\n\n`);

        req.on('close', () => {
            clients.delete(res);
            try { res.end(); } catch {}
        });
    });

    // Accept tool calls
    app.post('/mcp', express.json(), async (req, res) => {
        const { id, method, params } = req.body || {};
        res.json({ ok: true }); // immediate ack to caller

        const msg = { id, method };
        try {
            const base = getBaseUrl(req);
            let result;
            if (method === 'checkServerHealth') {
                result = await httpCall('GET', `${base}/health`);
            } else if (method === 'getApiInformation') {
                result = await httpCall('GET', `${base}/api/info`);
            } else if (method === 'listApiReviews') {
                result = await httpCall('GET', `${base}/api/reviews`);
            } else if (method === 'extractSingleReview') {
                const { title, year, options } = params || {};
                const extractResult = await httpCall('POST', `${base}/api/extract`, { title, year, options });
                
                // Enhance result with structured logging info
                result = {
                    ...extractResult,
                    mcpEnhanced: true,
                    extractionSummary: {
                        film: `${extractResult.data?.title || title} (${extractResult.data?.year || year})`,
                        contentLength: extractResult.data?.metadata?.contentLength || 0,
                        wordCount: extractResult.data?.metadata?.wordCount || 0,
                        processingTime: `${(extractResult.data?.metadata?.processingTime || 0) / 1000}s`,
                        author: extractResult.data?.review?.author || 'N/A',
                        date: extractResult.data?.review?.date || 'N/A',
                        extractionMethod: extractResult.data?.metadata?.extractionMethod || 'N/A',
                        cloudStoragePath: extractResult.data?.filePath || 'Not saved'
                    },
                    logs: [
                        `🎬 Extracting review for: ${title} (${year})`,
                        `📊 Content: ${extractResult.data?.metadata?.contentLength || 0} chars, ${extractResult.data?.metadata?.wordCount || 0} words`,
                        `⏱️ Processing time: ${(extractResult.data?.metadata?.processingTime || 0) / 1000}s`,
                        `👤 Author: ${extractResult.data?.review?.author || 'N/A'}`,
                        `📅 Date: ${extractResult.data?.review?.date || 'N/A'}`,
                        `💾 Storage: ${extractResult.data?.filePath ? 'Saved to Cloud Storage' : 'Local only'}`,
                        `✅ Extraction completed successfully`
                    ]
                };
            } else {
                throw new Error(`Unknown method: ${method}`);
            }
            msg.result = result;
        } catch (error) {
            msg.error = { message: error.message };
        }
        for (const sse of clients) {
            try { sse.write(`data: ${JSON.stringify(msg)}\n\n`); } catch {}
        }
    });
})();

// Swagger UI (minimal) to view OpenAPI spec
app.get('/api/openapi.html', (req, res) => {
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>OpenAPI Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        SwaggerUIBundle({
          url: '/api/openapi.json',
          dom_id: '#swagger'
        });
      };
    </script>
  </body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

// Error handler globale
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Errore interno del server'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'Endpoint non trovato',
        availableEndpoints: [
            'GET /health',
            'GET /api/info',
            'POST /api/extract',
            'POST /api/extract/batch',
            'GET /api/reviews',
            'GET /api/reviews/:filename',
            'GET /api/stats',
            'GET /api/docs'
        ]
    });
});

// Avvio server
app.listen(PORT, () => {
    console.log(`MyMovies API Server avviato su porta ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API Info: http://localhost:${PORT}/api/info`);
    console.log(`Documentation: http://localhost:${PORT}/api/docs`);
    // MCP deploy disabilitato: integrazioni esterne rimosse
});

module.exports = app;
