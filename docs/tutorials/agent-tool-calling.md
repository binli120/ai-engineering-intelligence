# Agent Tool Calling

This tutorial teaches the smallest useful agent pattern: a model receives a task, decides whether to call a typed tool, receives the tool result, and returns a grounded answer.

## Objective

Build a tool-calling agent that can answer questions using one narrow tool. The goal is not autonomy; the goal is safe, inspectable action.

## Prerequisites

- Python environment installed with project dependencies.
- An OpenAI API key when running live examples.
- Basic familiarity with typed function inputs.
- A local test command such as `poetry run pytest`.

## Architecture

```text
User question
  -> Agent instructions
  -> Tool schema selection
  -> Tool execution
  -> Structured tool result
  -> Final answer with uncertainty when needed
```

The tool boundary is the important part. A tool should have a narrow input schema, predictable output, and explicit error behavior.

## Step 1: Define The Tool Contract

Start with the schema, not the prompt:

```text
Tool: lookup_policy
Input: policy_id, question
Output: answer, citations, confidence
Failure: not_found, unavailable, ambiguous
```

The agent should not know how to search every system. It should know when this specific tool is appropriate.

## Step 2: Write Instructions

Use instructions that force tool restraint:

```text
Answer from general knowledge only for conceptual questions.
Use lookup_policy only when the user asks about a specific policy.
If the tool returns low confidence, say what is missing.
Do not invent citations.
```

These instructions reduce unnecessary tool calls and make missing evidence visible.

## Step 3: Add Tests

Test three cases:

| Case | Expected Behavior |
| --- | --- |
| General concept question | No tool call |
| Specific policy question | Tool call with valid schema |
| Missing policy | Clear uncertainty, no fabricated answer |

Mock the tool in unit tests. Live API tests should be a separate optional layer.

## Step 4: Add Observability

Record:

- prompt version,
- selected tool,
- tool input,
- tool output status,
- latency,
- final answer,
- whether the user accepted or corrected the result.

This data becomes the evaluation dataset for future changes.

## Evaluation Metrics

- Tool selection precision.
- Tool selection recall.
- Schema validation failure rate.
- Unsupported question refusal rate.
- Citation accuracy.
- User correction rate.

## Production Hardening

- Validate tool inputs before execution.
- Set timeouts and retries.
- Keep tool permissions narrow.
- Log tool failures separately from model failures.
- Add human approval for destructive tools.
- Add regression tests from real failures.

## Primary Sources

- [OpenAI Agents SDK: Agents](https://openai.github.io/openai-agents-python/agents/)
- [OpenAI Agents SDK: Tools](https://openai.github.io/openai-agents-python/tools/)
- [OpenAI Agents SDK: Guardrails](https://openai.github.io/openai-agents-js/guides/guardrails/)
