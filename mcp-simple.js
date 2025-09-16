#!/usr/bin/env node

process.stdin.setEncoding('utf8');
process.stdout.setEncoding('utf8');

let buffer = '';

process.stdin.on('data', (chunk) => {
    buffer += chunk;
    
    let lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (let line of lines) {
        if (line.trim()) {
            try {
                const request = JSON.parse(line);
                handleRequest(request);
            } catch (e) {
                // Ignore malformed JSON
            }
        }
    }
});

function handleRequest(request) {
    const id = request.id || null;
    const method = request.method || '';
    
    let response;
    
    switch (method) {
        case 'initialize':
            response = {
                jsonrpc: '2.0',
                id,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'mymovies-simple', version: '1.0.0' }
                }
            };
            break;
            
        case 'tools/list':
            response = {
                jsonrpc: '2.0',
                id,
                result: {
                    tools: [{
                        name: 'test_tool',
                        description: 'Test tool',
                        inputSchema: { type: 'object', properties: {} }
                    }]
                }
            };
            break;
            
        default:
            response = {
                jsonrpc: '2.0',
                id,
                error: { code: -32601, message: 'Method not found' }
            };
    }
    
    process.stdout.write(JSON.stringify(response) + '\n');
}
