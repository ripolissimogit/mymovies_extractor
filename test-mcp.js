#!/usr/bin/env node

/**
 * Test MCP Server - Simulates Claude Desktop interaction
 */

const { spawn } = require('child_process');

class MCPTester {
    constructor() {
        this.server = null;
    }

    async testStdio() {
        console.log('🧪 Testing MCP Server (stdio mode)...\n');

        return new Promise((resolve) => {
            this.server = spawn('node', ['mcp-server.js'], {
                stdio: ['pipe', 'pipe', 'inherit']
            });

            let responses = [];
            this.server.stdout.on('data', (data) => {
                const lines = data.toString().trim().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        try {
                            const response = JSON.parse(line);
                            responses.push(response);
                            console.log('📨 Response:', JSON.stringify(response, null, 2));
                        } catch (e) {
                            console.log('📨 Raw:', line);
                        }
                    }
                });
            });

            // Test sequence
            setTimeout(() => {
                console.log('1️⃣ Testing initialize...');
                this.sendRequest({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'initialize',
                    params: {}
                });
            }, 100);

            setTimeout(() => {
                console.log('\n2️⃣ Testing tools/list...');
                this.sendRequest({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/list',
                    params: {}
                });
            }, 500);

            setTimeout(() => {
                console.log('\n3️⃣ Testing get_api_info...');
                this.sendRequest({
                    jsonrpc: '2.0',
                    id: 3,
                    method: 'tools/call',
                    params: {
                        name: 'get_api_info',
                        arguments: {}
                    }
                });
            }, 1000);

            setTimeout(() => {
                console.log('\n4️⃣ Testing extract_movie_review...');
                this.sendRequest({
                    jsonrpc: '2.0',
                    id: 4,
                    method: 'tools/call',
                    params: {
                        name: 'extract_movie_review',
                        arguments: {
                            title: 'Oppenheimer',
                            year: 2023,
                            options: { noSave: true }
                        }
                    }
                });
            }, 1500);

            setTimeout(() => {
                console.log('\n✅ Test completed!');
                this.server.kill();
                resolve(responses);
            }, 8000);
        });
    }

    sendRequest(request) {
        this.server.stdin.write(JSON.stringify(request) + '\n');
    }

    async testHttp() {
        console.log('🧪 Testing MCP Server (HTTP mode)...\n');
        
        // Start HTTP server
        const server = spawn('node', ['mcp-server.js', '--http', '--port', '3001'], {
            stdio: 'inherit'
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const http = require('http');
            
            const testRequest = (data) => {
                return new Promise((resolve, reject) => {
                    const req = http.request({
                        hostname: 'localhost',
                        port: 3001,
                        path: '/mcp',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(data)
                        }
                    }, (res) => {
                        let body = '';
                        res.on('data', chunk => body += chunk);
                        res.on('end', () => {
                            try {
                                resolve(JSON.parse(body));
                            } catch (e) {
                                resolve(body);
                            }
                        });
                    });
                    
                    req.on('error', reject);
                    req.write(data);
                    req.end();
                });
            };

            console.log('📡 Testing HTTP initialize...');
            const initResponse = await testRequest(JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {}
            }));
            console.log('Response:', JSON.stringify(initResponse, null, 2));

            console.log('\n📡 Testing HTTP tools/list...');
            const toolsResponse = await testRequest(JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/list',
                params: {}
            }));
            console.log('Response:', JSON.stringify(toolsResponse, null, 2));

        } catch (error) {
            console.error('HTTP test error:', error.message);
        }

        server.kill();
        console.log('\n✅ HTTP test completed!');
    }
}

async function main() {
    const tester = new MCPTester();
    
    if (process.argv.includes('--http')) {
        await tester.testHttp();
    } else {
        await tester.testStdio();
    }
}

main().catch(console.error);
