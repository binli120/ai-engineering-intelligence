# OpenAI Agents SDK example

This directory tracks the first runnable OpenAI Agents SDK example for the
knowledge base.

## Target slice

- One text agent
- One typed function tool
- Structured output
- Built-in tracing
- Usage accounting
- Explicit approval boundary before side effects
- Deterministic tests for local tool behavior

## Why this comes first

Start with a text agent before sandbox, realtime, or durable execution. It
exercises the SDK runner loop, tool schema generation, tool validation, final
output handling, and trace visibility without introducing environment-specific
runtime concerns.

## Local run plan

Install the SDK in an isolated environment:

```bash
python -m venv .venv
source .venv/bin/activate
pip install openai-agents
```

Set credentials before running any API-backed example:

```bash
export OPENAI_API_KEY=...
```

The first implementation should add:

```text
examples/openai_agents/
  README.md
  pyproject.toml
  src/openai_agents_example/
    __init__.py
    app.py
    tools.py
  tests/
    test_tools.py
```

Keep the first automated tests API-free. Test tool validation, approval checks,
and output parsing locally. Add API-backed smoke tests only after the project
has a target model policy and a CI secret strategy.

## Acceptance criteria

- The example runs with `OPENAI_API_KEY` set.
- Local tests pass without `OPENAI_API_KEY`.
- Tool calls are typed and validated.
- Side-effecting operations require explicit approval.
- The README documents model, cost, and tracing assumptions.
