# Evaluation

**Status:** Initial source-backed topic
**Checked:** 2026-07-15

## Positioning

Evaluation is the discipline of measuring whether an AI system behaves well
enough to ship, monitor, and improve. For production systems, evals are not just
model benchmarks. They are release gates for prompts, retrieval, tools,
guardrails, agents, latency, cost, and safety.

Every meaningful AI workflow should have at least one repeatable eval before it
is treated as production-ready.

## Evaluation Stack

```text
Task definition
  |
  v
Dataset: inputs, expected behavior, metadata
  |
  v
System under test: model + prompt + retrieval + tools
  |
  v
Graders: exact, rubric, model-graded, custom code
  |
  v
Metrics + regression thresholds
  |
  v
Release decision and monitoring
```

The unit under test should match the product risk. A model-only eval is useful
for model selection, but an agent workflow needs workflow-level evals that cover
tool calls, state, handoffs, and recovery.

## Dataset Design

Good eval datasets are small enough to inspect and representative enough to
catch regressions.

- Include real user tasks, not only synthetic prompts.
- Label expected behavior and unacceptable behavior.
- Add metadata for difficulty, domain, source set, tenant scope, and risk level.
- Keep a stable regression set and a separate exploratory set.
- Include negative cases where the correct behavior is refusal, escalation, or
  "not enough information."
- Version datasets with prompts, tool schemas, and retrieval indexes.

For RAG systems, store expected source IDs as part of the eval case. For agents,
store expected tool-call patterns and approval requirements.

## Grader Strategy

Use the cheapest reliable grader for each dimension.

| Grader type | Best fit | Failure mode |
| --- | --- | --- |
| Exact match | IDs, enums, booleans, schema validity. | Too brittle for natural language. |
| Rule-based code | Structured outputs, citations, forbidden fields, tool-call shape. | Misses semantic errors. |
| Human review | High-risk quality and safety judgments. | Slow and expensive. |
| Model grader | Semantic correctness, rubric scoring, style, groundedness. | Needs calibration and spot checks. |
| Pairwise comparison | Ranking prompt/model variants. | Can hide absolute quality problems. |

Model graders should have rubrics, examples, and calibration checks. Do not use
a model grader as the only arbiter for high-risk behavior without human review
or deterministic constraints.

## Metrics

| Metric | What it catches |
| --- | --- |
| Task success rate | Whether the workflow solves the user goal. |
| Correctness | Whether the answer is factually or procedurally right. |
| Groundedness | Whether claims are supported by evidence. |
| Tool-call validity | Whether tool arguments and sequencing are correct. |
| Safety pass rate | Whether policy, privacy, and refusal behavior work. |
| Regression delta | Whether a change is better or worse than baseline. |
| Latency | p50, p95, p99 by workflow stage. |
| Cost | Tokens, retrieval, tool execution, and infrastructure cost. |
| Flake rate | Non-deterministic pass/fail behavior across repeated runs. |
| Human escalation rate | How often automation needs review or approval. |

Track both quality and operational metrics. A prompt that improves quality while
doubling latency or tool calls may still be a bad production change.

## Release Gates

Use evals as gates in CI/CD:

1. Unit tests for parsers, tool schemas, and deterministic code.
2. Small smoke eval for every prompt or tool change.
3. Full regression eval before release.
4. Human review for high-risk behavior changes.
5. Production monitoring tied back to eval dimensions.

Set explicit thresholds. Example: "RAG groundedness must not drop more than two
percentage points from baseline, and cross-tenant leakage tests must be zero."

## Agent Workflow Evals

Agent evals should inspect the path, not only the final answer.

- Which tools were called?
- Were arguments valid?
- Was user approval requested when needed?
- Did the agent stop within the turn budget?
- Did it recover from tool errors?
- Did handoffs go to the right specialist?
- Were traces, logs, and final outputs correlated?

Trace-based evals are especially useful because they let graders inspect
intermediate tool calls, retrieval results, state transitions, and errors.

## Production Checklist

- Define success criteria before changing prompts or models.
- Create a stable regression dataset.
- Add deterministic checks before model graders.
- Calibrate model graders against human labels.
- Track latency and cost alongside quality.
- Run evals on prompt, retrieval, tool, model, and schema changes.
- Store eval results with model, prompt version, dataset version, and code SHA.
- Make release thresholds explicit.

## Primary Sources

- [OpenAI evals guide](https://developers.openai.com/api/docs/guides/evals)
- [OpenAI graders guide](https://developers.openai.com/api/docs/guides/graders)
- [OpenAI Agents SDK evaluation guide](https://developers.openai.com/api/docs/guides/agents-sdk-eval)
