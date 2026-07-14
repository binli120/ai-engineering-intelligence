# OpenAI Agents SDK

**Status:** Verified against official documentation
**Checked:** 2026-07-14

## Positioning

The OpenAI Agents SDK is a lightweight framework centered on a small set of primitives. Its documented orchestration surface includes agents, runners, tools, guardrails, handoffs, sessions, results, and tracing. The SDK uses the Responses API by default for OpenAI models.

## Strengths

- Small conceptual surface
- First-class tools and handoffs
- Built-in tracing
- Usage accounting
- Sessions and resumable state
- Integrations for durable, long-running workflows
- Direct alignment with OpenAI platform capabilities

## Considerations

- Confirm feature maturity because the release cadence is active.
- Separate the SDK orchestration loop from direct Responses API use.
- Treat sandbox-agent capabilities as beta until their operational properties are validated.
- Establish explicit tool permissions and approval boundaries.

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

## Primary sources

- [Official SDK documentation](https://openai.github.io/openai-agents-python/)
- [Quickstart](https://openai.github.io/openai-agents-python/quickstart/)
- [Agents](https://openai.github.io/openai-agents-python/agents/)
- [Tools](https://openai.github.io/openai-agents-python/tools/)
- [Tracing](https://openai.github.io/openai-agents-python/tracing/)
- [Release notes](https://openai.github.io/openai-agents-python/release/)
