#!/usr/bin/env node

/**
 * Universal MCP Client for MyMovies Extractor
 * Connects to Cloud Run API via HTTP requests
 * Works on any device with Node.js
 */

const https = require('https');

const API_BASE = 'https://mymovies-api-61434647155.europe-west8.run.app';

class UniversalMCPClient {
    constructor() {
        this.tools = [
            {
                name: 'extract_movie_review',
                description: 'Extract movie review from MyMovies.it with detailed metadata',
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
    }

    async makeRequest(path, data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'mymovies-api-61434647155.europe-west8.run.app',
                path,
                method: data ? 'POST' : 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Universal-MCP-Client/1.0'
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve({ error: 'Invalid JSON response' });
                    }
                });
            });

            req.on('error', reject);
            if (data) req.write(JSON.stringify(data));
            req.end();
        });
    }

    async handleRequest(request) {
        const id = request.id || null;
        const method = request.method || '';
        const params = request.params || {};

        try {
            switch (method) {
                case 'initialize':
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            protocolVersion: '2024-11-05',
                            capabilities: { tools: {} },
                            serverInfo: { name: 'mymovies-universal', version: '1.0.0' }
                        }
                    };

                case 'tools/list':
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: { tools: this.tools }
                    };

                case 'tools/call':
                    const result = await this.callTool(params.name, params.arguments || {});
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            content: [{
                                type: 'text',
                                text: JSON.stringify(result, null, 2)
                            }]
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
                return await this.makeRequest('/api/extract', {
                    title: args.title,
                    year: args.year,
                    options: args.options || {}
                });

            case 'list_reviews':
                return await this.makeRequest('/api/reviews');

            case 'get_api_info':
                return await this.makeRequest('/api/info');

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }

    start() {
        process.stdin.setEncoding('utf8');
        let buffer = '';

        process.stdin.on('data', async (chunk) => {
            buffer += chunk;
            let lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (let line of lines) {
                if (line.trim()) {
                    try {
                        const request = JSON.parse(line);
                        const response = await this.handleRequest(request);
                        process.stdout.write(JSON.stringify(response) + '\n');
                    } catch (e) {
                        // Ignore malformed JSON
                    }
                }
            }
        });
    }
}

if (require.main === module) {
    new UniversalMCPClient().start();
}

module.exports = UniversalMCPClient;
