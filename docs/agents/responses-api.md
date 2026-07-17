# Responses API

**Status:** Initial source-backed topic
**Checked:** 2026-07-14

## Positioning

The Responses API is OpenAI's primary interface for generating model responses
in applications that need text, image or file inputs, structured outputs,
conversation state, streaming, tool use, and background execution. It is the
lower-level API foundation beneath many agentic workflows.

Use the Responses API directly when the application should own orchestration,
state, tool dispatch, persistence, retries, and approval boundaries. Use the
Agents SDK when a managed agent runtime should coordinate the loop, tools,
handoffs, sessions, and tracing.

## Architecture

```text
Application request
        |
        v
Prompt + input items + model settings
        |
        +--> Optional conversation or previous_response_id
        +--> Optional tools
        +--> Optional structured output schema
        +--> Optional background or streaming mode
        |
        v
POST /v1/responses
        |
        v
Response object
        |
        +--> Output text or structured data
        +--> Tool call items
        +--> Usage and metadata
        +--> Stored response state, if enabled
```

The application boundary remains responsible for user identity, tenancy,
authorization, retrieval policy, tool execution, audit logging, and deciding
whether a model/tool result is safe to expose.

## Core API Surfaces

| Surface | Production role |
| --- | --- |
| `input` | Text, image, or file inputs used to generate a response. |
| `instructions` | System or developer message for the current response. |
| `model` | Model selection with explicit cost, latency, and capability tradeoffs. |
| `text` | Plain text or structured JSON output configuration. |
| `tools` | Built-in tools, MCP tools, or custom function calls available to the model. |
| `tool_choice` | Control over whether and how the model selects tools. |
| `previous_response_id` | Continue stateful interactions from a previous response. |
| `conversation` | Attach a response to a managed conversation object. |
| `store` | Control whether generated responses are stored for later retrieval. |
| `stream` | Stream response events to the client as server-sent events. |
| `background` | Run long-running responses asynchronously. |
| `metadata` | Attach queryable application metadata for tracking and operations. |
| `safety_identifier` | Stable abuse-prevention identifier for an end user. |

## When To Use It Directly

Use direct Responses API integration when:

- The workflow has simple control flow.
- Tool dispatch must stay fully application-owned.
- Latency and cost need tight, custom optimization.
- The product already has strong persistence, queueing, and observability layers.
- You need exact API-level control over state, streaming, retries, or storage.

Use an agent framework when multi-step orchestration, handoffs, session handling,
or tracing would otherwise become custom framework code.

## Prompt Design

Keep prompt design explicit and versioned.

- Put durable behavior in `instructions`.
- Put user or request content in `input`.
- Use structured outputs for downstream automation.
- Keep tool-use instructions aligned with actual tool schemas and permissions.
- Version prompts alongside evaluation cases and response contracts.
- Prefer small, composable prompt templates over large implicit policies.

For stateful workflows, remember that new `instructions` can replace prior
instructions when using `previous_response_id`. Do not rely on prior system or
developer messages being implicitly carried forward without verifying the state
mode being used.

## Retrieval Strategy

For RAG, retrieval should be application-controlled before sending context to
the model unless the product intentionally uses built-in file search or MCP
tools.

Recommended pattern:

1. Authenticate the user and resolve tenant scope.
2. Retrieve with metadata filters for tenant, product, version, and freshness.
3. Combine vector recall with keyword matching for exact identifiers.
4. Rerank and truncate evidence before model input.
5. Pass compact evidence with source IDs, timestamps, and confidence metadata.
6. Require citations or structured evidence fields when answers must be
   auditable.

Use built-in file search when OpenAI-managed retrieval fits the data-governance
model. Use application-owned retrieval when the product needs custom indexing,
hybrid ranking, strict tenancy controls, or domain-specific freshness rules.

## Tool Strategy

Responses API tool support spans built-in tools, MCP tools, and custom function
calls. Treat each as a different boundary:

- Built-in tools are convenient for platform-supported capabilities such as web
  search or file search.
- MCP tools integrate external systems through a protocol boundary.
- Function calls expose application-owned code with typed arguments.

Production tool calls should have schemas, timeouts, retry policy, idempotency
rules, permission checks, and audit logs. Side-effecting tools should require
approval or a domain-specific safety check before execution.

## Evaluation Metrics

Evaluate both final outputs and intermediate API behavior.

| Metric | What it catches |
| --- | --- |
| Contract validity | Whether structured outputs match schema and downstream expectations. |
| Groundedness | Whether claims are supported by retrieved, uploaded, or tool-produced evidence. |
| Tool-call precision | Whether the model calls tools only when useful and with valid arguments. |
| State correctness | Whether multi-turn workflows preserve and apply the right context. |
| Latency by mode | Non-streaming, streaming, background, retrieval, and tool-call latency. |
| Cost per successful task | Token, tool, and storage cost normalized by task completion. |
| Refusal and safety quality | False positives, false negatives, and policy consistency. |
| Recovery rate | Whether retries, resumed state, and user corrections complete cleanly. |

Keep eval fixtures for happy paths, malformed inputs, stale retrieval,
unauthorized data, tool failure, long context, and multi-turn state drift.

## Reliability And Operations

- Set explicit token and tool-call budgets for production workflows.
- Choose state mode deliberately: application-managed history,
  `previous_response_id`, or managed conversations.
- Use `metadata` for correlation IDs, workflow names, and environment labels.
- Decide whether `store` is appropriate for the data-governance posture.
- Use streaming for responsive UX; use background mode for long-running tasks.
- Log request IDs, response IDs, tool-call IDs, latency, token usage, and error
  classes.
- Add replayable test cases for prompt, model, and tool-schema changes.

## Security

- Enforce authorization before retrieval, file access, MCP access, and function
  execution.
- Validate function-call arguments with schemas and domain rules.
- Avoid sending secrets, raw credentials, or unnecessary regulated data in
  prompts, files, or metadata.
- Use stable, privacy-preserving user identifiers for abuse and safety systems.
- Treat external content from retrieval or web tools as untrusted input.
- Require explicit approval for irreversible or high-impact side effects.
- Keep audit records of prompt version, model, tools, state mode, response ID,
  and final output.

## Production Checklist

- Select the model by capability, latency, and cost target.
- Define prompt templates and structured output schemas.
- Decide state strategy before implementation.
- Decide retrieval ownership and citation requirements.
- Define allowed tools and approval boundaries.
- Add evals for output quality, tool use, state, security, and cost.
- Instrument usage, latency, errors, and response IDs.
- Review API reference changes before upgrading SDK or request schemas.

## Primary Sources

- [Responses API reference](https://platform.openai.com/docs/api-reference/responses)
- [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [Conversation state](https://developers.openai.com/api/docs/guides/conversation-state)
- [Using tools](https://developers.openai.com/api/docs/guides/tools)
- [Structured output](https://platform.openai.com/docs/guides/structured-outputs)
- [Function calling](https://platform.openai.com/docs/guides/function-calling)
