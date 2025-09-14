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

const app = express();
const PORT = process.env.PORT || 3000;

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
});

app.use(limiter);

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${req.method} ${req.path} - ${req.ip}`);
    next();
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
        version: '1.0.0',
        description: 'REST API per estrazione recensioni da MyMovies.it',
        endpoints: {
            'POST /api/extract': 'Estrae recensione singola',
            'POST /api/extract/batch': 'Estrazione batch multipla',
            'GET /api/reviews': 'Lista recensioni estratte',
            'GET /api/reviews/:filename': 'Download recensione specifica',
            'GET /api/stats': 'Statistiche estrattore'
        },
        rate_limit: '30 richieste per minuto per IP',
        documentation: '/api/docs'
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

// Lista recensioni estratte
app.get('/api/reviews', (req, res) => {
    try {
        const reviewsDir = path.join(__dirname, 'reviews');

        if (!fs.existsSync(reviewsDir)) {
            return res.json({
                reviews: [],
                total: 0
            });
        }

        const files = fs.readdirSync(reviewsDir)
            .filter(file => file.endsWith('.txt'))
            .map(file => {
                const filePath = path.join(reviewsDir, file);
                const stats = fs.statSync(filePath);

                // Parse filename per estrarre info
                const match = file.match(/^(.+)_(\d{4})_review\.txt$/);
                const title = match ? match[1].replace(/-/g, ' ') : file;
                const year = match ? parseInt(match[2]) : null;

                return {
                    filename: file,
                    title: title,
                    year: year,
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                    downloadUrl: `/api/reviews/${file}`
                };
            })
            .sort((a, b) => new Date(b.modified) - new Date(a.modified));

        res.json({
            reviews: files,
            total: files.length
        });

    } catch (error) {
        console.error('Reviews list error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Errore nel recupero lista recensioni'
        });
    }
});

// Download recensione specifica
app.get('/api/reviews/:filename', (req, res) => {
    try {
        const filename = req.params.filename;

        // Validazione nome file per sicurezza
        if (!/^[a-z0-9_-]+\.txt$/i.test(filename)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Nome file non valido'
            });
        }

        const filePath = path.join(__dirname, 'reviews', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Recensione non trovata'
            });
        }

        // Determina formato output
        const format = req.query.format || 'text';

        if (format === 'json') {
            // Leggi e parsa il file per JSON
            const content = fs.readFileSync(filePath, 'utf8');

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
            res.sendFile(filePath);
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
        const reviewsDir = path.join(__dirname, 'reviews');

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
});

module.exports = app;