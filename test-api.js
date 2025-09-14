#!/usr/bin/env node

/**
 * Test suite per MyMovies API
 * Testa tutti gli endpoint principali
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const api = axios.create({
    baseURL: API_BASE,
    timeout: 180000 // 3 minuti per le estrazioni
});

class APITester {
    constructor() {
        this.tests = [];
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async test(name, testFn) {
        this.results.total++;
        console.log(`\n🧪 Test: ${name}`);

        try {
            await testFn();
            this.results.passed++;
            console.log(`✅ PASS: ${name}`);
        } catch (error) {
            this.results.failed++;
            this.results.errors.push({ name, error: error.message });
            console.log(`❌ FAIL: ${name}`);
            console.log(`   Error: ${error.message}`);
        }
    }

    async run() {
        console.log('🚀 Avvio test suite API MyMovies\n');

        // Test 1: Health check
        await this.test('Health Check', async () => {
            const response = await api.get('/health');
            if (response.status !== 200) throw new Error(`Status: ${response.status}`);
            if (response.data.status !== 'ok') throw new Error('Status not ok');
            console.log(`   Status: ${response.data.status}, Service: ${response.data.service}`);
        });

        // Test 2: API Info
        await this.test('API Info', async () => {
            const response = await api.get('/api/info');
            if (response.status !== 200) throw new Error(`Status: ${response.status}`);
            if (!response.data.name) throw new Error('Missing API name');
            console.log(`   API: ${response.data.name} v${response.data.version}`);
        });

        // Test 3: Stats
        await this.test('Stats Endpoint', async () => {
            const response = await api.get('/api/stats');
            if (response.status !== 200) throw new Error(`Status: ${response.status}`);
            if (typeof response.data.totalFiles !== 'number') throw new Error('Invalid stats format');
            console.log(`   Total files: ${response.data.totalFiles}, Average size: ${response.data.averageSize} bytes`);
        });

        // Test 4: Reviews List
        await this.test('Reviews List', async () => {
            const response = await api.get('/api/reviews');
            if (response.status !== 200) throw new Error(`Status: ${response.status}`);
            if (!Array.isArray(response.data.reviews)) throw new Error('Reviews not array');
            console.log(`   Found ${response.data.total} reviews`);
        });

        // Test 5: Extract (No Save)
        await this.test('Extract Review (No Save)', async () => {
            const response = await api.post('/api/extract', {
                title: 'Interstellar',
                year: 2014,
                options: { noSave: true }
            });

            if (response.status !== 200) throw new Error(`Status: ${response.status}`);
            if (!response.data.success) throw new Error(`Extraction failed: ${response.data.message}`);
            if (!response.data.data.review.content) throw new Error('No review content');

            console.log(`   Title: ${response.data.data.title}`);
            console.log(`   Author: ${response.data.data.review.author}`);
            console.log(`   Length: ${response.data.data.metadata.contentLength} chars`);
            console.log(`   Processing time: ${response.data.data.metadata.processingTime}ms`);
        });

        // Test 6: Invalid requests
        await this.test('Invalid Request Handling', async () => {
            try {
                await api.post('/api/extract', { title: 'Test' }); // Missing year
                throw new Error('Should have failed with missing year');
            } catch (error) {
                if (error.response?.status !== 400) {
                    throw new Error(`Expected 400, got ${error.response?.status}`);
                }
                console.log(`   Correctly handled invalid request with status 400`);
            }
        });

        // Test 7: Not found film
        await this.test('Not Found Film', async () => {
            try {
                const response = await api.post('/api/extract', {
                    title: 'Film Inesistente Completamente Fake',
                    year: 2025,
                    options: { noSave: true }
                });

                if (response.status === 404 && !response.data.success) {
                    console.log(`   Correctly returned 404 for non-existent film`);
                } else if (response.status === 200 && response.data.success) {
                    throw new Error('Unexpectedly found fake film');
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log(`   Correctly returned 404 for non-existent film`);
                } else {
                    throw error;
                }
            }
        });

        // Test 8: Batch extraction (piccolo test)
        await this.test('Batch Extraction', async () => {
            const response = await api.post('/api/extract/batch', {
                films: [
                    { title: 'Interstellar', year: 2014 },
                    { title: 'Film Fake', year: 2025 }
                ],
                options: { noSave: true }
            });

            if (response.status !== 200) throw new Error(`Status: ${response.status}`);
            if (!response.data.success) throw new Error('Batch failed');
            if (response.data.batch.total !== 2) throw new Error('Wrong total count');

            console.log(`   Batch: ${response.data.batch.successful}/${response.data.batch.total} successful`);
            console.log(`   Processing time: ${response.data.batch.processingTime}ms`);
        });

        // Test 9: Rate limiting (light test)
        await this.test('Rate Limiting Headers', async () => {
            const response = await api.get('/health');
            if (!response.headers['x-ratelimit-limit']) {
                throw new Error('Missing rate limit headers');
            }
            console.log(`   Rate limit: ${response.headers['x-ratelimit-limit']} req/min`);
            console.log(`   Remaining: ${response.headers['x-ratelimit-remaining']}`);
        });

        // Test 10: Documentation
        await this.test('Documentation Endpoint', async () => {
            const response = await api.get('/api/docs');
            if (response.status !== 200) throw new Error(`Status: ${response.status}`);
            if (!response.data.includes('MyMovies Extractor API')) {
                throw new Error('Invalid documentation content');
            }
            console.log(`   Documentation size: ${response.data.length} chars`);
        });

        // Risultati finali
        this.printResults();
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RISULTATI TEST SUITE');
        console.log('='.repeat(60));
        console.log(`Total tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`Success rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);

        if (this.results.errors.length > 0) {
            console.log('\n🚨 ERRORI:');
            this.results.errors.forEach((error, i) => {
                console.log(`${i + 1}. ${error.name}: ${error.error}`);
            });
        }

        console.log('\n' + '='.repeat(60));

        if (this.results.failed === 0) {
            console.log('🎉 Tutti i test sono passati! API completamente funzionante.');
        } else {
            console.log('⚠️  Alcuni test sono falliti. Controllare i log sopra.');
            process.exit(1);
        }
    }
}

// Funzione per testare se il server è attivo
async function waitForServer(maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await api.get('/health');
            console.log('✅ Server API raggiungibile');
            return true;
        } catch (error) {
            console.log(`⏳ Tentativo ${i + 1}/${maxAttempts} - Server non ancora pronto...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    throw new Error('🚨 Server API non raggiungibile dopo ' + maxAttempts + ' tentativi');
}

// Main execution
async function main() {
    try {
        console.log('🔍 Controllo connessione al server API...');
        await waitForServer();

        const tester = new APITester();
        await tester.run();

    } catch (error) {
        console.error('🚨 Errore durante i test:', error.message);
        process.exit(1);
    }
}

// Controlla se questo script è eseguito direttamente
if (require.main === module) {
    main();
}

module.exports = { APITester };