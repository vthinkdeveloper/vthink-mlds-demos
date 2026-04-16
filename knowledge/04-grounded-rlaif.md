# Grounded RLAIF: Reinforcement Learning from AI Feedback

## Background

Training and improving large language models traditionally requires human feedback. A human evaluates two model responses, picks the better one, and that preference signal is used to update the model's behaviour. This process: Reinforcement Learning from Human Feedback (RLHF): is how most current models have been fine-tuned.

The problem is scale. Human feedback is expensive and slow. As models are deployed into more specialised domains, getting enough high-quality human labels to cover every scenario becomes impractical.

RLAIF (Reinforcement Learning from AI Feedback) replaces the human rater with another model. A second AI evaluates the output of the first and provides the feedback signal. This dramatically reduces cost and can operate continuously at production scale.

---

## The hallucination problem

RLAIF in its basic form has a significant weakness: if the evaluator model has the same blind spots as the model being evaluated, it will reinforce those blind spots rather than correcting them.

A model that confidently makes up plausible-sounding facts will generate responses that another model also finds plausible: because the evaluator has no independent source of truth to check against. The feedback loop amplifies confidence without improving accuracy.

This is where grounding comes in.

---

## What grounding means

A grounded evaluation uses an external, verified source of truth as a reference when assessing model output. Rather than asking "does this response sound good?", the evaluator asks "does this response align with what we know to be true?"

The verified source can be:
- A curated knowledge base of factual statements
- Retrieved documents from a vector search
- Structured data from a database
- Tool outputs (search results, API responses)

When the evaluator finds a claim in the model's output that contradicts or is absent from the verified source, it flags it as a correction. The model then rewrites its output to incorporate those corrections.

---

## How the demo implements this

The demo runs a three-step pipeline in grounded mode:

**Step 1: Generate.** A capable model produces an initial draft of the requested content. The output is confident and well-structured, but may contain claims that are imprecise or wrong relative to the verified facts.

**Step 2: Cross-check.** A smaller, faster model receives both the draft and the verified knowledge base. It identifies specific phrases in the draft that contradict or deviate from the facts, and returns a structured list of corrections.

**Step 3: Rewrite.** The main model rewrites the draft, incorporating the corrections. The output now reflects the verified facts rather than the model's unchecked priors.

The diff between the original draft and the corrected draft is shown inline: deleted text in red, inserted text in green. This makes the effect of grounding immediately visible.

---

## Edit distance as a quality signal

Edit distance measures how many word-level changes occurred between the original and corrected draft. A high edit distance means the original draft had significant inaccuracies and needed substantial correction. A low edit distance means the model got most things right from the start.

Over multiple iterations: where each corrected draft becomes the starting point for the next: edit distance should decrease. The model's output is progressively brought into alignment with the verified facts. This downward trend is the "self-correction" signal: the agent is improving its output rather than repeating the same errors.

In production systems, edit distance (or similar metrics) can be used to:
- Decide when an output is "good enough" to exit the correction loop
- Track model quality over time across different topics or tasks
- Identify domains where the base model has particularly poor factual accuracy and needs more grounding

---

## Practical considerations

**Latency.** A three-step pipeline adds overhead. In interactive applications, this may be acceptable if the output quality improvement is meaningful. In high-throughput systems, grounding is often applied asynchronously or only to outputs that will be shown to end users, not to intermediate agent reasoning steps.

**Knowledge base quality.** Grounding is only as good as the facts it grounds against. Stale, incomplete, or incorrect verified facts will produce incorrect corrections. Maintaining the knowledge base is an ongoing operational responsibility.

**Confidence calibration.** The goal is not to produce maximally hedged output. A grounded model should be confident where the facts support confidence, and appropriately cautious where they do not. The feedback loop should reward accuracy, not just reduce assertion strength.
