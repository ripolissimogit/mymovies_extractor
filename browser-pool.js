/**
 * Browser Pool per ottimizzare performance Puppeteer
 * Riutilizza istanze browser per ridurre overhead
 */

const puppeteer = require('puppeteer');

class BrowserPool {
    constructor(options = {}) {
        this.max = options.max || 3;
        this.min = options.min || 1;
        this.idleTimeoutMillis = options.idleTimeoutMillis || 30000;
        this.browsers = [];
        this.available = [];
        this.pending = [];
        this.destroyed = false;
    }

    async getBrowser() {
        if (this.destroyed) {
            throw new Error('Browser pool destroyed');
        }

        // Se c'è un browser disponibile, usalo
        if (this.available.length > 0) {
            return this.available.pop();
        }

        // Se possiamo creare un nuovo browser, crealo
        if (this.browsers.length < this.max) {
            const browser = await this.createBrowser();
            this.browsers.push(browser);
            return browser;
        }

        // Altrimenti aspetta che se ne liberi uno
        return new Promise((resolve) => {
            this.pending.push(resolve);
        });
    }

    async releaseBrowser(browser) {
        if (this.destroyed) {
            await browser.close();
            return;
        }

        // Se ci sono richieste in attesa, soddisfale
        if (this.pending.length > 0) {
            const resolve = this.pending.shift();
            resolve(browser);
            return;
        }

        // Altrimenti metti il browser nella pool disponibile
        this.available.push(browser);

        // Imposta timeout per chiudere browser inattivi
        setTimeout(() => {
            const index = this.available.indexOf(browser);
            if (index !== -1 && this.available.length > this.min) {
                this.available.splice(index, 1);
                const browserIndex = this.browsers.indexOf(browser);
                if (browserIndex !== -1) {
                    this.browsers.splice(browserIndex, 1);
                }
                browser.close();
            }
        }, this.idleTimeoutMillis);
    }

    async createBrowser() {
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
        ];

        // In produzione usa Chrome stabile
        const options = {
            headless: 'new',
            args
        };

        if (process.env.NODE_ENV === 'production') {
            options.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable';
        }

        return await puppeteer.launch(options);
    }

    async destroy() {
        this.destroyed = true;
        
        // Chiudi tutti i browser
        await Promise.all(this.browsers.map(browser => browser.close()));
        
        // Rifiuta tutte le richieste in attesa
        this.pending.forEach(resolve => {
            resolve(Promise.reject(new Error('Browser pool destroyed')));
        });

        this.browsers = [];
        this.available = [];
        this.pending = [];
    }

    getStats() {
        return {
            total: this.browsers.length,
            available: this.available.length,
            pending: this.pending.length,
            max: this.max,
            min: this.min
        };
    }
}

// Singleton instance
let globalPool = null;

function getGlobalPool() {
    if (!globalPool) {
        globalPool = new BrowserPool({
            max: process.env.NODE_ENV === 'production' ? 2 : 3,
            min: 1,
            idleTimeoutMillis: 30000
        });
    }
    return globalPool;
}

module.exports = { BrowserPool, getGlobalPool };
