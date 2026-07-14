# Framework Comparison

| Dimension | OpenAI Agents SDK | LangGraph |
|---|---|---|
| Primary abstraction | Agent + Runner | State graph / functional workflow |
| Control level | Lightweight orchestration | Low-level explicit orchestration |
| Tools | Native function and hosted-tool support | Framework-neutral nodes and tools |
| Handoffs | First-class | Modeled through graph transitions or subgraphs |
| State/persistence | Sessions and resumable run state | Checkpoints, threads, and stores |
| Human approval | Supported through interruptions and integrations | First-class interrupts and persisted state |
| Tracing | Built-in tracing | Commonly paired with LangSmith; custom tracing possible |
| Best initial use | Fast production agent applications on OpenAI platform patterns | Complex stateful and durable workflows requiring explicit control |
| Risk | Platform coupling and rapidly evolving SDK features | More architecture and state-management complexity |

This table is an editorial comparison. Validate exact behavior against current official documentation before production adoption.
