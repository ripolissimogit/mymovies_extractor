const express = require('express');
const path = require('path');
const fs = require('fs');
const { extractMovieReview } = require('./mymovies_extractor');
const { exec } = require('child_process');
const util = require('util');

const app = express();
const PORT = process.env.PORT || 3000;
const execAsync = util.promisify(exec);

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/reviews', express.static(path.join(__dirname, 'reviews')));

// API Routes

// Get all extracted reviews
app.get('/api/reviews', (req, res) => {
    const reviewsDir = path.join(__dirname, 'reviews');
    
    if (!fs.existsSync(reviewsDir)) {
        return res.json({ reviews: [], total: 0 });
    }
    
    try {
        const files = fs.readdirSync(reviewsDir)
            .filter(file => file.endsWith('_review.txt'))
            .map(file => {
                const filePath = path.join(reviewsDir, file);
                const stats = fs.statSync(filePath);
                
                // Parse filename to extract title and year
                const match = file.match(/^(.+)_(\d{4})_review\.txt$/);
                const title = match ? match[1].replace(/_/g, ' ') : file;
                const year = match ? match[2] : 'Unknown';
                
                // Read first few lines to get metadata
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n');
                
                let author = 'Unknown';
                let date = 'Unknown';
                let length = 0;
                
                for (const line of lines) {
                    if (line.startsWith('Autore:')) {
                        author = line.replace('Autore:', '').trim();
                    } else if (line.startsWith('Data:')) {
                        date = line.replace('Data:', '').trim();
                    } else if (line.startsWith('Lunghezza:')) {
                        const lengthMatch = line.match(/(\d+)/);
                        length = lengthMatch ? parseInt(lengthMatch[1]) : 0;
                    }
                }
                
                return {
                    filename: file,
                    title,
                    year,
                    author,
                    date,
                    length,
                    size: stats.size,
                    modified: stats.mtime,
                    url: `/reviews/${file}`
                };
            })
            .sort((a, b) => new Date(b.modified) - new Date(a.modified));
        
        res.json({
            reviews: files,
            total: files.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific review content
app.get('/api/reviews/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'reviews', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Review not found' });
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        res.json({ content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Extract new review
app.post('/api/extract', async (req, res) => {
    const { title, year } = req.body;
    
    if (!title || !year) {
        return res.status(400).json({ error: 'Title and year are required' });
    }
    
    try {
        console.log(`Starting extraction for: ${title} (${year})`);
        const result = await extractMovieReview(title, year, { headless: true });
        
        res.json(result);
    } catch (error) {
        console.error('Extraction error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search movies using TMDB
app.post('/api/search', async (req, res) => {
    const { query } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }
    
    try {
        // Use Python search script
        const { stdout } = await execAsync(`python3 -c "
import sys
sys.path.append('.')
from search_and_extract import TMDBMovieSearch
import json
import os

api_key = os.getenv('TMDB_API_KEY')
if not api_key:
    print(json.dumps({'error': 'TMDB_API_KEY not set'}))
    sys.exit(1)

tmdb = TMDBMovieSearch(api_key)
results = tmdb.search_movies('${query.replace(/'/g, "\\'")}', 10)
print(json.dumps(results))
"`);
        
        const results = JSON.parse(stdout);
        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed. Make sure TMDB_API_KEY is set.' });
    }
});

// Get extraction statistics
app.get('/api/stats', (req, res) => {
    const reviewsDir = path.join(__dirname, 'reviews');
    
    if (!fs.existsSync(reviewsDir)) {
        return res.json({
            totalReviews: 0,
            totalSize: 0,
            averageLength: 0,
            recentExtractions: []
        });
    }
    
    try {
        const files = fs.readdirSync(reviewsDir)
            .filter(file => file.endsWith('_review.txt'))
            .map(file => {
                const filePath = path.join(reviewsDir, file);
                const stats = fs.statSync(filePath);
                return { file, size: stats.size, modified: stats.mtime };
            });
        
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        const averageLength = files.length > 0 ? Math.round(totalSize / files.length) : 0;
        
        const recentExtractions = files
            .sort((a, b) => new Date(b.modified) - new Date(a.modified))
            .slice(0, 5)
            .map(f => ({
                filename: f.file,
                size: f.size,
                modified: f.modified
            }));
        
        res.json({
            totalReviews: files.length,
            totalSize,
            averageLength,
            recentExtractions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🎬 MyMovies Extractor Server running on http://localhost:${PORT}`);
    console.log(`📁 Reviews directory: ${path.join(__dirname, 'reviews')}`);
    console.log(`🔧 API endpoints available at /api/*`);
});

module.exports = app;