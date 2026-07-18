# Framework Comparison

Agent frameworks should be compared by control boundaries, state model, tool safety, observability, and operational fit. A framework is not better because it is more autonomous; it is better when its abstractions match the workflow you need to operate.

## Decision Model

Use this decision flow before choosing a framework:

```text
Need direct platform tools and fast production path?
  -> Start with Responses API or OpenAI Agents SDK.

Need explicit state transitions, durable checkpoints, and human approval?
  -> Start with LangGraph.

Need simple single-turn tool use with full custom control?
  -> Start with Responses API directly.

Need reusable multi-agent workflows with handoffs, sessions, tracing, and guardrails?
  -> Start with OpenAI Agents SDK.
```

The wrong choice usually appears as either too much custom orchestration around a high-level SDK, or too much graph machinery around a simple tool-calling loop.

## Comparison Table

| Dimension | Responses API | OpenAI Agents SDK | LangGraph |
| --- | --- | --- | --- |
| Primary abstraction | Model response with tools and state | Agent plus runner | State graph or functional workflow |
| Control level | Highest manual control | Managed orchestration | Explicit orchestration |
| Tool execution | Hosted tools and function tools | Function tools, hosted tools, approval, guardrails | Nodes, tools, custom routing |
| Multi-agent design | Manual loops and routing | First-class handoffs | Graph transitions, subgraphs, supervisors |
| State model | Conversation and response state | Sessions and run context | Typed state, checkpoints, stores |
| Human approval | Build into the app loop | Approval-capable tool execution | Interrupts and persisted state |
| Durability | Application-owned | Sessions and external persistence patterns | Checkpointing and resumability |
| Observability | Platform logs and custom traces | Built-in tracing for runs, tools, handoffs, guardrails | LangSmith or custom tracing |
| Best fit | Platform-native product features | Production agent apps on OpenAI patterns | Complex stateful workflows |
| Main risk | Owning too much orchestration | Platform coupling and evolving SDK surface | More architecture complexity |

## Responses API Fit

Use the Responses API when the application should own the loop. This is the right fit for product teams that need precise control over state, tool dispatch, latency, streaming, and UI events.

Good examples:

- one assistant surface with a small number of tools,
- retrieval and citation workflows,
- structured extraction,
- UI-driven tool approval,
- custom routing between product features.

Avoid using the Responses API alone when you are rebuilding sessions, handoffs, guardrails, and trace semantics repeatedly across workflows.

## OpenAI Agents SDK Fit

Use the OpenAI Agents SDK when the unit of composition is an agent. Its core value is a managed runtime for instructions, tools, handoffs, guardrails, sessions, and traces.

Good examples:

- customer support workflows with specialist handoffs,
- internal research agents with tools and review gates,
- educational assistants with study modes,
- multi-step coding or analysis helpers,
- prototypes that need to become production services quickly.

The SDK is a strong default when OpenAI platform features are central and the team wants less custom orchestration code.

## LangGraph Fit

Use LangGraph when control flow is part of the product. Its graph model makes state transitions, interrupts, branches, retries, and persistence explicit.

Good examples:

- workflows requiring human approval before continuing,
- long-running research or operations pipelines,
- agents that need time-travel debugging,
- systems where deterministic steps and LLM decisions must coexist,
- multi-agent workflows with durable shared state.

The tradeoff is design effort. State schema, checkpoint policy, idempotency, and side effects need deliberate engineering.

## Prompt Design

Framework selection prompts should include workflow shape, risk, and operating constraints:

```text
Compare Responses API, OpenAI Agents SDK, and LangGraph for this workflow.
The system has three tools, one approval step, streaming UI, and strict audit logging.
We need low latency for normal questions and durable resume for long research tasks.
Recommend a primary architecture and explain what we should not use.
```

Ask for a failure-mode analysis after the first recommendation. Framework choices often look reasonable until persistence, approval, and observability are tested against incidents.

## Retrieval Strategy

Framework choice affects RAG design:

- Responses API works well when retrieval is a product-owned service.
- OpenAI Agents SDK works well when retrieval is one tool inside a broader agent workflow.
- LangGraph works well when retrieval, review, synthesis, and approval are separate stateful nodes.

For production RAG, keep source ingestion, embeddings, ranking, and citation validation outside the agent framework when possible. The framework should orchestrate retrieval, not hide retrieval quality.

## Evaluation Metrics

| Metric | Why It Matters |
| --- | --- |
| Task success rate | Measures whether the framework supports the target workflow |
| Tool error recovery | Captures whether failures are handled or amplified |
| Approval correctness | Shows whether risky actions are gated properly |
| State recovery rate | Tests persistence and resumability |
| Trace completeness | Determines whether incidents can be debugged |
| Latency by step | Prevents orchestration overhead from hiding bottlenecks |
| Cost by run | Shows whether agent loops are bounded |

## Production Checklist

- Define the workflow as states, actions, approvals, and stopping conditions.
- Choose the smallest abstraction that supports the workflow.
- Keep tool schemas narrow and observable.
- Add evaluation cases for success, refusal, retry, and interruption.
- Track cost, latency, tool failures, and human interventions.
- Test persistence and restart behavior before production use.
- Review official docs before adopting features marked preview, beta, or experimental.

## Primary Sources

- [OpenAI Agents SDK: Agents](https://openai.github.io/openai-agents-python/agents/)
- [OpenAI Agents SDK: Tracing](https://openai.github.io/openai-agents-python/tracing/)
- [OpenAI Agents SDK: Guardrails](https://openai.github.io/openai-agents-js/guides/guardrails/)
- [LangGraph Overview](https://docs.langchain.com/oss/python/langgraph/overview)
- [LangGraph Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [LangGraph v1 Notes](https://docs.langchain.com/oss/javascript/releases/langgraph-v1)
