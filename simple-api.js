// Simple HTTP API for AI clients
// Usage: POST https://your-url/extract with {"title": "Film", "year": 2023}

const express = require('express');
const cors = require('cors');
const { extractMovieReview } = require('./mymovies_extractor');

const app = express();
app.use(cors());
app.use(express.json());

// Simple extract endpoint
app.post('/extract', async (req, res) => {
    try {
        const { title, year } = req.body;
        
        if (!title || !year) {
            return res.status(400).json({
                error: 'Missing required fields: title and year'
            });
        }

        const result = await extractMovieReview(title, year);
        
        res.json({
            success: true,
            title,
            year,
            review: result.review?.content || 'No review found',
            author: result.review?.author || 'Unknown',
            date: result.review?.date || 'Unknown',
            url: result.url
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'MyMovies Extractor' });
});

// Usage info
app.get('/', (req, res) => {
    res.json({
        service: 'MyMovies Review Extractor',
        usage: {
            endpoint: 'POST /extract',
            body: { title: 'string', year: 'number' },
            example: 'curl -X POST -H "Content-Type: application/json" -d \'{"title":"Oppenheimer","year":2023}\' https://your-url/extract'
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Simple API running on port ${PORT}`);
});
