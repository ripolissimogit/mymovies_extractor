# Development Guide

## 🏗️ **Architettura**

### **Componenti Principali**
- **`mymovies_extractor.js`** - Core extractor con Puppeteer
- **`api-server.js`** - Server Express con endpoint MCP
- **`search_and_extract.py`** - Ricerca interattiva TMDB
- **`mym`** - CLI wrapper unificato

### **Flusso di Estrazione**
1. **Input**: Titolo film + anno
2. **URL Building**: Costruzione URL MyMovies.it
3. **Puppeteer**: Lancio browser headless
4. **HTML Intercept**: Intercettazione response HTML (bypass AMP)
5. **Content Extract**: Estrazione con selettori CSS
6. **Validation**: Validazione qualità contenuto
7. **Output**: JSON strutturato con metadata

## 🛠️ **Setup Sviluppo**

### **Prerequisiti**
```bash
node >= 18.0.0
npm >= 9.0.0
python >= 3.8 (per ricerca TMDB)
```

### **Installazione**
```bash
git clone https://github.com/ripolissimogit/mymovies_extractor.git
cd mymovies_extractor
npm install
```

### **Variabili Ambiente**
```bash
# Opzionale - per ricerca TMDB
export TMDB_API_KEY='your_api_key'

# Cloud Run deployment
export PORT=8080
export GCS_BUCKET='mymovies-reviews'
export REVIEWS_DIR='./reviews'
```

## 🧪 **Testing**

### **Test Locali**
```bash
# Test extractor base
node mymovies_extractor.js

# Test API server
npm start
# Server su http://localhost:3000

# Test MCP server
node mcp-server.js
```

### **Test Specifici**
```bash
# Test film specifico
./mym "Oppenheimer" 2023 --verbose

# Test con output JSON
./mym "Dune" 2021 --json --no-save

# Test ricerca interattiva
./mym
```

### **Test API**
```bash
# Health check
curl http://localhost:3000/health

# Test estrazione
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name":"extract_movie_review","arguments":{"title":"Interstellar","year":2014}}'
```

## 🚀 **Deployment**

### **Google Cloud Run**

**Automatico (GitHub Actions):**
- Push su branch `api-server` → deploy automatico
- Workflow: `.github/workflows/deploy-cloudrun.yml`

**Manuale:**
```bash
# Build e deploy
./scripts/deploy-cloudrun.sh

# Con parametri specifici
PROJECT_ID=workspace-mcp-682108 REGION=europe-west8 ./scripts/deploy-cloudrun.sh
```

### **Configurazione GitHub Actions**

**Secrets richiesti:**
- `GOOGLE_CLOUD_CREDENTIALS` - JSON key service account

**Variables richieste:**
- `GCP_PROJECT_ID` - ID progetto Google Cloud
- `GCP_REGION` - Regione deployment

## 🔧 **Configurazione**

### **Puppeteer Settings**
```javascript
const browser = await puppeteer.launch({
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
    ],
    timeout: 180000
});
```

### **Express Server**
```javascript
const app = express();
app.use(express.json());
app.use(cors());
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 30
}));
```

### **MCP Protocol**
```javascript
// Standard MCP endpoints
app.post('/initialize', ...);
app.post('/tools/list', ...);
app.post('/tools/call', ...);

// JSON-RPC 2.0 compatibility
app.post('/', jsonRpcHandler);
```

## 📊 **Monitoring**

### **Logs Google Cloud**
```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mymovies-api" --limit=50

# Real-time logs
gcloud logging tail "resource.type=cloud_run_revision"
```

### **Metrics**
- Request count
- Response time
- Error rate
- Memory usage
- CPU utilization

## 🐛 **Debugging**

### **Common Issues**

**Timeout Errors:**
```javascript
// Aumenta timeout Puppeteer
const page = await browser.newPage();
page.setDefaultTimeout(180000);
```

**Memory Issues:**
```javascript
// Cleanup browser
await browser.close();
```

**Rate Limiting:**
```javascript
// Check rate limit headers
console.log(response.headers['ratelimit-remaining']);
```

### **Debug Mode**
```bash
# Verbose logging
DEBUG=* node api-server.js

# Show browser (local only)
./mym "Film" 2023 --verbose
```

## 🔄 **CI/CD Pipeline**

### **GitHub Actions Workflow**
1. **Trigger**: Push to `api-server` branch
2. **Build**: Docker image build
3. **Auth**: Google Cloud authentication
4. **Deploy**: Cloud Run deployment
5. **Verify**: Health check post-deploy

### **Branch Strategy**
- `main` - Stable release
- `api-server` - API server development (auto-deploy)
- `feature/*` - Feature branches

## 📝 **Code Style**

### **JavaScript**
```javascript
// Use async/await
async function extractReview(title, year) {
    try {
        const result = await puppeteerExtract(title, year);
        return result;
    } catch (error) {
        console.error('Extraction failed:', error);
        throw error;
    }
}

// Error handling
if (!result.success) {
    throw new Error(`Extraction failed: ${result.error}`);
}
```

### **API Responses**
```javascript
// Success response
res.json({
    success: true,
    data: result,
    metadata: { timestamp: new Date().toISOString() }
});

// Error response
res.status(500).json({
    success: false,
    error: error.message,
    timestamp: new Date().toISOString()
});
```

## 🔐 **Security**

### **Rate Limiting**
- 30 requests/minute per IP
- Bypass for health checks
- Headers: `RateLimit-*`

### **CORS**
- Allow all origins (`*`)
- Restrict methods: GET, POST, OPTIONS
- Safe headers only

### **Input Validation**
```javascript
// Validate required parameters
if (!title || !year) {
    return res.status(400).json({
        error: 'Missing required parameters',
        required: ['title', 'year']
    });
}

// Sanitize inputs
const cleanTitle = title.trim().substring(0, 100);
const validYear = parseInt(year);
```

## 📚 **Resources**

- **Puppeteer Docs**: https://pptr.dev/
- **Express.js**: https://expressjs.com/
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Google Cloud Run**: https://cloud.google.com/run/docs
- **TMDB API**: https://developers.themoviedb.org/

## 🤝 **Contributing**

1. Fork repository
2. Create feature branch
3. Make changes
4. Test locally
5. Submit pull request

### **Pull Request Template**
- [ ] Tests pass locally
- [ ] API endpoints tested
- [ ] Documentation updated
- [ ] No breaking changes
