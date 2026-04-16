# Access Control in Agentic Systems: RBAC vs ABAC

## Why access control is harder with agents

Traditional software has a clear boundary: a human user clicks a button, the system checks their permissions, it either acts or refuses. The chain is short and deterministic.

Agents break this model. An agent might receive a vague natural-language instruction, interpret it, decide on a course of action, call tools, and take real-world effects: all without a human reviewing each step. The agent is the user now, and the system needs to make access decisions based on context that was never fully specified upfront.

This is where most simple permission systems fall short.

---

## Role-Based Access Control (RBAC)

RBAC is the dominant model in enterprise software. Users are assigned roles, and roles are assigned permissions.

```
User → Role → Permissions
```

It is easy to reason about and easy to implement. For a human user clicking through a UI, checking that someone has the "Admin" or "Engineer" role before granting access is usually enough.

For agents, RBAC has a critical weakness: it only checks *who* is asking, not *what* they are actually asking to do. An agent with an "Engineer" role can pass an RBAC check and proceed to take an action that is technically within the role's permissions but is wrong in the specific context: the wrong resource, the wrong time, or based on an ambiguous instruction.

The demo illustrates this directly. An IT Engineer submits a vague instruction to "update the network config." RBAC checks the role, passes the request, and the agent happily executes against the default target: which happens to be a production VLAN that exceeds what the user should be touching.

---

## Attribute-Based Access Control (ABAC)

ABAC evaluates a richer set of attributes before deciding whether to act. A decision is made based on:

- **Subject attributes**: who is asking, their role, their team, their seniority
- **Action attributes**: what they want to do, how specific the instruction is, whether the intent is clear
- **Resource attributes**: what specific resource is targeted, how sensitive it is
- **Environment attributes**: current time, change window, incident status, geographic location

The policy logic can be as simple or complex as needed. For the demo scenario:

```
Allow IF:
  role = IT Engineer
  AND intent is specific (VLAN is named)
  AND target VLAN is within user's permission ceiling
  AND current time is within the change window
```

If any attribute fails, the agent blocks the action and asks for clarification instead of executing blindly.

---

## Why this matters for agentic systems specifically

Agents operate with more autonomy and over longer action sequences than traditional software. A single misinterpreted or over-permissioned action can cascade: an agent that updates the wrong resource might then make further decisions based on the corrupted state.

ABAC gives agents a principled framework for pausing when the context is ambiguous. Rather than executing based on a partial match, the agent can surface the ambiguity to the user and request the missing information.

This is also why **intent checking** is a key attribute in agentic ABAC. The instruction "update the config" is not specific enough for an agent to act safely. A well-designed access control layer treats under-specified intent as a risk signal, not a green light.

---

## Practical implementation notes

In production, ABAC for agents is usually implemented as a policy evaluation step that runs before any tool call executes. Common approaches include:

- **Policy-as-code**: defining policies in a structured format (OPA/Rego is popular) that the agent runtime evaluates before each action
- **LLM-based policy evaluation**: using a fast, specialised model to evaluate whether a proposed action is within policy, as shown in the demo
- **Hybrid**: fast rule-based checks for known patterns, LLM evaluation for ambiguous cases

The tradeoff is latency vs flexibility. Hard-coded rules are fast but rigid. LLM-based evaluation handles nuance but adds an extra round-trip.
