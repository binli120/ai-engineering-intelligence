# LangGraph

LangGraph is a low-level framework and runtime for long-running, stateful agent workflows. It models execution as graph or functional workflows with shared state, durable checkpoints, interrupts, streaming, and deployment paths.

Use LangGraph when the workflow itself needs to be engineered: explicit state, branches, retries, human review, and resumability matter more than a quick agent constructor.

## Positioning

LangGraph is strongest for:

- stateful multi-step agents,
- workflows with deterministic and model-driven nodes,
- human-in-the-loop approval,
- fault recovery and resumability,
- conversational memory,
- time-travel debugging,
- complex routing and subgraphs,
- durable execution in production.

It is usually too much machinery for a single prompt, a simple retrieval endpoint, or a short-lived tool-calling assistant with minimal state.

## Architecture

```text
User or system event
  -> Thread and input state
  -> Graph runtime
  -> Node execution: model calls, tools, deterministic functions
  -> State update
  -> Edge routing or interrupt
  -> Checkpoint
  -> Streamed output, next node, pause, or final result
```

The state schema is the architecture. Every node reads and writes state, so schema design determines how easy the workflow is to debug, resume, evaluate, and evolve.

## Core Concepts

| Concept | Role | Production Concern |
| --- | --- | --- |
| State | Shared data passed through the graph | Keep it typed, minimal, and versioned |
| Nodes | Units of work such as model calls or tools | Make side effects idempotent |
| Edges | Routing between nodes | Keep routing observable and testable |
| Checkpoints | Persisted snapshots of graph state | Required for resume, memory, interrupts |
| Threads | Conversation or workflow timelines | Need retention and privacy policy |
| Interrupts | Pause points for human input | Must include review context |
| Stores | Cross-thread memory and data | Require explicit governance |
| Subgraphs | Nested workflows | Useful for modular ownership |

## State Design

Good LangGraph state is boring and explicit:

```text
messages: user and assistant messages
task: normalized objective and constraints
sources: retrieved documents and citations
plan: current plan and status
tool_results: structured outputs from tools
approval: pending human decision, if any
final: validated answer or artifact
```

Avoid dumping arbitrary scratch text into state. Use typed fields for data that downstream nodes depend on, and keep transient reasoning separate from durable workflow state.

## Human-In-The-Loop

LangGraph is a strong fit when humans need to inspect or alter execution before the graph continues. Typical approval points include:

- running a destructive tool,
- sending an external message,
- publishing generated content,
- approving a plan before implementation,
- resolving ambiguous source evidence,
- choosing between alternative branches.

Approval nodes should show the current state, proposed action, evidence, risk, and available choices. A human approval step without enough context is just a slower automation bug.

## Prompt Design

Prompts inside LangGraph should be node-specific:

```text
You are the planning node.
Read the objective, constraints, and retrieved sources from state.
Return a concise plan with ordered steps and risks.
Do not call tools.
Do not produce the final answer.
```

Each prompt should define what state it reads, what state it writes, which tools it may use, and when it should stop. This keeps graph behavior testable.

## Retrieval Strategy

LangGraph works well when RAG is a multi-stage pipeline:

1. Normalize the user question.
2. Retrieve candidate documents.
3. Rerank or filter sources.
4. Extract evidence into structured state.
5. Generate an answer.
6. Validate citations and uncertainty.
7. Interrupt for human review when confidence is low.

This structure makes retrieval failures easier to diagnose because each stage has inspectable state and metrics.

## Evaluation Metrics

| Metric | What It Tests |
| --- | --- |
| Node success rate | Whether each node performs its contract |
| Route accuracy | Whether conditional edges choose the right path |
| Checkpoint recovery | Whether workflows resume after failure |
| Interrupt quality | Whether humans get enough context to decide |
| State size growth | Whether memory remains bounded |
| Tool retry behavior | Whether transient failures are handled safely |
| End-to-end task success | Whether the full graph solves the user problem |

## Production Checklist

- Define state schema before building nodes.
- Version state fields that are persisted.
- Make side-effecting nodes idempotent.
- Use checkpoints for any workflow that must resume.
- Add interrupts for irreversible or high-risk actions.
- Log node inputs, outputs, routes, latency, and errors.
- Keep prompts scoped to a single node responsibility.
- Test graph paths, not only final answers.

## Primary Sources

- [LangGraph Overview](https://docs.langchain.com/oss/python/langgraph/overview)
- [LangGraph Quickstart](https://docs.langchain.com/oss/python/langgraph/quickstart)
- [LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [LangGraph Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [LangGraph v1 Notes](https://docs.langchain.com/oss/javascript/releases/langgraph-v1)
- [LangGraph GitHub](https://github.com/langchain-ai/langgraph)
