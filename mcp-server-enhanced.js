#!/usr/bin/env node

/**
 * MyMovies Enhanced MCP Server
 * Multi-Transport: stdio, HTTP, WebSocket with auto-detection
 */

const http = require('http');
const https = require('https');
const { WebSocketServer } = require('ws');

class EnhancedMCPServer {
    constructor() {
        this.tools = [
            {
                name: 'extract_movie_review',
                description: 'Extract movie review from MyMovies.it with detailed metadata and logging',
                inputSchema: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Movie title' },
                        year: { type: 'number', description: 'Release year' },
                        options: { 
                            type: 'object', 
                            properties: {
                                noSave: { type: 'boolean', description: 'Skip saving to storage' }
                            }
                        }
                    },
                    required: ['title', 'year']
                }
            },
            {
                name: 'list_reviews',
                description: 'List all extracted movie reviews',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'get_api_info',
                description: 'Get API server information and status',
                inputSchema: { type: 'object', properties: {} }
            }
        ];
        
        this.apiBase = process.env.MYMOVIES_API_URL || 'https://mymovies-api-61434647155.europe-west8.run.app';
        this.clients = new Set();
    }

    async handleRequest(request) {
        const { id, method, params } = request;

        try {
            switch (method) {
                case 'initialize':
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            protocolVersion: '2024-11-05',
                            capabilities: { tools: {}, logging: {} },
                            serverInfo: {
                                name: 'mymovies-mcp-server-enhanced',
                                version: '1.1.0'
                            }
                        }
                    };

                case 'tools/list':
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: { tools: this.tools }
                    };

                case 'tools/call':
                    const result = await this.callTool(params.name, params.arguments);
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                        }
                    };

                default:
                    throw new Error(`Unknown method: ${method}`);
            }
        } catch (error) {
            return {
                jsonrpc: '2.0',
                id,
                error: { code: -32603, message: error.message }
            };
        }
    }

    async callTool(name, args) {
        switch (name) {
            case 'extract_movie_review':
                return await this.extractReview(args.title, args.year, args.options);
            case 'list_reviews':
                return await this.listReviews();
            case 'get_api_info':
                return await this.getApiInfo();
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }

    async extractReview(title, year, options = {}) {
        const response = await this.httpCall('POST', `${this.apiBase}/api/extract`, {
            title, year, options
        });

        if (response.success) {
            return {
                success: true,
                film: `${response.data.title} (${response.data.year})`,
                review: {
                    author: response.data.review.author,
                    date: response.data.review.date,
                    content: response.data.review.content.substring(0, 500) + '...',
                    fullLength: response.data.review.content.length
                },
                metadata: {
                    processingTime: `${(response.data.metadata.processingTime / 1000).toFixed(2)}s`,
                    wordCount: response.data.metadata.wordCount,
                    extractionMethod: response.data.metadata.extractionMethod
                },
                logs: [
                    `🎬 Extracted: ${title} (${year})`,
                    `👤 Author: ${response.data.review.author}`,
                    `📊 ${response.data.metadata.wordCount} words`,
                    `⏱️ ${(response.data.metadata.processingTime / 1000).toFixed(2)}s`,
                    `✅ Success`
                ]
            };
        } else {
            throw new Error(response.message || 'Extraction failed');
        }
    }

    async listReviews() {
        const response = await this.httpCall('GET', `${this.apiBase}/api/reviews`);
        return {
            total: response.total || 0,
            reviews: response.reviews || [],
            message: `Found ${response.total || 0} reviews`
        };
    }

    async getApiInfo() {
        const response = await this.httpCall('GET', `${this.apiBase}/api/info`);
        return {
            service: response.name,
            version: response.version,
            endpoints: Object.keys(response.endpoints || {}),
            status: 'operational'
        };
    }

    httpCall(method, url, body = null) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            const data = body ? JSON.stringify(body) : null;

            const req = client.request(urlObj, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(data && { 'Content-Length': Buffer.byteLength(data) })
                }
            }, (res) => {
                let chunks = '';
                res.on('data', chunk => chunks += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(chunks)); }
                    catch { resolve({ error: chunks }); }
                });
            });

            req.on('error', reject);
            if (data) req.write(data);
            req.end();
        });
    }

    // Stdio transport (Claude Desktop)
    startStdio() {
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', async (data) => {
            const lines = data.trim().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const request = JSON.parse(line);
                        const response = await this.handleRequest(request);
                        process.stdout.write(JSON.stringify(response) + '\n');
                    } catch (error) {
                        process.stdout.write(JSON.stringify({
                            jsonrpc: '2.0', id: null,
                            error: { code: -32700, message: 'Parse error' }
                        }) + '\n');
                    }
                }
            }
        });
        console.error('MCP Server ready (stdio mode)');
    }

    // Multi-transport server (HTTP + WebSocket)
    startMultiTransport(port = 3001) {
        const server = http.createServer(async (req, res) => {
            // CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            if (req.method === 'POST' && req.url === '/mcp') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const request = JSON.parse(body);
                        const response = await this.handleRequest(request);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(response));
                    } catch (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            jsonrpc: '2.0', id: null,
                            error: { code: -32700, message: 'Parse error' }
                        }));
                    }
                });
            } else if (req.method === 'GET' && req.url === '/') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <h1>MyMovies MCP Server</h1>
                    <p>Status: <strong>Running</strong></p>
                    <p>HTTP Endpoint: <code>POST /mcp</code></p>
                    <p>WebSocket: <code>ws://localhost:${port}/ws</code></p>
                    <p>Tools: ${this.tools.length}</p>
                `);
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        // WebSocket support
        const wss = new WebSocketServer({ server, path: '/ws' });
        wss.on('connection', (ws) => {
            this.clients.add(ws);
            ws.on('message', async (data) => {
                try {
                    const request = JSON.parse(data.toString());
                    const response = await this.handleRequest(request);
                    ws.send(JSON.stringify(response));
                } catch (error) {
                    ws.send(JSON.stringify({
                        jsonrpc: '2.0', id: null,
                        error: { code: -32700, message: 'Parse error' }
                    }));
                }
            });
            ws.on('close', () => this.clients.delete(ws));
        });

        server.listen(port, () => {
            console.log(`🚀 MCP Server running on http://localhost:${port}`);
            console.log(`📡 HTTP: POST http://localhost:${port}/mcp`);
            console.log(`🔌 WebSocket: ws://localhost:${port}/ws`);
        });
    }
}

// Auto-detect and start appropriate transport
const server = new EnhancedMCPServer();

if (process.argv.includes('--http') || process.argv.includes('--ws')) {
    const port = process.argv.includes('--port') ? 
        parseInt(process.argv[process.argv.indexOf('--port') + 1]) : 3001;
    server.startMultiTransport(port);
} else if (process.stdin.isTTY) {
    // Interactive mode - start HTTP
    server.startMultiTransport(3001);
} else {
    // Pipe mode - start stdio
    server.startStdio();
}
