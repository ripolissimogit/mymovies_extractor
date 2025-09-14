#!/usr/bin/env node

// Simulazione per testare il nuovo formato
const { saveReviewWithLog } = require('./mymovies_extractor');

// Dati simulati
const mockResult = {
    success: true,
    input: { title: "Test Film", year: 2023 },
    url: "https://www.mymovies.it/film/2023/test-film/#recensione",
    review: {
        content: "Questa è una recensione di test per verificare il nuovo formato con timestamp e log dettagliati. Il film è molto interessante e ben fatto, con una regia eccellente e interpretazioni convincenti.",
        author: "Mario Rossi",
        date: "lunedì 15 gennaio 2024",
        title: "Test Film"
    },
    metadata: {
        extractionMethod: "HTML_RESPONSE",
        contentLength: 187,
        wordCount: 29,
        processingTime: 4250
    }
};

console.log('🧪 Test del nuovo formato con timestamp e log...\n');

// Simula il salvataggio (deve essere esposto)
const path = require('path');
const fs = require('fs');

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
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function saveReviewWithLogTest(result) {
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
    const reviewsDir = path.join(__dirname, 'reviews');
    const filePath = path.join(reviewsDir, fileName);

    // Crea directory se non esiste
    if (!fs.existsSync(reviewsDir)) {
        fs.mkdirSync(reviewsDir, { recursive: true });
    }

    // Costruisci contenuto con timestamp e log
    const content = `📅 ESTRATTO IL: ${timestampStr}

🎬 ${result.review.title || title} (${year})
👤 ${result.review.author || 'Autore sconosciuto'}
📅 ${result.review.date || 'Data non disponibile'}
📊 ${result.metadata.contentLength} caratteri

📖 RECENSIONE:
================================================================================
${result.review.content}
================================================================================

📋 LOG ESTRAZIONE:
================================================================================
🌐 URL: ${result.url}
⏱️  Tempo elaborazione: ${result.metadata.processingTime}ms
🔧 Metodo estrazione: ${result.metadata.extractionMethod}
📏 Parole: ${result.metadata.wordCount}
💾 File: ${fileName}
🕐 Timestamp: ${timestamp.toISOString()}
🖥️  User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
🔍 Selettori utilizzati: p.corpo, .corpo, #recensione
📱 Viewport: Default Puppeteer
🌍 Lingua: Italiano
================================================================================
`;

    try {
        fs.writeFileSync(filePath, content, 'utf8');
        return filePath;
    } catch (error) {
        console.error('❌ Errore salvataggio:', error.message);
        return null;
    }
}

const savedPath = saveReviewWithLogTest(mockResult);
if (savedPath) {
    console.log(`✅ File di test creato: ${path.basename(savedPath)}`);
    console.log(`📂 Percorso completo: ${savedPath}\n`);

    // Mostra il contenuto
    const content = fs.readFileSync(savedPath, 'utf8');
    console.log('📄 CONTENUTO DEL FILE:');
    console.log('='.repeat(80));
    console.log(content);
} else {
    console.log('❌ Errore nella creazione del file di test');
}