const fs = require('fs');
const path = require('path');

async function deployMCP() {
  const apiKey = process.env.TADATA_API_KEY || process.env.TADATA_APIKEY || process.env.TADATA_KEY;
  if (!apiKey) {
    console.log('Tadata MCP: variabile TADATA_API_KEY non impostata. Skip deploy.');
    return;
  }

  const specPath = path.join(__dirname, 'openapi.json');
  if (!fs.existsSync(specPath)) {
    console.log('Tadata MCP: openapi.json non trovato. Skip deploy.');
    return;
  }

  try {
    const { Tadata, OpenApiSource } = await import('@tadata-js/sdk');
    const swaggerDoc = JSON.parse(fs.readFileSync(specPath, 'utf8'));

    const publicBase = process.env.PUBLIC_BASE_URL || process.env.TADATA_BASE_URL || process.env.BASE_URL;
    if (publicBase) {
      swaggerDoc.servers = [{ url: publicBase, description: 'Public' }];
      console.log('Tadata MCP: override servers ->', publicBase);
    } else {
      console.log('Tadata MCP: usando servers da openapi.json:', (swaggerDoc.servers || []).map(s => s.url).join(', ') || '(none)');
    }

    const tadata = new Tadata({ apiKey });
    const result = await tadata.mcp.deploy({
      spec: OpenApiSource.fromObject(swaggerDoc),
    });

    try {
      console.log('Tadata MCP: raw result =', JSON.stringify(result));
    } catch (_) {}
    const serverUrl = (result && (result.serverUrl || result.url)) || null;
    if (serverUrl) console.log('Tadata MCP: deploy completato ->', serverUrl);
    else console.log('Tadata MCP: deploy completato.');
  } catch (err) {
    console.log('Tadata MCP: deploy non riuscito o SDK non installato:', err.message);
  }
}

module.exports = { deployMCP };

if (require.main === module) {
  deployMCP().then(() => {
    // done
  });
}
