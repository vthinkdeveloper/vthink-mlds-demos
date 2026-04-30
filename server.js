const http   = require("http");
const https  = require("https");
const fs     = require("fs");
const path   = require("path");
const { Readable } = require("stream");

const PORT = 3000;
const ROOT = __dirname;

// ── API key ──────────────────────────────────────────────────────────────────
function readApiKey() {
  try {
    const content = fs.readFileSync(path.join(ROOT, "demo1-memory-inspector", ".env"), "utf8");
    const match   = content.match(/ANTHROPIC_API_KEY=(.+)/);
    return match ? match[1].trim() : "";
  } catch (e) { return ""; }
}
const API_KEY = readApiKey();
if (!API_KEY) console.warn("[warn] No API key found in demo1-memory-inspector/.env");

// ── Logging helper ───────────────────────────────────────────────────────────
function log(tag, msg) {
  const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  console.log(`[${ts}] ${tag} ${msg}`);
}

// ── Static file mime types ───────────────────────────────────────────────────
const MIME = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff2":"font/woff2",
  ".woff": "font/woff",
};

// ── Anthropic proxy ───────────────────────────────────────────────────────────
// All demos POST to /api/chat — the server forwards to Anthropic and logs
// everything so you don't have to touch the browser console.
function handleApiChat(req, res) {
  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", () => {
    let payload;
    try { payload = JSON.parse(body); } catch (e) {
      log("ERR", "bad JSON from client: " + e.message);
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "Bad JSON" } }));
    }

    const stream = !!payload.stream;
    log("REQ", `model=${payload.model}  stream=${stream}  max_tokens=${payload.max_tokens}`);

    const postData = Buffer.from(body);
    const options  = {
      hostname: "api.anthropic.com",
      path:     "/v1/messages",
      method:   "POST",
      headers:  {
        "Content-Type":    "application/json",
        "Content-Length":  postData.length,
        "x-api-key":       API_KEY,
        "anthropic-version": "2023-06-01",
      },
    };

    const apiReq = https.request(options, (apiRes) => {
      log("RES", `status=${apiRes.statusCode}`);

      if (stream && apiRes.statusCode === 200) {
        res.writeHead(200, {
          "Content-Type":  "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection":    "keep-alive",
        });
        apiRes.pipe(res);
        apiRes.on("end", () => log("OK ", "stream complete"));
      } else {
        // Collect full response (error or non-stream success)
        let respBody = "";
        apiRes.on("data", c => respBody += c);
        apiRes.on("end", () => {
          if (apiRes.statusCode !== 200) {
            log("ERR", `HTTP ${apiRes.statusCode}: ${respBody}`);
          } else {
            try {
              const d = JSON.parse(respBody);
              log("OK ", `output_tokens=${d.usage?.output_tokens}`);
            } catch (_) {}
          }
          res.writeHead(apiRes.statusCode, { "Content-Type": "application/json" });
          res.end(respBody);
        });
      }
    });

    apiReq.on("error", (e) => {
      log("ERR", "request failed: " + e.message);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: e.message } }));
    });

    apiReq.write(postData);
    apiReq.end();
  });
}

// ── DuckDuckGo web search proxy ───────────────────────────────────────────────
function parseDDGResults(html, limit) {
  const results = [];
  const linkRe  = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snipRe  = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  const links   = [...html.matchAll(linkRe)];
  const snips   = [...html.matchAll(snipRe)];
  for (let i = 0; i < Math.min(limit, links.length); i++) {
    const rawUrl = links[i][1];
    const title  = links[i][2].replace(/<[^>]+>/g, "").trim();
    const snippet = snips[i] ? snips[i][1].replace(/<[^>]+>/g, "").trim() : "";
    // Decode DuckDuckGo redirect: //duckduckgo.com/l/?uddg=<encoded-url>&...
    const uddgMatch = rawUrl.match(/[?&]uddg=([^&]+)/);
    const url = uddgMatch ? decodeURIComponent(uddgMatch[1]) : rawUrl;
    if (title && url) results.push({ title, url, snippet });
  }
  return results;
}

function handleWebSearch(req, res) {
  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", () => {
    let params;
    try { params = JSON.parse(body); } catch(e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Bad JSON", results: [] }));
    }
    const query = (params.query || "").slice(0, 200);
    log("SEARCH", `query="${query}"`);
    const options = {
      hostname: "html.duckduckgo.com",
      path: "/html/?" + "q=" + encodeURIComponent(query) + "&kl=in-en",
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-IN,en;q=0.9",
      },
    };
    const apiReq = https.request(options, (apiRes) => {
      log("SEARCH", `status=${apiRes.statusCode}`);
      let html = "";
      apiRes.on("data", c => html += c);
      apiRes.on("end", () => {
        const results = parseDDGResults(html, 8);
        log("SEARCH", `parsed ${results.length} results`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ results, query }));
      });
    });
    apiReq.on("error", (e) => {
      log("SEARCH-ERR", e.message);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ results: [], error: e.message, query }));
    });
    apiReq.end();
  });
}

// ── DuckDuckGo image search (2-step: html→vqd, then i.js) ────────────────────
function handleProductImages(req, res) {
  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", () => {
    let params;
    try { params = JSON.parse(body); } catch(e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ image: null }));
    }
    const query = (params.query || "").slice(0, 120);
    log("IMG", `query="${query}"`);

    const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    // Step 1 — get vqd token from main DDG HTML
    const step1 = https.request({
      hostname: "duckduckgo.com",
      path: "/?q=" + encodeURIComponent(query) + "&iax=images&ia=images",
      method: "GET",
      headers: { "User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9" },
    }, (r1) => {
      let html = "";
      r1.on("data", c => html += c);
      r1.on("end", () => {
        const m = html.match(/vqd=["']?([^"'&\s]+)/);
        if (!m) {
          log("IMG", "no vqd token");
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ image: null }));
        }
        const vqd = m[1];

        // Step 2 — fetch image JSON
        const step2 = https.request({
          hostname: "duckduckgo.com",
          path: "/i.js?q=" + encodeURIComponent(query) + "&vqd=" + encodeURIComponent(vqd) + "&o=json&l=in-en&f=,,,,,&p=1",
          method: "GET",
          headers: { "User-Agent": UA, "Referer": "https://duckduckgo.com/" },
        }, (r2) => {
          let json = "";
          r2.on("data", c => json += c);
          r2.on("end", () => {
            try {
              const data = JSON.parse(json);
              const first = data.results?.[0];
              const image = first?.thumbnail || first?.image || null;
              log("IMG", image ? "found image" : "no results");
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ image }));
            } catch(e) {
              log("IMG-ERR", e.message);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ image: null }));
            }
          });
        });
        step2.on("error", (e) => {
          log("IMG-ERR", e.message);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ image: null }));
        });
        step2.end();
      });
    });
    step1.on("error", (e) => {
      log("IMG-ERR", e.message);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ image: null }));
    });
    step1.end();
  });
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];

  // Debug log endpoint — writes to demo1-memory-inspector/debug.log
  if (req.method === "POST" && urlPath === "/api/log") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      const logFile = path.join(ROOT, "demo1-memory-inspector", "debug.log");
      fs.appendFileSync(logFile, body + "\n");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"ok":true}');
    });
    return;
  }

  // Proxy endpoint
  if (req.method === "POST" && urlPath === "/api/chat") {
    return handleApiChat(req, res);
  }

  // Web search proxy (DuckDuckGo HTML — no API key needed)
  if (req.method === "POST" && urlPath === "/api/web-search") {
    return handleWebSearch(req, res);
  }

  // DuckDuckGo image search (no API key needed)
  if (req.method === "POST" && urlPath === "/api/product-images") {
    return handleProductImages(req, res);
  }

  // Static files
  let filePath = path.join(ROOT, urlPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("404 Not Found: " + urlPath);
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });

    // Inject API key as a global (still useful for demo1 which has its own proxy)
    if (ext === ".html" && API_KEY) {
      const html = data.toString().replace(
        "</head>",
        `<script>window.__APIKEY__="${API_KEY}"</script>\n</head>`
      );
      res.end(html);
    } else {
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n  Agentic AI Demos`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  http://localhost:${PORT}/`);
  console.log(`  API key loaded: ${API_KEY ? "yes (" + API_KEY.slice(0,12) + "...)" : "NO - check .env"}`);
  console.log(`  Proxy: POST /api/chat -> api.anthropic.com`);
  console.log(`  ─────────────────────────────────────\n`);
});
