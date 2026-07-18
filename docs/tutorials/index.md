# Tutorials

Tutorials turn the knowledge base into runnable learning paths. A tutorial is complete only when the code can be executed, dependencies are pinned, and the expected behavior is testable.

## Tutorial Standard

Every tutorial should include:

- learning objective,
- prerequisites,
- framework and version,
- expected duration,
- runnable code path,
- test command,
- expected output,
- failure modes,
- production relevance,
- last verification date.

The app can host conceptual notes, but tutorials should teach by doing.

## Learning Paths

| Path | Goal | Start Here |
| --- | --- | --- |
| Agent Tool Calling | Build a small tool-using agent and validate tool boundaries | [Agent Tool Calling](agent-tool-calling.md) |
| RAG Evaluation | Build a retrieval pipeline and measure answer quality | [RAG Evaluation](rag-evaluation.md) |
| Coding Agent Workflow | Use AI coding tools with tests, review, and rollback | [Coding Agent Workflow](coding-agent-workflow.md) |

## Tutorial Design

A good tutorial has a narrow spine:

```text
Problem
  -> minimum architecture
  -> implementation
  -> verification
  -> production hardening
  -> next experiments
```

Avoid mixing too many frameworks in one tutorial. If a tutorial compares frameworks, make the comparison the objective and keep the implementation surface small.

## Prompt Design

Tutorial prompts should be reproducible:

```text
Use the code in examples/openai_agents.
Add one weather tool with a typed schema.
Write a test that verifies the tool is called only for weather questions.
Run pytest and explain any failure.
```

The prompt must include the target files, allowed changes, and verification command.

## Retrieval Strategy

Tutorials should cite official docs and local source files. For source-grounded tutorials:

- keep citations close to the step they justify,
- distinguish official API behavior from local implementation choices,
- include version constraints,
- avoid using blog posts as authority for framework semantics.

## Evaluation Metrics

| Metric | Why It Matters |
| --- | --- |
| Completion rate | Learners can finish without hidden steps |
| Reproducibility | Commands work on a clean checkout |
| Test coverage | Behavior is verified, not just explained |
| Time to first success | Early feedback keeps the tutorial usable |
| Error diagnosis quality | Learners can recover from common failures |
| Production relevance | The lesson maps to real engineering work |

## Production Checklist

- Pin dependencies.
- Keep code examples small and executable.
- Add tests for the behavior taught.
- Include expected command output.
- Note API keys and environment variables explicitly.
- Separate local demo shortcuts from production patterns.
- Recheck tutorials when source docs or package versions change.

## Topics

- [Agent Tool Calling](agent-tool-calling.md)
- [RAG Evaluation](rag-evaluation.md)
- [Coding Agent Workflow](coding-agent-workflow.md)
