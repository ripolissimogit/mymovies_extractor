#!/usr/bin/env node

/**
 * MCP Remote Proxy - Connette Claude Desktop al server remoto
 * Uso: node mcp-remote-proxy.js [server-url]
 */

const https = require('https');
const http = require('http');

class MCPRemoteProxy {
  constructor(serverUrl = 'https://mymovies-api-rflzoyubyq-oc.a.run.app') {
    this.serverUrl = serverUrl;
    this.handleStdin();
    console.error(`🌐 MCP Remote Proxy starting for ${serverUrl}`);
  }

  handleStdin() {
    let buffer = '';

    process.stdin.on('data', (chunk) => {
      buffer += chunk.toString();

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          this.forwardRequest(line.trim());
        }
      }
    });

    process.stdin.on('end', () => {
      if (buffer.trim()) {
        this.forwardRequest(buffer.trim());
      }
    });
  }

  async forwardRequest(message) {
    try {
      const request = JSON.parse(message);
      console.error(`📤 Forwarding: ${request.method} (id: ${request.id})`);

      const response = await this.makeRequest(request);
      console.log(JSON.stringify(response));

    } catch (error) {
      console.error(`❌ Proxy Error: ${error.message}`);
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: error.message
        }
      };
      console.log(JSON.stringify(errorResponse));
    }
  }

  makeRequest(data) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);
      const url = new URL(this.serverUrl);

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname || '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'MCP-Remote-Proxy/1.0'
        }
      };

      const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            console.error(`📥 Response: ${res.statusCode} (${body.length} bytes)`);
            resolve(result);
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${body.substring(0, 100)}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(120000, () => reject(new Error('Request timeout')));
      req.write(postData);
      req.end();
    });
  }
}

// Avvia proxy
if (require.main === module) {
  const serverUrl = process.argv[2] || 'https://mymovies-api-rflzoyubyq-oc.a.run.app';
  new MCPRemoteProxy(serverUrl);
}

module.exports = MCPRemoteProxy;