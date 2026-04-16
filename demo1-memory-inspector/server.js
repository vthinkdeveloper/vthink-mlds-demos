/**
 * Memory Inspector: local demo proxy server
 * No npm install needed. Uses only Node.js built-ins.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node server.js
 *
 * Then open: http://localhost:3000
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT    = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('\n  ✗  ANTHROPIC_API_KEY is not set.\n');
  console.error('  Run:  ANTHROPIC_API_KEY=sk-ant-... node server.js\n');
  process.exit(1);
}

/* ── Proxy a single POST to Anthropic ── */
function proxyToAnthropic(body, res) {
  const parsed  = JSON.parse(body);
  const isMemory = parsed.system && parsed.system.includes('Extract memory');
  const label   = isMemory ? '[memory]' : '[chat]  ';

  console.log(`→ ${label} model=${parsed.model} msgs=${parsed.messages?.length}`);

  const options = {
    hostname: 'api.anthropic.com',
    path:     '/v1/messages',
    method:   'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         API_KEY,
      'anthropic-version': '2023-06-01',
    },
  };

  let responseBody = '';
  const upstream = https.request(options, (upRes) => {
    res.writeHead(upRes.statusCode, {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    upRes.on('data', chunk => { responseBody += chunk; res.write(chunk); });
    upRes.on('end', () => {
      res.end();
      try {
        const json = JSON.parse(responseBody);
        const text = json.content?.[0]?.text ?? '';
        console.log(`← ${label} status=${upRes.statusCode} chars=${text.length}`);
        if (isMemory) console.log(`   raw: ${JSON.stringify(responseBody).slice(0, 300)}`);
      } catch (e) {
        console.log(`← ${label} PARSE ERROR: ${e.message}`);
        console.log(`   body: ${responseBody.slice(0, 300)}`);
      }
    });
  });

  upstream.on('error', (err) => {
    console.error('[proxy error]', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: err.message } }));
  });

  upstream.write(body);
  upstream.end();
}

/* ── HTTP server ── */
const server = http.createServer((req, res) => {

  /* CORS pre-flight */
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  /* Proxy endpoint */
  if (req.method === 'POST' && req.url === '/api/messages') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end',  ()    => proxyToAnthropic(body, res));
    return;
  }

  /* Serve index.html for everything else */
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  ✓  Memory Inspector running at http://localhost:${PORT}\n`);
});
