# OpenAI Agents SDK

**Status:** Verified against official documentation
**Checked:** 2026-07-14

## Positioning

The OpenAI Agents SDK is a Python framework for agentic applications that need a
managed loop around model calls, tool execution, handoffs, guardrails, sessions,
streaming, and tracing. The documented core primitives are intentionally small:
agents, tools, handoffs, guardrails, sessions, and tracing.

The SDK uses the Responses API by default for OpenAI models, but it adds a
higher-level runtime. Use the Responses API directly when the application owns
the loop, tool dispatch, and state handling. Use the Agents SDK when the runtime
should coordinate turns, execute tools, apply guardrails, manage sessions, or
delegate work across agents.

## Architecture

```text
User or service request
        |
        v
Application boundary
        |
        v
Runner + RunConfig
        |
        v
Agent instructions + model settings + context
        |
        +--> Model call
        |
        +--> Function tools / hosted tools / MCP tools
        |
        +--> Guardrails
        |
        +--> Handoffs or agents-as-tools
        |
        +--> Session history
        |
        v
RunResult / streamed events / trace data
```

The important production boundary is the application layer around `Runner`.
That layer should own authentication, user authorization, tenancy, rate limits,
tool permissions, persistence, audit logging, and the decision to expose a final
answer or request human approval.

## Core APIs

| API surface | Production role |
| --- | --- |
| `Agent` | Defines instructions, model selection, tools, handoffs, output type, and behavior for one specialist. |
| `Runner` | Executes the agent loop. Documented run modes include async, sync, and streamed execution. |
| `RunConfig` | Overrides per-run behavior such as model/provider defaults, guardrails, tracing, and tool execution settings. |
| Function tools | Expose typed Python functions to the agent with schema generation and validation. |
| MCP tools | Let agents call tools exposed by Model Context Protocol servers. |
| Guardrails | Validate inputs or outputs and fail fast when checks do not pass. |
| Handoffs | Transfer control to another agent when a specialist should take over the workflow. |
| Sessions | Preserve conversation history across runs without manually replaying every message. |
| Tracing | Capture agent execution for debugging, monitoring, optimization, and evaluation workflows. |

## Strengths

- Small conceptual surface compared with graph-first orchestration frameworks.
- First-class function tools, hosted tools, MCP tools, handoffs, and agents as
  tools.
- Built-in runner loop that handles model calls, tool calls, handoffs, and
  max-turn protection.
- Sessions for automatic conversation history management across runs.
- Built-in tracing for debugging and monitoring agent workflows.
- Run configuration hooks for model/provider defaults, tool execution behavior,
  guardrails, tracing metadata, and error handling.
- Direct fit for OpenAI platform primitives while still allowing explicit
  application-level control around the runner.

## Considerations

- Confirm feature maturity against release notes because the SDK changes
  actively.
- Keep direct Responses API paths for simple, latency-sensitive, or fully custom
  loops.
- Treat sandbox-agent and durable-execution patterns as operational features
  that require environment-specific validation.
- Establish explicit tool permissions, approval boundaries, and audit records
  before enabling side-effecting tools.
- Do not put authorization, tenancy isolation, or sensitive-data policy solely in
  prompts. Enforce those controls in application code before tools execute.
- Decide whether traces may include sensitive model or tool inputs and outputs;
  configure trace inclusion accordingly.

## Prompt Design

Use prompts as role and task contracts, not as the only control plane.

- Define the agent's responsibility, scope, and escalation conditions in
  `instructions`.
- Keep tool-selection guidance specific: when to call each tool, what inputs are
  valid, and what failures require human review.
- Put tenant, user, and request-specific context in runtime context rather than
  hard-coded instructions.
- Use typed outputs for workflows that feed downstream systems.
- Keep safety-critical constraints mirrored in code-level guardrails or tool
  validators.

## Retrieval Strategy

For RAG workflows, keep retrieval outside the model prompt boundary until the
application has enforced access control and evidence quality.

Recommended boundary:

1. The application authenticates the user and resolves tenant scope.
2. Retrieval searches only authorized indexes.
3. A reranker or deterministic filter removes stale, low-quality, or
   unauthorized chunks.
4. The agent receives compact evidence with source IDs, timestamps, and
   relevance scores.
5. Tools expose follow-up retrieval only through the same authorization and
   logging path.

Use vector search for semantic recall, keyword search for exact identifiers, and
metadata filters for tenant, product, version, and freshness. Prefer hybrid
retrieval when production answers require both semantic matching and exact
source attribution.

## Evaluation Metrics

Evaluate the agent at the workflow level, not only at the final-answer level.

| Metric | What it catches |
| --- | --- |
| Task success rate | Whether the full agent workflow completes the user goal. |
| Tool precision and recall | Whether the agent calls the right tools and avoids unnecessary calls. |
| Handoff accuracy | Whether work moves to the right specialist agent at the right time. |
| Groundedness | Whether final claims are supported by retrieved or tool-produced evidence. |
| Guardrail trigger quality | False positives and false negatives in input/output validation. |
| Latency by phase | Model time, retrieval time, tool time, handoff overhead, and streaming time. |
| Cost per successful task | Token usage and tool/runtime cost normalized by successful completion. |
| Human escalation rate | How often the workflow needs review, approval, or correction. |
| Recovery rate | Whether retries, resumes, and error handlers complete after partial failure. |

Keep golden test cases for normal paths, adversarial inputs, tool failures,
stale retrieval, unauthorized retrieval, and interrupted runs.

## Reliability And Operations

- Set max-turn limits for every production workflow.
- Make side-effecting tools idempotent or require approval before execution.
- Store correlation IDs across request logs, tool logs, trace IDs, and final
  outputs.
- Apply retries at the right layer: transient network failures may be retried,
  but business-rule failures should return structured errors.
- Make tool errors visible enough for the model to recover, but avoid leaking
  secrets, stack traces, or internal identifiers.
- Version agent instructions, tool schemas, and evaluation datasets together.
- Use separate environments for development, staging, and production traces.

## Security

- Enforce authorization before retrieval and before tool execution.
- Validate all tool inputs with schemas and domain rules.
- Restrict filesystem, network, shell, and external API tools by default.
- Require approval for irreversible or high-impact operations.
- Redact secrets and regulated data from prompts, tool outputs, logs, and traces.
- Add prompt-injection tests for retrieved content and external tool responses.
- Keep an audit trail of user request, selected agent, tool calls, approvals,
  outputs, and trace IDs.

## Example Workflow

The companion example directory is `examples/openai_agents`. Its first target
is a text agent with one typed function tool and a clear approval boundary.
That is the right initial slice because it exercises the SDK's core loop
without adding sandbox, realtime, or durable-execution complexity.

## Suggested learning path

1. Quickstart: one agent
2. Function tool
3. Multiple agents and handoffs
4. Guardrails
5. Sessions
6. Tracing and usage
7. Human approval
8. Durable execution
9. MCP
10. Sandbox execution

## Production Checklist

- Define one agent per responsibility; avoid broad "do everything" agents.
- Document every tool's side effects, timeout, retry policy, and approval needs.
- Add typed input/output models for tools and downstream-facing responses.
- Add evaluation cases before expanding to multi-agent orchestration.
- Decide when to use sessions versus explicit application-managed history.
- Configure trace metadata with workflow, tenant-safe correlation ID, and
  environment.
- Review release notes before upgrading the SDK.

## Primary sources

- [Official SDK documentation](https://openai.github.io/openai-agents-python/)
- [Quickstart](https://openai.github.io/openai-agents-python/quickstart/)
- [Agents](https://openai.github.io/openai-agents-python/agents/)
- [Tools](https://openai.github.io/openai-agents-python/tools/)
- [Running agents](https://openai.github.io/openai-agents-python/running_agents/)
- [Guardrails](https://openai.github.io/openai-agents-python/guardrails/)
- [Handoffs](https://openai.github.io/openai-agents-python/handoffs/)
- [Sessions](https://openai.github.io/openai-agents-python/sessions/)
- [Tracing](https://openai.github.io/openai-agents-python/tracing/)
- [Release notes](https://openai.github.io/openai-agents-python/release/)
