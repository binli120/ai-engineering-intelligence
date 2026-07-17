# Observability

**Status:** Initial source-backed topic
**Checked:** 2026-07-15

## Positioning

Observability for AI systems means being able to understand what happened,
why it happened, how much it cost, and whether it was acceptable. Traditional
logs, metrics, and traces still matter, but AI systems add model inputs,
outputs, retrieval results, tool calls, guardrail decisions, eval scores, and
human feedback.

The goal is not to collect every token forever. The goal is to capture enough
structured telemetry to debug incidents, measure quality, control cost, protect
users, and improve the system.

## Telemetry Model

```text
User request
  |
  v
Trace
  |
  +--> prompt/model span
  +--> retrieval span
  +--> tool-call span
  +--> guardrail span
  +--> handoff span
  +--> final-response span
  |
  v
Metrics + logs + eval outcomes + feedback
```

Use traces for causal flow, metrics for aggregate health, logs for event detail,
and evals for quality judgments.

## Core Signals

| Signal | Examples |
| --- | --- |
| Request metadata | user-safe ID, tenant, workflow, environment, prompt version, model. |
| Model usage | input tokens, output tokens, reasoning tokens, cached tokens, cost estimate. |
| Latency | total latency, model latency, retrieval latency, tool latency, streaming time. |
| Retrieval | query, index, filters, chunk IDs, scores, citations, miss rate. |
| Tool calls | tool name, arguments, approval state, result type, duration, error class. |
| Guardrails | policy checks, trigger reason, blocked output, escalation state. |
| Agent state | turn count, handoffs, session ID, stop reason, retries. |
| Quality | eval score, user feedback, human review labels, defect category. |
| Safety | refusal, moderation, data-leakage checks, prompt-injection detection. |

Record IDs and metadata even when sensitive payloads cannot be stored.

## Trace Design

Each production request should have one root trace ID. Every model call,
retrieval call, MCP/tool call, guardrail, and final output should attach to that
trace.

Minimum span attributes:

- `workflow.name`
- `environment`
- `tenant_safe_id`
- `prompt.version`
- `model.name`
- `tool.name`, when applicable
- `retrieval.index`, when applicable
- `response.id`, when applicable
- `error.type`, when applicable

Do not put secrets, raw credentials, or sensitive user content in span
attributes. Use payload sampling, redaction, and access-controlled trace storage.

## Metrics

Track metrics by workflow and release version:

- p50, p95, and p99 latency.
- Success, refusal, escalation, and error rates.
- Tokens and cost per successful task.
- Tool-call count and failure rate.
- Retrieval hit rate and citation coverage.
- Guardrail trigger rate.
- Eval score trend.
- Human correction rate.
- User feedback rate.

Dashboards should answer whether the system is healthy, whether quality changed
after a release, and where cost or latency is moving.

## Logs

Logs should be structured and correlated with traces.

Recommended event types:

- `request.received`
- `retrieval.completed`
- `tool.called`
- `tool.failed`
- `guardrail.triggered`
- `model.completed`
- `human_approval.requested`
- `response.returned`
- `eval.completed`

Keep logs concise. Store large prompts, retrieved chunks, and model outputs in a
separate access-controlled artifact store when they are needed for debugging.

## Alerting

Alert on user-visible and safety-critical failures:

- Error rate or timeout spike.
- Cost per task spike.
- Tool failure spike.
- Cross-tenant access violation.
- Unsafe action without approval.
- Groundedness or eval score drop.
- Citation coverage collapse.
- Unusual prompt-injection or guardrail trigger rate.

Avoid alerting on every single model oddity. Route low-confidence quality
signals into review queues and eval backlogs.

## Evaluation Integration

Observability and evaluation should share identifiers. A production trace that
causes a defect should become an eval case. An eval failure should link back to
the prompt version, model, retrieval results, and tool sequence that produced
it.

Feedback loop:

1. Detect issue in traces, metrics, logs, or user feedback.
2. Convert the failing case into a regression eval.
3. Fix prompt, retrieval, tool, guardrail, or model selection.
4. Run evals before release.
5. Monitor the same metric after release.

## Privacy And Governance

- Decide which payloads may be stored before launch.
- Redact secrets and regulated data before logging.
- Apply retention windows by data class.
- Restrict access to traces with user content.
- Sample payloads differently across dev, staging, and production.
- Keep audit records for tool calls, approvals, and externally visible actions.

## Production Checklist

- Add trace IDs across model, retrieval, tool, and response layers.
- Emit structured logs with trace correlation.
- Track latency, cost, error, and quality metrics by workflow.
- Store prompt version, model, source IDs, and tool-call IDs.
- Add redaction and retention policy before logging payloads.
- Build dashboards for release regression, cost, latency, and quality.
- Convert production defects into eval cases.

## Primary Sources

- [OpenAI Agents SDK tracing](https://openai.github.io/openai-agents-python/tracing/)
- [OpenTelemetry traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [OpenTelemetry metrics](https://opentelemetry.io/docs/concepts/signals/metrics/)
- [OpenTelemetry logs](https://opentelemetry.io/docs/concepts/signals/logs/)
