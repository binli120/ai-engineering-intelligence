# Agent Engineering

An agent is a model-driven system that selects actions, uses tools, maintains relevant state, and iterates toward a bounded objective.

## Core components

- **Instructions:** behavioral and task constraints.
- **Model:** reasoning and generation engine.
- **Tools:** typed actions with narrow permissions.
- **State:** information required across execution steps.
- **Memory:** retained information across turns or sessions.
- **Control flow:** loops, branches, retries, and stopping conditions.
- **Guardrails:** validation and policy enforcement.
- **Observability:** traces, usage, latency, errors, and outcomes.
- **Evaluation:** repeatable tests tied to task success.
- **Human oversight:** approval, correction, escalation, and interruption.

## Engineering rule

Treat an agent as a distributed application with a probabilistic decision component—not as a large prompt.

## Topics

- [Framework comparison](framework-comparison.md)
- [Responses API](responses-api.md)
- [OpenAI Agents SDK](openai-agents-sdk.md)
- [LangGraph](langgraph.md)
