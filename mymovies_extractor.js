#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

// Directory recensioni configurabile (per hosting con filesystem effimero)
const REVIEWS_DIR = process.env.REVIEWS_DIR || path.join(__dirname, 'reviews');
const GCS_BUCKET = process.env.GCS_BUCKET || null;
let gcs = null;
if (GCS_BUCKET) {
    try {
        gcs = new Storage();
        console.log('GCS abilitato, bucket:', GCS_BUCKET);
    } catch (e) {
        console.warn('Impossibile inizializzare Google Cloud Storage:', e.message);
        gcs = null;
    }
}

/**
 * Normalizza il titolo del film per creare URL MyMovies validi
 */
function normalizeFilmTitle(title) {
    return title
        .toLowerCase()
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõöø]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ýÿ]/g, 'y')
        .replace(/[ñ]/g, 'n')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9\s]/g, '') // Rimuovi caratteri speciali
        .replace(/\s+/g, '-')        // Spazi -> trattini
        .replace(/^-+|-+$/g, '');    // Rimuovi trattini all'inizio/fine
}

/**
 * Costruisce l'URL MyMovies da titolo e anno
 */
function buildMyMoviesURL(title, year) {
    const normalizedTitle = normalizeFilmTitle(title);
    return `https://www.mymovies.it/film/${year}/${normalizedTitle}/#recensione`;
}

/**
 * Estrae metadati della recensione dall'HTML
 */
function extractMetadata(html) {
    const metadata = {
        author: null,
        date: null,
        title: null
    };
    
    // Pattern per autore
    const authorPatterns = [
        /Recensione di\s+([^<\n]+)/i,
        /class="autore"[^>]*>([^<]+)/i,
        /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i
    ];
    
    for (const pattern of authorPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            metadata.author = match[1].trim();
            break;
        }
    }
    
    // Pattern per data
    const datePatterns = [
        /(\w+\s+\d{1,2}\s+\w+\s+\d{4})/g, // "domenica 23 luglio 2023"
        /(\d{1,2}\/\d{1,2}\/\d{4})/g,      // "23/07/2023"
        /(\d{1,2}-\d{1,2}-\d{4})/g,       // "23-07-2023"
        /(\w+\s+\d{4})/g                   // "luglio 2023"
    ];
    
    for (const pattern of datePatterns) {
        const matches = html.match(pattern);
        if (matches) {
            // Prendi la data più recente/completa
            const dates = matches.filter(date => 
                date.length > 8 && 
                /\d{4}/.test(date) && 
                !date.includes('Copyright') && 
                !date.includes('2025-') // Evita date future errate
            );
            
            if (dates.length > 0) {
                metadata.date = dates[0].trim();
                break;
            }
        }
    }
    
    // Pattern per titolo film
    const titlePatterns = [
        /<title>([^<]+)\s*-\s*Film/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
        /name="title"[^>]*content="([^"]+)"/i
    ];
    
    for (const pattern of titlePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            metadata.title = match[1].trim().replace(/\s*-\s*MYmovies\.it.*/, '');
            break;
        }
    }
    
    return metadata;
}

/**
 * Pulisce e valida il contenuto della recensione
 */
function cleanReviewContent(rawContent, metadata) {
    if (!rawContent) return '';
    
    let cleaned = rawContent
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Rimuovi metadata che potrebbero essere incluse nel testo
    if (metadata.author) {
        cleaned = cleaned.replace(new RegExp(`Recensione di\\s+${metadata.author}`, 'gi'), '');
    }
    
    if (metadata.date) {
        cleaned = cleaned.replace(new RegExp(metadata.date, 'gi'), '');
    }
    
    // Rimuovi contenuto non pertinente
    const cleanPatterns = [
        // HTML artifacts all'inizio
        /^[a-z_]+\"?>\s*/i,  // Rimuove "a_lg"> e simili all'inizio
        /&#x[0-9A-F]+;/g,    // Codici HTML hex
        
        // Form di commenti
        /Il tuo commento è stato registrato\.[\s\S]*$/i,
        /Convalida adesso il tuo inserimento\.[\s\S]*$/i,
        
        // Overview aggiuntivi
        /Overview di [^.]+\s+(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)[\s\S]*$/i,
        
        // HTML e artifacts finali
        /<input[^>]*>[\s\S]*$/i,
        /\s*<[^>]*>[\s\S]*$/i,
        
        // Metadata del sito
        /MYmovies\.it/gi,
        /Film \(\d{4}\)/gi,
        
        // Linee separatrici
        /^={10,}$/gm,
        /^-{10,}$/gm
    ];
    
    for (const pattern of cleanPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }
    
    return cleaned.trim();
}

/**
 * Salva recensione con timestamp e log
 */
async function saveReviewWithLog(result) {
    if (!result.success) return null;

    const { title, year } = result.input;
    const timestamp = new Date();
    const timestampStr = timestamp.toLocaleString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    // Normalizza nome file
    const normalizedTitle = normalizeFilmTitle(title);
    const fileName = `${normalizedTitle}_${year}_review.txt`;
    const reviewsDir = REVIEWS_DIR;
    const filePath = path.join(reviewsDir, fileName);

    // Crea directory se non esiste
    if (!fs.existsSync(reviewsDir)) {
        fs.mkdirSync(reviewsDir, { recursive: true });
    }

    // Costruisci contenuto con timestamp e log
    const content = `ESTRATTO IL: ${timestampStr}

${result.review.title || title} (${year})
Autore: ${result.review.author || 'Autore sconosciuto'}
Data: ${result.review.date || 'Data non disponibile'}
Lunghezza: ${result.metadata.contentLength} caratteri

RECENSIONE:
================================================================================
${result.review.content}
================================================================================

LOG ESTRAZIONE:
================================================================================
URL: ${result.url}
Tempo elaborazione: ${result.metadata.processingTime}ms
Metodo estrazione: ${result.metadata.extractionMethod}
Parole: ${result.metadata.wordCount}
File: ${fileName}
Timestamp: ${timestamp.toISOString()}
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
Selettori utilizzati: p.corpo, .corpo, #recensione
Viewport: Default Puppeteer
Lingua: Italiano
================================================================================
`;

    try {
        if (gcs) {
            const bucket = gcs.bucket(GCS_BUCKET);
            const remotePath = `reviews/${fileName}`;
            await bucket.file(remotePath).save(content, { contentType: 'text/plain; charset=utf-8' });
            console.log('File salvato su GCS:', `gs://${GCS_BUCKET}/${remotePath}`);
            return `gs://${GCS_BUCKET}/${remotePath}`;
        } else {
            fs.writeFileSync(filePath, content, 'utf8');
            return filePath;
        }
    } catch (error) {
        console.error('❌ Errore salvataggio:', error.message);
        return null;
    }
}


/**
 * Funzione principale per estrarre recensione
 */
async function extractMovieReview(title, year, options = {}) {
    const startTime = Date.now();
    const result = {
        success: false,
        input: { title, year },
        url: null,
        review: {
            content: '',
            author: null,
            date: null,
            title: null
        },
        metadata: {
            extractionMethod: null,
            contentLength: 0,
            wordCount: 0,
            processingTime: 0
        },
        error: null
    };
    
    const defaultArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
    const extraArgs = process.env.PUPPETEER_ARGS
        ? process.env.PUPPETEER_ARGS.split(/\s+/).filter(Boolean)
        : [];
    const launchOptions = {
        headless: options.headless !== false,
        args: [...defaultArgs, ...extraArgs]
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    console.log('Puppeteer launching with:', {
        executablePath: launchOptions.executablePath || 'bundled',
        args: launchOptions.args
    });
    const browser = await puppeteer.launch(launchOptions);
    
    try {
        const page = await browser.newPage();
        
        // Costruisci URL
        const url = buildMyMoviesURL(title, year);
        result.url = url;
        
        console.log(`Estrazione recensione: "${title}" (${year})`);
        console.log(`URL: ${url}`);
        
        let fullHTML = '';
        
        // Intercetta HTML completo
        page.on('response', async (response) => {
            if (response.url().includes('mymovies.it/film') && 
                response.headers()['content-type']?.includes('text/html')) {
                try {
                    fullHTML = await response.text();
                } catch (e) {
                    console.log('ATTENZIONE: Errore cattura HTML:', e.message);
                }
            }
        });
        
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        
        // Naviga alla pagina
        console.log('Navigating to:', url);
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 20000
        });
        console.log('Navigation done');
        
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
        
        // Estrai metadati
        let metadata = { author: null, date: null, title: null };
        if (fullHTML) {
            metadata = extractMetadata(fullHTML);
            console.log('Metadata estratti:', metadata);
        }
        
        // Estrai contenuto recensione
        let reviewContent = '';
        let extractionMethod = '';
        
        // Metodo 1: HTML Response
        if (fullHTML) {
            const patterns = [
                '<p class="corpo">',
                'class="corpo"'
            ];
            
            for (const pattern of patterns) {
                const index = fullHTML.indexOf(pattern);
                if (index !== -1) {
                    const blockStart = Math.max(0, index - 200);
                    const blockEnd = Math.min(fullHTML.length, index + 8000);
                    const candidate = fullHTML.substring(blockStart, blockEnd);
                    
                    const cleaned = cleanReviewContent(candidate, metadata);
                    if (cleaned.length > reviewContent.length && cleaned.length > 200) {
                        reviewContent = cleaned;
                        extractionMethod = 'HTML_RESPONSE';
                        break;
                    }
                }
            }
        }
        
        // Metodo 2: DOM Fallback
        if (!reviewContent || reviewContent.length < 200) {
            const domContent = await page.evaluate(() => {
                const recensioneEl = document.getElementById('recensione');
                if (!recensioneEl) return null;
                
                const selectors = ['p.corpo', '.corpo', 'p'];
                let bestContent = '';
                
                for (const selector of selectors) {
                    const elements = recensioneEl.querySelectorAll(selector);
                    for (const el of elements) {
                        const text = el.innerText || '';
                        if (text.length > bestContent.length && text.length > 100) {
                            bestContent = text;
                        }
                    }
                }
                
                return bestContent || recensioneEl.innerText || '';
            });
            
            if (domContent && domContent.length > reviewContent.length) {
                reviewContent = cleanReviewContent(domContent, metadata);
                extractionMethod = 'DOM_FALLBACK';
            }
        }
        
        // Compila risultato
        if (reviewContent && reviewContent.length > 50) {
            result.success = true;
            result.review = {
                content: reviewContent,
                author: metadata.author,
                date: metadata.date,
                title: metadata.title || title
            };
            
            result.metadata = {
                extractionMethod,
                contentLength: reviewContent.length,
                wordCount: reviewContent.split(/\s+/).length,
                processingTime: Date.now() - startTime
            };
            
            
            console.log(`✅ Successo! ${reviewContent.length} caratteri estratti`);

            // Salva con timestamp e log (sempre, a meno che non sia specificato --no-save)
            if (!options.noSave) {
                const savedPath = await saveReviewWithLog(result);
                if (savedPath) {
                    console.log(`File salvato: ${path.basename(savedPath)}`);
                    result.filePath = savedPath;
                }
            }

        } else {
            result.error = 'Recensione non trovata o troppo breve';
            console.log('❌ Recensione non trovata');
        }
        
    } catch (error) {
        result.error = error.message;
        console.error('💥 Errore:', error.message);
    } finally {
        await browser.close();
        result.metadata.processingTime = Date.now() - startTime;
    }
    
    return result;
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node mymovies_extractor.js "Titolo Film" ANNO [--json] [--verbose] [--no-save]');
        console.log('Example: node mymovies_extractor.js "Oppenheimer" 2023');
        console.log('Options:');
        console.log('  --json      Output in JSON format');
        console.log('  --verbose   Show browser (non-headless mode)');
        console.log('  --no-save   Don\'t save review to file');
        process.exit(1);
    }
    
    const title = args[0];
    const year = parseInt(args[1]);
    const outputJson = args.includes('--json');
    const verbose = args.includes('--verbose');
    const noSave = args.includes('--no-save');
    
    if (!year || year < 1900 || year > 2030) {
        console.error('Errore: Anno non valido');
        process.exit(1);
    }
    
    try {
        const result = await extractMovieReview(title, year, {
            headless: !verbose,
            noSave: noSave
        });
        
        if (outputJson) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            if (result.success) {
                console.log('\n' + '='.repeat(80));
                console.log(`${result.review.title || title} (${year})`);
                console.log('='.repeat(80));
                
                if (result.review.author) {
                    console.log(`Autore: ${result.review.author}`);
                }
                if (result.review.date) {
                    console.log(`Data: ${result.review.date}`);
                }
                
                console.log(`Lunghezza: ${result.metadata.contentLength} caratteri`);
                console.log(`Tempo: ${result.metadata.processingTime}ms`);
                console.log(`Metodo: ${result.metadata.extractionMethod}`);

                console.log('\nRECENSIONE:');
                console.log('-'.repeat(80));
                console.log(result.review.content);
                console.log('-'.repeat(80));
            } else {
                console.log(`ERRORE: ${result.error}`);
                console.log(`URL tentato: ${result.url}`);
            }
        }
        
    } catch (error) {
        console.error('Errore fatale:', error.message);
        process.exit(1);
    }
}

// Export per uso come modulo
module.exports = {
    extractMovieReview,
    buildMyMoviesURL,
    normalizeFilmTitle
};

// Esegui se chiamato direttamente
if (require.main === module) {
    main();
}
