# Agentic Commerce

## What Is Agentic Commerce?

Agentic commerce is the pattern where an AI agent handles the full purchase journey end-to-end — from interpreting a natural language intent ("buy me trekking shoes for Ladakh under ₹5000") through research, product evaluation, and checkout — without the user touching a search bar or filter panel.

The agent does what a knowledgeable friend would do: understand the real need behind the request, research conditions or constraints the user may not have thought of, compare options against those constraints, and hand off a purchase-ready decision.

---

## The Pipeline

Demo 05 runs a five-step agentic pipeline, each step visible to the audience in real time:

### Step 1 — Parse Intent
A fast model (Haiku) converts the free-text intent into a structured JSON object: category, budget, context, requirements list, and an optimised search query. This is the agent's "understanding" layer — extracting machine-readable signal from human language.

### Step 2 — Context Research
Before searching, the agent researches the purchase context. If a location is mentioned (e.g. Ladakh), it analyses terrain, altitude, weather, and what those conditions imply for the product. For non-location intents (e.g. "college laptop"), it researches the use case. This step adds requirements the user didn't explicitly state but definitely needs — it's the difference between a reactive search and a proactive advisor.

### Step 3 — Search Products
The agent queries DuckDuckGo's HTML search (server-side, no API key) for real product listings on Flipkart and Amazon India. Results are passed to the evaluator as grounding context. If search returns nothing, the agent falls back to Claude's training knowledge of Indian e-commerce products.

### Step 4 — Evaluate & Rank
Sonnet evaluates the candidate products against all requirements (from intent + context research), scores each 1–10, and streams its reasoning to the audience in real time. Tables, bullet points, and pro/con breakdowns are rendered via marked.js. The final structured picks (name, price, score, pros, cons, image query, shopping URLs) are embedded as a JSON block and extracted programmatically.

### Step 5 — Product Images
After picks are extracted, the agent fetches real product images in parallel via DuckDuckGo's image search (2-step: HTML page → vqd token → i.js API). Images load asynchronously into the product cards without blocking the recommendations.

---

## Google Universal Checkout Protocol (UCP)

Google UCP is a proposed standard for merchant-agnostic, agent-executable checkout. It defines a structured payload that any compliant storefront can accept to complete a purchase without the buyer navigating a checkout flow.

**Key fields in a UCP payload:**
```json
{
  "protocol": "google.ucp.v1",
  "intent": "purchase",
  "buyer": { "locale": "en-IN", "currency": "INR" },
  "item": {
    "title": "Quechua Forclaz 500 Mid Waterproof",
    "price": { "amount": "4299", "currency": "INR" },
    "merchant": { "name": "Flipkart", "id": "flipkart.com" }
  },
  "checkout": {
    "type": "express",
    "sessionId": "ucp_a3f9bc12",
    "expiresAt": "2026-04-30T16:00:00Z",
    "paymentMethods": ["UPI", "card", "net_banking", "wallet"]
  }
}
```

In Demo 05, the UCP payload is simulated — the schema is real, the API call is not (UCP access requires an approved merchant account). The demo shows what the agent would hand off to a checkout executor.

---

## Why This Matters for Agentic AI

### Tool use is not optional
A shopping agent without tools (search, image fetch, structured output) produces hallucinated product names and made-up prices. Tool use grounds the agent in real-world data.

### Streaming reasoning builds trust
Showing the agent's step-by-step evaluation in real time — including why it rejected options — makes the decision legible. Opaque recommendations are harder to trust and act on.

### Context research changes outcomes
A naive agent asked for "trekking shoes under ₹5000" returns any cheap shoe. An agent that first researches Ladakh (10,000–17,500 ft altitude, rocky scree, sub-zero nights) returns waterproof, high-ankle boots with multi-lug soles. The context step is what separates an assistant from an advisor.

### Structured output extraction
Claude streams markdown for human readability, then embeds a machine-readable JSON block at the end. The client strips the JSON from the display and uses it to render product cards. This pattern — human-readable stream + embedded structured payload — is a reliable way to get both streaming UX and programmable output from a single model call.

---

## Engineering Considerations

| Concern | Approach in Demo 05 |
|---------|---------------------|
| Product data source | DuckDuckGo HTML search (no API key) |
| Product images | DuckDuckGo image search (2-step vqd flow) |
| Checkout protocol | Google UCP v1 (simulated) |
| Streaming | SSE via `/api/chat` proxy, rendered with marked.js |
| Fallback | If search returns no results, Claude uses training knowledge of Indian e-commerce |
| Bot detection | Server-side requests with realistic User-Agent headers |

---

## Further Reading

- [Google Checkout with AI Agents](https://developers.google.com/pay) — Google Pay developer docs
- [Anthropic Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) — how to give Claude tools
- [DuckDuckGo Search API (unofficial)](https://duckduckgo.com/duckduckgo-help-pages/results/get-started/) — DDG search behaviour
- [marked.js](https://marked.js.org/) — markdown renderer used for reasoning panel
