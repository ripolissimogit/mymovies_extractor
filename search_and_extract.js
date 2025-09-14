#!/usr/bin/env node

const puppeteer = require('puppeteer');
const readline = require('readline');
const { extractMovieReview } = require('./mymovies_extractor');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Cerca film su MyMovies usando ricerca diretta
 */
async function searchMoviesOnMyMovies(query) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

        // Cerca su MyMovies
        const searchUrl = `https://www.mymovies.it/ricerca/?q=${encodeURIComponent(query)}`;
        console.log(`🔍 Ricerca su: ${searchUrl}`);

        await page.goto(searchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });

        await page.waitForTimeout(2000);

        // Estrai risultati di ricerca
        const movies = await page.evaluate(() => {
            const results = [];
            const filmElements = document.querySelectorAll('a[href*="/film/"]');

            for (const element of filmElements) {
                const href = element.href;
                const text = element.textContent?.trim();

                // Estrai anno dall'URL se possibile
                const yearMatch = href.match(/\/film\/(\d{4})\//);
                const year = yearMatch ? yearMatch[1] : null;

                // Estrai titolo pulito
                const title = text || href.split('/').pop()?.replace(/-/g, ' ')?.replace('#recensione', '') || 'Titolo sconosciuto';

                if (year && title && title.length > 2) {
                    results.push({
                        title: title,
                        year: year,
                        url: href
                    });
                }
            }

            // Rimuovi duplicati
            const unique = results.filter((movie, index, self) =>
                index === self.findIndex(m => m.title === movie.title && m.year === movie.year)
            );

            return unique.slice(0, 10); // Primi 10 risultati
        });

        return movies;

    } catch (error) {
        console.error('❌ Errore nella ricerca:', error.message);
        return [];
    } finally {
        await browser.close();
    }
}

/**
 * Mostra lista film formattata
 */
function printMovieList(movies) {
    console.log('\n' + '='.repeat(80));
    console.log('🎬 RISULTATI RICERCA SU MYMOVIES.IT');
    console.log('='.repeat(80));

    movies.forEach((movie, index) => {
        console.log(`\n${index + 1}. 📽️  ${movie.title} (${movie.year})`);
    });

    console.log('\n' + '='.repeat(80));
}

/**
 * Ottiene scelta utente
 */
function getUserChoice(movies) {
    return new Promise((resolve) => {
        const ask = () => {
            rl.question(`\n🎯 Scegli film (1-${movies.length}) o 'q' per uscire: `, (answer) => {
                const choice = answer.trim().toLowerCase();

                if (choice === 'q' || choice === 'quit') {
                    resolve(null);
                    return;
                }

                const num = parseInt(choice);
                if (num >= 1 && num <= movies.length) {
                    resolve(num - 1); // Return 0-based index
                    return;
                }

                console.log(`❌ Inserisci un numero tra 1 e ${movies.length} o 'q' per uscire`);
                ask();
            });
        };
        ask();
    });
}

/**
 * Conferma estrazione
 */
function confirmExtraction(movie) {
    return new Promise((resolve) => {
        rl.question(`\n🚀 Vuoi estrarre la recensione di "${movie.title} (${movie.year})"? (s/n): `, (answer) => {
            const confirm = answer.trim().toLowerCase();
            resolve(confirm === 's' || confirm === 'si' || confirm === 'y' || confirm === 'yes');
        });
    });
}

/**
 * Funzione principale
 */
async function main() {
    console.log('🎬 MyMovies Search & Extract');
    console.log('='.repeat(50));

    try {
        while (true) {
            // Input ricerca
            const query = await new Promise((resolve) => {
                rl.question('\n🔍 Cerca film (o "quit" per uscire): ', resolve);
            });

            if (query.toLowerCase() === 'quit' || query.toLowerCase() === 'q') {
                console.log('👋 Arrivederci!');
                break;
            }

            if (!query.trim()) {
                console.log('❌ Inserisci un titolo da cercare');
                continue;
            }

            console.log(`\n🔍 Ricerca "${query}" su MyMovies.it...`);

            // Cerca film
            const movies = await searchMoviesOnMyMovies(query);

            if (movies.length === 0) {
                console.log('❌ Nessun film trovato. Prova con un altro titolo.');
                continue;
            }

            // Mostra risultati
            printMovieList(movies);

            // Scelta utente
            const choiceIdx = await getUserChoice(movies);

            if (choiceIdx === null) {
                continue;
            }

            const selectedMovie = movies[choiceIdx];
            console.log(`\n🎯 Hai scelto: ${selectedMovie.title} (${selectedMovie.year})`);

            // Conferma estrazione
            const shouldExtract = await confirmExtraction(selectedMovie);

            if (shouldExtract) {
                console.log(`\n⏳ Estrazione recensione...`);
                console.log('📝 Questo potrebbe richiedere 30-60 secondi...');

                // Estrai recensione
                try {
                    const result = await extractMovieReview(selectedMovie.title, selectedMovie.year);

                    if (result.success) {
                        console.log('\n🎉 ESTRAZIONE COMPLETATA!');
                        console.log(`📽️  Film: ${result.review.title} (${selectedMovie.year})`);
                        console.log(`👤 Autore: ${result.review.author || 'N/A'}`);
                        console.log(`📅 Data: ${result.review.date || 'N/A'}`);
                        console.log(`📏 Lunghezza: ${result.metadata.contentLength} caratteri`);
                        console.log(`⏱️  Tempo: ${result.metadata.processingTime}ms`);
                        console.log('✨ Recensione estratta con successo!');
                    } else {
                        console.log(`\n❌ Errore estrazione: ${result.error}`);
                    }
                } catch (error) {
                    console.log(`\n❌ Errore durante l'estrazione: ${error.message}`);
                }
            }

            console.log('\n' + '='.repeat(50));
        }
    } catch (error) {
        console.log(`\n💥 Errore imprevisto: ${error.message}`);
    } finally {
        rl.close();
    }
}

// Esegui se chiamato direttamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { searchMoviesOnMyMovies };