#!/usr/bin/env node
const { EnhancedMCPServer } = require('./server');
const server = new EnhancedMCPServer();

if (process.argv.includes('--http') || process.argv.includes('--ws')) {
    const port = process.argv.includes('--port') ? 
        parseInt(process.argv[process.argv.indexOf('--port') + 1]) : 3001;
    server.startMultiTransport(port);
} else if (process.stdin.isTTY) {
    server.startMultiTransport(3001);
} else {
    server.startStdio();
}
