const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.render('index', { error: null });
});

app.post('/extract', async (req, res) => {
    const { title, year, format } = req.body;
    
    if (!title || !year) {
        return res.render('index', { error: 'Titolo e anno sono obbligatori' });
    }

    try {
        const args = [title, year];
        if (format === 'json') args.push('--json');
        
        const child = spawn('bash', ['bin/mymovies', ...args]);
        let output = '';
        let error = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            error += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = format === 'json' ? JSON.parse(output) : output;
                    res.render('result', { result, title, year, format });
                } catch (parseError) {
                    res.render('result', { result: output, title, year, format });
                }
            } else {
                res.render('index', { error: `Errore: ${error || 'Processo terminato con errore'}` });
            }
        });
    } catch (err) {
        res.render('index', { error: `Errore interno: ${err.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`🎬 MyMovies Extractor Web App running on http://localhost:${PORT}`);
});