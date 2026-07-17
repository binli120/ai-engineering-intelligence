# Model Context Protocol

**Status:** Initial source-backed topic
**Checked:** 2026-07-15

## Positioning

Model Context Protocol (MCP) is an open standard for connecting AI applications
to external systems. It standardizes how an AI host discovers and uses context,
tools, prompts, and workflows exposed by MCP servers.

MCP is not an agent framework. It does not define how a model reasons, plans,
retrieves, ranks context, evaluates answers, or manages product policy. It is a
protocol boundary between AI applications and external capabilities.

Use MCP when integrations should be reusable across clients such as coding
agents, chat applications, IDEs, internal assistants, and workflow tools. Use a
direct API integration when the capability is private to one application or
needs tighter coupling than a protocol boundary provides.

## Architecture

```text
User
  |
  v
MCP host
  |
  +--> MCP client for server A ---- transport ---- MCP server A
  |
  +--> MCP client for server B ---- transport ---- MCP server B
  |
  +--> MCP client for server C ---- transport ---- MCP server C
```

The host is the AI application. It coordinates model interaction and manages one
client per connected server. Each server exposes capabilities over MCP. Servers
can run locally, commonly over stdio, or remotely, commonly over Streamable HTTP.

## Layers

| Layer | Responsibility |
| --- | --- |
| Data layer | JSON-RPC protocol, lifecycle, capability negotiation, requests, responses, notifications, and primitives. |
| Transport layer | Message framing, connection establishment, auth, and communication over stdio or Streamable HTTP. |
| Application layer | User identity, product policy, permission checks, model/tool orchestration, logging, approval, and UX. |

The protocol layer is not a substitute for application-layer authorization. A
server can expose a tool schema, but the host and server still need clear rules
for who may call it, when it may run, and what data it may return.

## Core Primitives

| Primitive | Exposed by | Role |
| --- | --- | --- |
| Tools | Server | Executable functions such as API calls, file actions, database queries, or workflow steps. |
| Resources | Server | Data and context such as files, database records, documents, API responses, or schemas. |
| Prompts | Server | Reusable interaction templates and workflows. |
| Sampling | Client | Lets a server request model completions from the host application. |
| Elicitation | Client | Lets a server request more user input or confirmation through the host. |
| Logging | Client | Lets servers send diagnostic messages to clients. |
| Notifications | Both | Real-time updates such as tool-list changes or progress events. |

Experimental features such as tasks should be treated as unstable until the
target clients and servers explicitly support the same protocol version and
semantics.

## Lifecycle

A production MCP connection should make lifecycle state explicit:

1. Establish transport.
2. Initialize and negotiate protocol version.
3. Exchange client and server capabilities.
4. Discover available tools, resources, and prompts.
5. Register capabilities in the host's model/tool context.
6. Execute requests with correlation IDs, timeouts, and audit logs.
7. Handle notifications and capability changes.
8. Close or recycle the connection deliberately.

Version negotiation matters. If a client and server cannot agree on a compatible
protocol version, the connection should fail closed rather than degrade into
ambiguous behavior.

## Transport Strategy

| Transport | Best fit | Main concerns |
| --- | --- | --- |
| stdio | Local tools, local filesystem access, developer workflows, single-client process lifetime. | Process isolation, command trust, filesystem permissions, local secrets. |
| Streamable HTTP | Remote services, multi-client servers, SaaS integrations, enterprise deployments. | Authentication, tenant isolation, network latency, rate limits, retries, observability. |

Prefer stdio for tightly scoped local developer tooling. Prefer Streamable HTTP
when the server is a shared service, needs standard web auth, or must serve many
clients.

## Server Design

Design MCP servers around stable domain boundaries, not around whatever helper
function already exists.

- Keep tool names specific and namespaced.
- Write tool descriptions that state purpose, inputs, side effects, failure
  modes, and approval requirements.
- Use JSON Schema to validate every tool input.
- Separate read-only tools from state-changing tools.
- Return structured content where the host can preserve source IDs and metadata.
- Expose resources for context that should be read, not executed.
- Expose prompts only when reusable interaction templates are part of the domain.
- Emit logs and progress notifications for slow or long-running work.

Avoid one giant server with hundreds of unrelated tools. Tool-selection quality
and security review both degrade as the capability surface grows.

## Retrieval Strategy

MCP resources can be part of a RAG system, but MCP should not hide retrieval
policy.

Recommended boundary:

1. The host resolves user identity and tenant scope.
2. The MCP server enforces its own auth and data-access rules.
3. Resource responses include source IDs, versions, timestamps, and access
   scope.
4. The host ranks and truncates retrieved context before model use.
5. The final answer cites resources or tool outputs that support important
   claims.

For enterprise data, do not rely on the model to decide whether a resource is
authorized. Authorization must happen before the data reaches the model context.

## Prompt Design

Tool and resource descriptions are part of the prompt surface. They should be
short enough to fit in context and precise enough to drive correct selection.

Good descriptions include:

- What the capability does.
- When to use it.
- Required inputs and accepted formats.
- Whether it reads data or changes state.
- Approval or confirmation requirements.
- Important errors and recovery paths.

Do not bury security policy only in tool descriptions. The host and server must
enforce the same policy in code.

## Evaluation Metrics

| Metric | What it catches |
| --- | --- |
| Tool-selection precision | Whether the model calls the right MCP tool and avoids irrelevant tools. |
| Tool-call validity | Whether generated arguments satisfy schema and domain rules. |
| Authorization correctness | Whether unauthorized resources and actions are blocked. |
| Context relevance | Whether returned resources improve answer quality. |
| Latency by server | Slow servers, cold starts, network overhead, and retry cost. |
| Error recovery | Whether the host can recover from tool errors, timeouts, and disconnected servers. |
| Capability drift | Whether server changes break client assumptions or prompts. |
| Audit completeness | Whether each request records user, server, tool, arguments, result, and approval state. |

Keep golden tasks for every high-value server. Test happy paths, missing
permissions, malformed arguments, unavailable servers, prompt injection in
resource content, and state-changing tool approval.

## Security

Every MCP-server entry in this knowledge base must document permissions, data
exposure, authentication, destructive actions, and recommended deployment
boundary.

Minimum security requirements:

- Authenticate remote servers and validate expected server identity.
- Enforce user and tenant authorization before resource reads or tool calls.
- Treat resources and tool outputs as untrusted model input.
- Require human approval for irreversible, expensive, or externally visible
  actions.
- Separate read-only and state-changing capabilities.
- Redact secrets from prompts, logs, traces, and tool outputs.
- Add timeouts, rate limits, and circuit breakers per server.
- Pin or review third-party servers before use.
- Log request IDs, user IDs, server IDs, tool names, arguments, results,
  approvals, and failures.

Local MCP servers need a threat model too. A stdio server may have filesystem,
shell, network, or credential access through the local process environment.

## Production Checklist

- Define whether the server is local stdio or remote Streamable HTTP.
- Document auth, tenancy, and permission model.
- Separate resource reads, safe tools, and dangerous tools.
- Add input schemas and domain validation for every tool.
- Add clear descriptions for tool selection.
- Add timeout, retry, and cancellation policy.
- Add structured logs and correlation IDs.
- Add evals for tool selection, schema validity, auth, and failure recovery.
- Review protocol version compatibility before rollout.
- Run the server through MCP Inspector or equivalent client tests.

## Primary Sources

- [MCP introduction](https://modelcontextprotocol.io/docs/getting-started/intro)
- [MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture)
- [MCP specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18)
- [MCP tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [MCP resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)
- [MCP prompts](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts)
