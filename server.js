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
