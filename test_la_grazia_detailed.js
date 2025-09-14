#!/usr/bin/env node

/**
 * Test Dettagliato: La Grazia (2025)
 * Output completo: siti, URL, info estratte, recensioni
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { extractMovieReview } = require('./mymovies_extractor');

class ExaDetailedClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        
        this.italianCinemaSites = [
            'ilpost.it', 'corriere.it', 'repubblica.it',
            'sentieriselvaggi.it', 'cinefacts.it', 'quinlan.it',
            'movieplayer.it', 'badtaste.it', 'cinematographe.it',
            'comingsoon.it', 'taxidrivers.it', 'lospaziobianco.it'
        ];
    }
    
    async makeRequest(endpoint, data) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(data);
            
            const options = {
                hostname: 'api.exa.ai',
                path: endpoint,
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(20000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.write(postData);
            req.end();
        });
    }
    
    async searchWithDetails(title, year) {
        console.log(`🇮🇹 RICERCA DETTAGLIATA: "${title}" (${year})`);
        console.log('='.repeat(70));
        
        const queries = [
            `${title} recensione film ${year}`,
            `cosa pensano i critici italiani di ${title}`,
            `${title} ${year} critica cinematografica italiana`
        ];
        
        const allResults = [];
        
        for (const [index, query] of queries.entries()) {
            console.log(`\n📍 QUERY ${index + 1}: "${query}"`);
            console.log('-'.repeat(50));
            
            try {
                const searchResult = await this.makeRequest('/search', {
                    query,
                    type: 'keyword',
                    includeDomains: this.italianCinemaSites,
                    numResults: 6
                });
                
                if (searchResult.results && searchResult.results.length > 0) {
                    console.log(`✅ Trovati ${searchResult.results.length} risultati:`);
                    
                    searchResult.results.forEach((result, i) => {
                        const domain = new URL(result.url).hostname;
                        console.log(`  ${i+1}. ${domain}`);
                        console.log(`     📄 ${result.title}`);
                        console.log(`     🔗 ${result.url}`);
                    });
                    
                    // Aggiungi metadata query
                    const resultsWithQuery = searchResult.results.map(r => ({
                        ...r,
                        queryIndex: index + 1,
                        queryText: query
                    }));
                    
                    allResults.push(...resultsWithQuery);
                } else {
                    console.log('❌ Nessun risultato');
                }
                
            } catch (error) {
                console.log(`❌ Errore query: ${error.message}`);
            }
            
            // Pausa tra query
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Dedup results
        const uniqueResults = this.deduplicateByUrl(allResults);
        console.log(`\n📊 RIEPILOGO RICERCA:`);
        console.log(`   🔍 Query eseguite: ${queries.length}`);
        console.log(`   📄 Risultati totali: ${allResults.length}`);
        console.log(`   ✨ Risultati unici: ${uniqueResults.length}`);
        
        return uniqueResults;
    }
    
    deduplicateByUrl(results) {
        const seen = new Set();
        return results.filter(result => {
            if (seen.has(result.url)) return false;
            seen.add(result.url);
            return true;
        });
    }
    
    async extractDetailedContents(results) {
        console.log(`\n📄 ESTRAZIONE CONTENUTI:`);
        console.log('='.repeat(70));
        
        const reviews = [];
        
        // Process individualmente per mostrare dettagli
        for (const [index, result] of results.entries()) {
            console.log(`\n🔍 ${index + 1}/${results.length}: ${new URL(result.url).hostname}`);
            console.log(`📄 Titolo: ${result.title}`);
            console.log(`🔗 URL: ${result.url}`);
            console.log(`📋 Da query: "${result.queryText}"`);
            
            try {
                const contentResult = await this.makeRequest('/contents', {
                    ids: [result.url],
                    text: true
                });
                
                if (contentResult.results && contentResult.results[0]?.text) {
                    const content = contentResult.results[0];
                    const rawLength = content.text.length;
                    
                    console.log(`✅ Contenuto estratto: ${rawLength} caratteri`);
                    
                    // Clean content
                    const cleaned = this.cleanItalianContent(content.text);
                    console.log(`🧹 Dopo pulizia: ${cleaned.length} caratteri`);
                    
                    // Validate as review
                    const isValid = this.isValidReview(cleaned, result.queryText);
                    console.log(`🎯 È una recensione: ${isValid ? '✅' : '❌'}`);
                    
                    if (isValid) {
                        const confidence = this.calculateConfidence(cleaned);
                        console.log(`📊 Confidence: ${Math.round(confidence * 100)}%`);
                        
                        reviews.push({
                            source: new URL(result.url).hostname,
                            url: result.url,
                            title: content.title || result.title,
                            content: cleaned,
                            metadata: {
                                rawLength,
                                cleanedLength: cleaned.length,
                                confidence,
                                querySource: result.queryText,
                                queryIndex: result.queryIndex
                            }
                        });
                        
                        // Mostra preview
                        console.log(`📖 Preview: ${cleaned.substring(0, 150)}...`);
                    }
                } else {
                    console.log(`❌ Nessun contenuto testuale`);
                }
            } catch (error) {
                console.log(`❌ Errore estrazione: ${error.message}`);
            }
            
            // Pausa tra estrazioni
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        return reviews.sort((a, b) => b.metadata.confidence - a.metadata.confidence);
    }
    
    cleanItalianContent(rawText) {
        return rawText
            .replace(/\[.*?\]/g, '')
            .replace(/^(Home|Menu|Cerca|Accedi|Login|Cookie|Privacy|Pubblicità).*$/gim, '')
            .replace(/^\s*\d+\s*\/\s*\d+\s*$/gm, '')
            .replace(/^\s*(Condividi|Commenta|Like).*$/gim, '')
            .split('\n')
            .filter(line => {
                const trimmed = line.trim();
                return trimmed.length > 60 || 
                       /film|cinema|regist|attore|trama|storia|critica/i.test(trimmed);
            })
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    
    isValidReview(text, query) {
        if (text.length < 200) return false;
        
        const hasFilmTerms = /film|cinema|regist|attore|protagonista|trama|storia|regia/i.test(text);
        const sentences = text.split(/[.!?]/).length;
        
        return hasFilmTerms && sentences > 8;
    }
    
    calculateConfidence(text) {
        let score = 0;
        
        if (text.length > 2000) score += 0.4;
        else if (text.length > 1000) score += 0.3;
        else if (text.length > 500) score += 0.2;
        
        const italianTerms = ['regista', 'attore', 'protagonista', 'trama', 'regia', 'recitazione'];
        const foundTerms = italianTerms.filter(term => text.toLowerCase().includes(term)).length;
        score += foundTerms * 0.1;
        
        return Math.min(score, 1.0);
    }
}

async function saveReviewsToFiles(title, year, myMoviesResult, exaReviews) {
    console.log(`\n💾 SALVATAGGIO RECENSIONI IN FILE...`);
    console.log('-'.repeat(50));
    
    // Create reviews directory
    const reviewsDir = path.join(__dirname, 'reviews');
    if (!fs.existsSync(reviewsDir)) {
        fs.mkdirSync(reviewsDir);
    }
    
    const filmDir = path.join(reviewsDir, `${title.replace(/\s+/g, '_')}_${year}`);
    if (!fs.existsSync(filmDir)) {
        fs.mkdirSync(filmDir);
    }
    
    // Save MyMovies review if exists
    if (myMoviesResult && myMoviesResult.success) {
        const myMoviesFile = path.join(filmDir, '01_MyMovies_it.txt');
        const myMoviesContent = `# MYMOVIES.IT - ${title} (${year})

👤 AUTORE: ${myMoviesResult.review.author || 'N/A'}
📅 DATA: ${myMoviesResult.review.date || 'N/A'}
🔗 URL: https://www.mymovies.it/film/${year}/${title.toLowerCase().replace(/\s+/g, '-')}/#recensione
📊 CONFIDENCE: 100% (Precision Source)
📏 LUNGHEZZA: ${myMoviesResult.review.content.length} caratteri

${'='.repeat(80)}
RECENSIONE COMPLETA:
${'='.repeat(80)}

${myMoviesResult.review.content}

${'='.repeat(80)}
METADATA:
${'='.repeat(80)}
- Processing Time: ${myMoviesResult.metadata.processingTime}ms
- Extraction Method: Puppeteer + Anchor Navigation
- Content Quality: Professional Review
`;
        fs.writeFileSync(myMoviesFile, myMoviesContent, 'utf8');
        console.log(`✅ MyMovies salvato: ${myMoviesFile}`);
    }
    
    // Save Exa reviews
    exaReviews.forEach((review, index) => {
        const fileName = `${String(index + 2).padStart(2, '0')}_${review.source.replace(/\./g, '_')}.txt`;
        const filePath = path.join(filmDir, fileName);
        
        const content = `# ${review.source.toUpperCase()} - ${title} (${year})

📄 TITOLO: ${review.title}
🔗 URL: ${review.url}
📊 CONFIDENCE: ${Math.round(review.metadata.confidence * 100)}%
📏 LUNGHEZZA: ${review.metadata.cleanedLength} caratteri
🔍 TROVATO CON QUERY: "${review.metadata.querySource}"

${'='.repeat(80)}
RECENSIONE COMPLETA:
${'='.repeat(80)}

${review.content}

${'='.repeat(80)}
METADATA:
${'='.repeat(80)}
- Raw Length: ${review.metadata.rawLength} caratteri
- Cleaned Length: ${review.metadata.cleanedLength} caratteri
- Confidence Score: ${review.metadata.confidence.toFixed(3)}
- Query Index: ${review.metadata.queryIndex}
- Source Strategy: Italian Discovery via Exa AI
- Content Quality: ${review.metadata.confidence > 0.7 ? 'High' : review.metadata.confidence > 0.5 ? 'Medium' : 'Low'}
`;
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${review.source} salvato: ${fileName}`);
    });
    
    // Create summary file
    const summaryFile = path.join(filmDir, '00_SUMMARY.txt');
    const summaryContent = `# RIEPILOGO RECENSIONI: ${title} (${year})
Data estrazione: ${new Date().toLocaleString('it-IT')}

${'='.repeat(80)}
FONTI TROVATE:
${'='.repeat(80)}

${myMoviesResult && myMoviesResult.success ? `✅ MyMovies.it (Precisione): ${myMoviesResult.review.content.length} caratteri\n` : '❌ MyMovies.it: Non disponibile\n'}
${exaReviews.map((r, i) => `✅ ${r.source} (${Math.round(r.metadata.confidence * 100)}%): ${r.metadata.cleanedLength} caratteri`).join('\n')}

${'='.repeat(80)}
STATISTICHE:
${'='.repeat(80)}
- Recensioni totali: ${(myMoviesResult?.success ? 1 : 0) + exaReviews.length}
- Siti italiani scoperti: ${exaReviews.length}
- Confidence media: ${Math.round(exaReviews.reduce((acc, r) => acc + r.metadata.confidence, 0) / exaReviews.length * 100)}%
- Caratteri totali: ${(myMoviesResult?.success ? myMoviesResult.review.content.length : 0) + exaReviews.reduce((acc, r) => acc + r.metadata.cleanedLength, 0)}

${'='.repeat(80)}
COME LEGGERE LE RECENSIONI:
${'='.repeat(80)}
1. Apri la cartella: reviews/${title.replace(/\s+/g, '_')}_${year}/
2. I file sono ordinati per qualità (01 = migliore)
3. 01_MyMovies_it.txt = recensione professionale garantita
4. Gli altri file = scoperte automatiche da siti italiani
5. Ogni file contiene la recensione completa + metadata

📁 PERCORSO COMPLETO: ${filmDir}
`;
    
    fs.writeFileSync(summaryFile, summaryContent, 'utf8');
    console.log(`✅ Summary salvato: 00_SUMMARY.txt`);
    
    console.log(`\n🎯 TUTTE LE RECENSIONI SALVATE IN:`);
    console.log(`📁 ${filmDir}`);
    console.log(`\n📖 Per leggere le recensioni:`);
    console.log(`   open "${filmDir}"`);
}

async function testLaGraziaDetailed() {
    const title = 'La Grazia';
    const year = 2025;
    const EXA_API_KEY = '6aacfb8a-4ac2-40f4-a43c-0efeee993167';
    
    console.log(`🎬 TEST DETTAGLIATO: "${title}" (${year})`);
    console.log('='.repeat(70));
    
    let myMoviesResult = null;
    
    // Test 1: MyMovies (con gestione errori)
    console.log('\n🎯 MYMOVIES.IT EXTRACTION:');
    console.log('-'.repeat(40));
    
    try {
        console.log('⏳ Tentativo estrazione MyMovies...');
        myMoviesResult = await extractMovieReview(title, year, { 
            headless: true 
        });
        
        if (myMoviesResult.success) {
            console.log(`✅ SUCCESSO MyMovies:`);
            console.log(`   👤 Autore: ${myMoviesResult.review.author || 'N/A'}`);
            console.log(`   📅 Data: ${myMoviesResult.review.date || 'N/A'}`);
            console.log(`   📏 Lunghezza: ${myMoviesResult.review.content.length} caratteri`);
            console.log(`   ⏱️  Tempo: ${myMoviesResult.metadata.processingTime}ms`);
            console.log(`   📖 Preview: ${myMoviesResult.review.content.substring(0, 200)}...`);
        } else {
            console.log(`❌ MyMovies fallito: ${myMoviesResult.error}`);
        }
    } catch (error) {
        console.log(`❌ MyMovies errore: ${error.message}`);
    }
    
    // Test 2: Exa Italia Discovery
    console.log('\n🇮🇹 EXA ITALIA DISCOVERY:');
    console.log('-'.repeat(40));
    
    const exa = new ExaDetailedClient(EXA_API_KEY);
    
    try {
        // Search phase
        const searchResults = await exa.searchWithDetails(title, year);
        
        if (searchResults.length === 0) {
            console.log('❌ Nessun risultato dalla ricerca');
            return;
        }
        
        // Content extraction phase
        const reviews = await exa.extractDetailedContents(searchResults);
        
        // Final summary
        console.log(`\n${'='.repeat(70)}`);
        console.log(`🎯 RISULTATI FINALI: "${title}" (${year})`);
        console.log(`${'='.repeat(70)}`);
        console.log(`📊 Recensioni estratte: ${reviews.length}`);
        
        if (reviews.length > 0) {
            console.log('\n🏆 TOP RECENSIONI (per confidence):');
            
            reviews.forEach((review, index) => {
                console.log(`\n${index + 1}. ${review.source.toUpperCase()}`);
                console.log(`   🔗 ${review.url}`);
                console.log(`   📄 Titolo: ${review.title}`);
                console.log(`   📊 Confidence: ${Math.round(review.metadata.confidence * 100)}%`);
                console.log(`   📏 Lunghezza: ${review.metadata.cleanedLength} caratteri`);
                console.log(`   🔍 Da query: "${review.metadata.querySource}"`);
                console.log(`   📖 RECENSIONE:`);
                console.log(`      ${review.content.substring(0, 300)}...`);
            });
            
            // SAVE TO FILES
            await saveReviewsToFiles(title, year, myMoviesResult, reviews);
        } else {
            console.log('❌ Nessuna recensione valida estratta');
        }
        
    } catch (error) {
        console.log(`❌ Errore Exa: ${error.message}`);
    }
}

testLaGraziaDetailed();