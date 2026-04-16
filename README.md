# MLDS 2026: Agentic AI — Live Demos

Four self-contained, interactive demos for the internal tech talk at vThink Global Technologies. Each demo targets a specific engineering concern in agentic AI: memory, access control, database isolation, and output quality.

---

## Prerequisites

- **Node.js** v20.6+ (uses `--env-file`)
- An **Anthropic API key** in `demo1-memory-inspector/.env`
- Chrome or Firefox

---

## Running

```bash
# Start (serves all demos on http://localhost:3000)
node --env-file=demo1-memory-inspector/.env server.js

# Or use the Claude Code slash commands:
#   /start   — kills stale process, starts server, opens Chrome
#   /stop    — kills the server
```

The API key is loaded server-side and proxied — it never reaches the browser.

---

## Demos

### Demo 01: Memory Inspector

Visualises how an agent organises information across STM, Episodic, Semantic, and Procedural memory buckets. Buckets update in real time as you chat. Toggle STM/LTM on and off to show the difference between a stateless assistant and one with persistent memory.

### Demo 02: ABAC Guardian

Compares RBAC (role-based) vs ABAC (attribute-based) access control. Same user, same prompt — RBAC over-executes and takes down the whole site; ABAC scopes the action precisely to what was requested.

### Demo 03: Branch Explorer

Shows how an agent uses database branching to safely explore multiple migration strategies in parallel. Failed branches turn red, the winning branch merges back to production.

### Demo 04: RLAIF Lab

Shows how grounding an agent against a knowledge base reduces factual errors over iterations. In ungrounded mode, the agent generates a research brief in a single shot. In grounded mode, a second model cross-checks every claim against verified facts and returns corrections. The first model rewrites incorporating those corrections. A word-level diff highlights changes, and metrics track edit distance decreasing with each iteration.

---

## Project structure

```
├── index.html                          Landing page
├── server.js                           Static server + Anthropic API proxy
├── demo1-memory-inspector/
│   ├── index.html                      Single-file React app
│   └── .env                            ANTHROPIC_API_KEY (gitignored)
├── demo2-abac/index.html
├── demo3-serverless-branching/index.html
├── demo4-grounded-rlaif/index.html
├── knowledge/                          Background reading per topic
│   ├── 01-agent-memory.md
│   ├── 02-abac-in-agentic-systems.md
│   ├── 03-database-branching-for-agents.md
│   └── 04-grounded-rlaif.md
└── .claude/commands/                   /start and /stop slash commands
```

Each demo is a single self-contained HTML file. No build step, no bundler. React 18 + Babel loaded from CDN.

---

## Models used

| Role | Model |
|------|-------|
| Main agent reasoning | `claude-sonnet-4-6` |
| Fast extraction / evaluation | `claude-haiku-4-5-20251001` |
