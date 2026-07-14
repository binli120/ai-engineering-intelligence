# Start Here

## Learning sequence

1. Model APIs, structured output, and tool calling
2. Single-agent execution loops
3. Tool design and permission boundaries
4. State, memory, and retrieval
5. Human approval and resumability
6. Evaluation and tracing
7. Multi-agent patterns
8. Durable deployment
9. MCP integration
10. Security and production operations

## First build

Create a small research agent that:

- accepts a bounded question,
- invokes two deterministic tools,
- returns structured output,
- logs tool calls and token usage,
- supports a human approval gate,
- includes tests for tool selection and failure handling.

Do not begin with an open-ended autonomous agent. Reliability is easier to establish when the action space and success criteria are explicit.
