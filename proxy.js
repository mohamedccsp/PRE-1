// Zero-dependency local proxy — reads OPENAI_API_KEY from .env
// Usage: node proxy.js
// Then open dashboard.html in your browser

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ENV_PATH = path.join(__dirname, '.env');

function loadApiKey() {
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('OPENAI_API_KEY=')) {
      return trimmed.slice('OPENAI_API_KEY='.length).trim();
    }
  }
  throw new Error('OPENAI_API_KEY not found in .env');
}

const API_KEY = loadApiKey();
console.log(`[proxy] API key loaded (${API_KEY.slice(0, 7)}...)`);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const payload = JSON.stringify({
        ...JSON.parse(body),
        model: 'gpt-4o-mini'
      });

      const options = {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const proxyReq = https.request(options, proxyRes => {
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', err => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Proxy error: ' + err.message } }));
      });

      proxyReq.write(payload);
      proxyReq.end();
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: 'Not found' } }));
});

server.listen(PORT, () => {
  console.log(`[proxy] Running on http://localhost:${PORT}`);
  console.log(`[proxy] Open dashboard.html in your browser`);
});
