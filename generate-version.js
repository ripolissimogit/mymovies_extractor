#!/usr/bin/env node

/**
 * Genera versione automatica basata su git commit e timestamp
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function generateVersion() {
    try {
        // Get git commit hash (short)
        const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        
        // Get commit timestamp
        const gitTimestamp = execSync('git log -1 --format=%ct', { encoding: 'utf8' }).trim();
        const commitDate = new Date(parseInt(gitTimestamp) * 1000);
        
        // Format: YYYY.MM.DD.HHMM-githash
        const version = `${commitDate.getFullYear()}.${String(commitDate.getMonth() + 1).padStart(2, '0')}.${String(commitDate.getDate()).padStart(2, '0')}.${String(commitDate.getHours()).padStart(2, '0')}${String(commitDate.getMinutes()).padStart(2, '0')}-${gitHash}`;
        
        return {
            version,
            gitHash,
            commitDate: commitDate.toISOString(),
            buildDate: new Date().toISOString()
        };
    } catch (error) {
        // Fallback se git non disponibile
        const now = new Date();
        const fallbackVersion = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}-dev`;
        
        return {
            version: fallbackVersion,
            gitHash: 'unknown',
            commitDate: now.toISOString(),
            buildDate: now.toISOString()
        };
    }
}

// Se chiamato direttamente, stampa la versione
if (require.main === module) {
    const versionInfo = generateVersion();
    console.log(JSON.stringify(versionInfo, null, 2));
}

module.exports = { generateVersion };
