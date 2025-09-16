#!/usr/bin/env node

/**
 * MyMovies MCP Server
 * Standard JSON-RPC 2.0 MCP Protocol Implementation
 * Compatible with Claude Desktop, Cursor, and other MCP clients
 */

const http = require('http');
const https = require('https');

class MyMoviesMCPServer {
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
    }

    async handleRequest(request) {
        // Handle malformed requests gracefully
        if (!request || typeof request !== 'object') {
            return this.createErrorResponse(null, -32700, 'Parse error');
        }

        const id = request.id !== undefined ? request.id : null;
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
                            capabilities: {
                                tools: {}
                            },
                            serverInfo: {
                                name: 'mymovies-mcp-server',
                                version: '1.0.0'
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
                    if (!params.name) {
                        throw new Error('Tool name required');
                    }
                    const result = await this.callTool(params.name, params.arguments || {});
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result, null, 2)
                                }
                            ]
                        }
                    };

                default:
                    throw new Error(`Unknown method: ${method}`);
            }
        } catch (error) {
            return this.createErrorResponse(id, -32603, error.message || 'Internal error');
        }
    }

    createErrorResponse(id, code, message) {
        return {
            jsonrpc: '2.0',
            id,
            error: { code, message }
        };
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
            title,
            year,
            options
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
                    `🎬 Extracted review for: ${title} (${year})`,
                    `👤 Author: ${response.data.review.author}`,
                    `📊 Content: ${response.data.metadata.wordCount} words`,
                    `⏱️ Processing: ${(response.data.metadata.processingTime / 1000).toFixed(2)}s`,
                    `✅ Extraction completed successfully`
                ]
            };
        } else {
            throw new Error(response.message || 'Review extraction failed');
        }
    }

    async listReviews() {
        const response = await this.httpCall('GET', `${this.apiBase}/api/reviews`);
        return {
            total: response.total || 0,
            reviews: response.reviews || [],
            message: `Found ${response.total || 0} extracted reviews`
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

            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(data && { 'Content-Length': Buffer.byteLength(data) })
                }
            };

            const req = client.request(urlObj, options, (res) => {
                let chunks = '';
                res.on('data', chunk => chunks += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(chunks));
                    } catch {
                        resolve({ error: chunks });
                    }
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
        let buffer = '';
        
        process.stdin.on('data', async (data) => {
            buffer += data;
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                    try {
                        const request = JSON.parse(trimmed);
                        const response = await this.handleRequest(request);
                        process.stdout.write(JSON.stringify(response) + '\n');
                    } catch (error) {
                        const errorResponse = {
                            jsonrpc: '2.0',
                            id: null,
                            error: {
                                code: -32700,
                                message: 'Parse error'
                            }
                        };
                        process.stdout.write(JSON.stringify(errorResponse) + '\n');
                    }
                }
            }
        });

        process.stdin.on('end', () => {
            process.exit(0);
        });
    }

    // HTTP transport (Cursor, Q, etc.)
    startHttp(port = 3001) {
        const server = http.createServer(async (req, res) => {
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
                            jsonrpc: '2.0',
                            id: null,
                            error: { code: -32700, message: 'Parse error' }
                        }));
                    }
                });
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        server.listen(port, () => {
            console.log(`MCP Server running on http://localhost:${port}/mcp`);
        });
    }
}

// Auto-detect transport mode
const server = new MyMoviesMCPServer();

if (process.argv.includes('--http')) {
    const port = process.argv.includes('--port') ? 
        parseInt(process.argv[process.argv.indexOf('--port') + 1]) : 3001;
    server.startHttp(port);
} else {
    // Default: stdio for Claude Desktop
    server.startStdio();
}
