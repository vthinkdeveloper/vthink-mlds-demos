# Agent Memory: Cognitive Architectures for AI Systems

## The core problem

A standard large language model has no persistent memory. Every conversation starts from scratch. For a simple chatbot that is fine, but agents that operate over long tasks, handle multiple users, or need to learn from past interactions require something more structured. This is the problem cognitive memory architectures solve.

The idea is borrowed from how human memory works: different types of information are stored and retrieved in different ways, and not all of it lives in active working memory at the same time.

---

## Memory types

### Short-Term Memory (STM)
Also called working memory or context. This is the information actively in play right now: the current conversation, the current task state, the tools the agent is using. It is fast to access but limited in size and cleared when the session ends.

In practice, STM maps directly to the LLM's context window. The longer the conversation, the more context is consumed. Agents that operate over hours or days need to summarise or offload to longer-term storage to avoid running out of context.

### Episodic Memory
A record of what happened in previous sessions: past conversations, decisions made, outcomes observed. Episodic memory lets an agent say "last week you asked me to schedule a report: here's the format you preferred."

Episodic memories are typically stored as text summaries or embeddings in a vector database and retrieved by semantic similarity when relevant.

### Semantic Memory
Facts and knowledge: things that are true independently of any specific event. This includes user preferences, domain knowledge, learned patterns about how a user works. Semantic memory is more stable than episodic memory and changes more slowly.

### Procedural Memory
How-to knowledge: the agent's learned routines and preferences for approaching tasks. "Always end retros with named owners and deadlines." "Prefer bullet points over paragraphs." Procedural memory shapes the agent's behaviour patterns rather than providing specific facts.

---

## How memory is extracted

In the demo, a fast secondary model runs after each conversation turn to extract new memories from the full exchange and classify them into the right bucket. This is a common pattern in production agentic systems.

The extraction is imperfect: the model might over-categorise or occasionally miss something: which is also realistic. Memory systems in production almost always include human review mechanisms or confidence thresholds to control what actually gets persisted.

---

## Why this matters in production

Agents that lack memory repeat themselves, lose context across sessions, and cannot personalise their behaviour. Agents that have poorly designed memory can accumulate stale or contradictory information and start behaving unpredictably.

Good memory architecture directly affects:
- **Personalisation**: the agent behaves differently for different users based on what it has learned
- **Continuity**: multi-day tasks can be resumed without re-explaining context
- **Efficiency**: relevant past information is surfaced instead of re-derived each time

The tradeoffs are between storage cost, retrieval latency, and the risk of the agent acting on outdated or incorrect memories.
