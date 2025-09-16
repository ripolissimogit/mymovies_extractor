#!/usr/bin/env node

/**
 * MCP Server per MyMovies Extractor
 * Implementa il Model Context Protocol per Claude Desktop
 */

// Imposta modalità silent per l'extractor
process.env.MCP_SILENT = 'true';

const { extractMovieReview } = require('./mymovies_extractor');

// Disabilita tutti i log per output JSON pulito
const originalConsole = { ...console };
console.log = () => {};
console.warn = () => {};
console.error = () => {};
console.info = () => {};
console.debug = () => {};

// Solo per errori critici in stderr
const logError = (msg) => {
  process.stderr.write(`[MCP ERROR] ${msg}\n`);
};

class MCPServer {
  constructor() {
    this.handleStdin();
  }

  handleStdin() {
    let buffer = '';

    process.stdin.on('data', (chunk) => {
      buffer += chunk.toString();

      // Processa messaggi JSON completi
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Mantieni l'ultima riga incompleta

      for (const line of lines) {
        if (line.trim()) {
          this.handleMessage(line.trim());
        }
      }
    });

    process.stdin.on('end', () => {
      if (buffer.trim()) {
        this.handleMessage(buffer.trim());
      }
    });
  }

  async handleMessage(message) {
    try {
      const request = JSON.parse(message);
      console.error(`📨 MCP Request: ${request.method} (id: ${request.id})`);
      const response = await this.processRequest(request);
      this.sendResponse(response);
    } catch (error) {
      console.error('❌ MCP Error:', error.message);
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error: ' + error.message
        }
      };
      this.sendResponse(errorResponse);
    }
  }

  async processRequest(request) {
    const { id, method, params } = request;

    switch (method) {
      case 'initialize':
        console.error('🚀 MCP Initialize request received');
        const initResponse = {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'mymovies-extractor',
              version: '1.0.0'
            }
          }
        };
        console.error('✅ MCP Initialize response ready');
        return initResponse;

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'extract_movie_review',
                description: 'Estrai recensione completa da MyMovies.it con metadata',
                inputSchema: {
                  type: 'object',
                  properties: {
                    title: {
                      type: 'string',
                      description: 'Titolo del film'
                    },
                    year: {
                      type: 'number',
                      description: 'Anno di uscita'
                    }
                  },
                  required: ['title', 'year']
                }
              }
            ]
          }
        };

      case 'tools/call':
        const { name, arguments: args } = params;

        if (name === 'extract_movie_review') {
          const { title, year } = args;

          // Log della richiesta
          console.error(`🎬 MCP: Extracting "${title}" (${year})`);

          const result = await extractMovieReview(title, year, {
            headless: true,
            noSave: false
          });

          if (result.success) {
            console.error(`✅ MCP: Success - ${result.metadata.contentLength} chars`);
          } else {
            console.error(`❌ MCP: Failed - ${result.error}`);
          }

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: result.success,
                    title: result.review?.title || title,
                    year,
                    review: result.review?.content || 'Recensione non trovata',
                    author: result.review?.author || 'Autore sconosciuto',
                    date: result.review?.date || 'Data non disponibile',
                    url: result.url,
                    metadata: result.metadata,
                    filePath: result.filePath
                  }, null, 2)
                }
              ]
            }
          };
        } else {
          return this.sendError(id, -32602, `Tool sconosciuto: ${name}`);
        }

      default:
        return this.sendError(id, -32601, `Metodo sconosciuto: ${method}`);
    }
  }

  sendResponse(response) {
    console.log(JSON.stringify(response));
  }

  sendError(id, code, message) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message
      }
    };
  }
}

// Avvia il server MCP
if (require.main === module) {
  console.error('🚀 MCP Server starting...');
  new MCPServer();
}

module.exports = MCPServer;