# Security

**Status:** Initial source-backed topic
**Checked:** 2026-07-15

## Positioning

AI application security extends normal application security with model-specific
risks: prompt injection, insecure output handling, tool misuse, excessive
agency, sensitive information disclosure, data poisoning, model denial of
service, and supply-chain exposure.

Treat an AI system as a distributed application with an untrusted probabilistic
component. The model can help decide what to do, but code must enforce
authorization, data boundaries, tool permissions, approval gates, and output
validation.

## Threat Model

```text
User input
  |
  v
Prompt and policy layer
  |
  +--> Retrieved content
  +--> Uploaded files
  +--> Tool outputs
  +--> MCP resources
  |
  v
Model decision
  |
  +--> Final answer
  +--> Function call
  +--> MCP tool call
  +--> File/search/browser action
  |
  v
Application enforcement boundary
  |
  v
External systems, data, users, and side effects
```

Every arrow crossing from untrusted content into model context is a prompt
injection boundary. Every arrow from model output into code, tools, files, APIs,
or users is an output-handling boundary.

## Core Risks

| Risk | Production concern | Primary controls |
| --- | --- | --- |
| Prompt injection | User or retrieved content manipulates instructions, tools, or data access. | Instruction hierarchy, content isolation, tool allowlists, output validation, evals. |
| Insecure output handling | Model output is executed, rendered, queried, or trusted without validation. | Schemas, escaping, sandboxing, code review, allowlisted actions. |
| Sensitive information disclosure | Secrets, private documents, or regulated data leak through responses, logs, traces, or tools. | Redaction, access control, retention policy, output filters, audit logs. |
| Excessive agency | The system can take broad or irreversible action without oversight. | Least privilege, approval gates, action budgets, scoped tools, human review. |
| Supply-chain exposure | Models, tools, MCP servers, datasets, plugins, or skills introduce hidden risk. | Pinning, review, provenance, isolation, dependency scanning, trust tiers. |
| Data poisoning | Ingested data or retrieved content alters system behavior or corrupts answers. | Source review, provenance, freshness, anomaly detection, evals. |
| Denial of service | Expensive prompts, loops, retrieval, or tool calls exhaust budget or availability. | Rate limits, token budgets, max turns, timeouts, circuit breakers. |

Security requirements should be written per workflow, not only per model.

## Control Boundaries

Use prompts to express behavior, not to enforce trust.

Controls that belong in code:

- Authentication and authorization.
- Tenant and document access checks.
- Tool allowlists and input schemas.
- Side-effect approval gates.
- Output escaping and rendering rules.
- Data retention and redaction.
- Rate limits, token budgets, and max turns.
- Audit logging.

Controls that prompts can support:

- Task scope.
- Refusal guidance.
- Citation requirements.
- Tool-use preferences.
- Escalation criteria.
- Expected output shape.

If violating a rule would create security, privacy, financial, legal, or
operational harm, enforce it outside the model.

## Prompt Injection Defense

Prompt injection cannot be solved by one instruction. Use layered controls:

1. Separate trusted instructions from untrusted content in data structures and
   prompts.
2. Label retrieved content and tool outputs as untrusted evidence.
3. Never let retrieved content grant permissions or override system policy.
4. Validate tool arguments against user permissions and domain rules.
5. Require approval for irreversible or externally visible actions.
6. Add evals with direct and indirect injection attempts.
7. Log source IDs, tool calls, approvals, and blocked attempts.

For RAG and web-connected agents, assume hostile instructions may appear inside
documents, webpages, issue comments, emails, or tool outputs.

## Tool And Agent Permissions

Design tools with least privilege:

- Prefer read-only tools by default.
- Split dangerous actions into separate tools.
- Require explicit user approval for writes, sends, purchases, deletes,
  deployments, and credential changes.
- Scope tools to a tenant, project, repository, or resource set.
- Use dry-run modes for impactful actions.
- Make tools idempotent where possible.
- Record user, tool, arguments, approval state, result, and trace ID.

Agents should have action budgets: max turns, max tool calls, max cost, max
runtime, and explicit stop conditions.

## Data Protection

- Do not send secrets or raw credentials to models.
- Redact sensitive values before logging prompts, outputs, tool results, and
  traces.
- Apply retention windows by data class.
- Keep document permissions synchronized with chunk-level retrieval indexes.
- Avoid putting private user data in metadata fields that may be queryable or
  broadly visible.
- Treat learner analytics, customer data, source documents, and internal code as
  sensitive by default.

For source-grounded systems, citations should identify evidence without leaking
content the current user is not authorized to read.

## Evaluation Metrics

| Metric | What it catches |
| --- | --- |
| Injection resistance | Whether malicious instructions in user or retrieved content affect behavior. |
| Authorization correctness | Whether unauthorized data and tools remain blocked. |
| Sensitive-data leakage | Whether secrets or private data appear in outputs, logs, or traces. |
| Unsafe action rate | Whether state-changing actions happen without approval. |
| Output-handling violations | Whether model output reaches code, SQL, shell, HTML, or APIs unsafely. |
| Denial-of-service resilience | Whether budgets, max turns, and timeouts stop runaway workflows. |
| Supply-chain coverage | Whether models, tools, MCP servers, skills, and dependencies have provenance. |
| Audit completeness | Whether incidents can be reconstructed from logs and traces. |

Security evals should include both direct attacks and indirect attacks embedded
in retrieved documents, web pages, emails, issue comments, tool outputs, and
uploaded files.

## Incident Response

AI incident response needs the normal application record plus AI-specific
context:

- User-safe ID and tenant.
- Prompt version and model.
- Retrieved source IDs and chunk IDs.
- Tool and MCP calls.
- Tool arguments and approval state.
- Trace ID and response ID.
- Guardrail decisions.
- Final output shown to the user.
- Logs and eval cases created from the incident.

Every confirmed incident should become at least one regression eval.

## Production Checklist

- Write a workflow-specific threat model.
- Classify tools as read-only, low-risk write, high-risk write, or destructive.
- Enforce authorization before retrieval and before tool execution.
- Add schemas and domain validators for all tool inputs.
- Add human approval for high-impact actions.
- Redact secrets from prompts, logs, traces, and outputs.
- Add prompt-injection and data-leakage evals.
- Add token, turn, runtime, and cost budgets.
- Review third-party MCP servers, plugins, skills, and dependencies.
- Log enough to audit every model-mediated action.

## Primary Sources

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
