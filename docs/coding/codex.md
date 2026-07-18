# Codex

**Status:** Initial source-backed topic
**Checked:** 2026-07-17

## Positioning

Codex is OpenAI's coding agent for software engineering work. It can pair with a
developer in local tools or handle delegated work in cloud-style workflows. The
CLI is a local coding agent that can read, modify, and run code on a developer's
machine; Codex also has IDE, app, and web/cloud surfaces.

Use Codex when the task benefits from repository-level context, iterative edits,
terminal verification, and reviewable changes. Do not treat it as only a code
completion tool; the useful unit is a scoped engineering task with tests or
clear acceptance criteria.

## Architecture

```text
Developer task
  |
  v
Codex surface: CLI, IDE, app, or web
  |
  v
Repository context + instructions + current git state
  |
  +--> Read/search files
  +--> Edit files
  +--> Run commands and tests
  +--> Ask for approval when required
  |
  v
Patch, explanation, test result, review, or delegated task result
```

The key production boundary is the approval and sandbox model. Any workflow that
allows file edits, command execution, network access, deployments, or credential
changes needs explicit trust rules and auditability.

## Core Workflows

| Workflow | Good fit |
| --- | --- |
| Repository exploration | Understand unfamiliar code, architecture, tests, and conventions. |
| Feature implementation | Convert a scoped spec into edits plus verification. |
| Bug fixing | Reproduce, inspect, patch, and rerun tests. |
| Refactoring | Apply mechanical or architectural changes across files. |
| Code review | Identify correctness, regression, testing, and security risks. |
| Documentation | Generate or revise docs from code and source-backed references. |
| CI remediation | Inspect failures, reproduce locally, and patch targeted issues. |

## Context Strategy

- Keep durable project rules in `AGENTS.md` or the supported configuration
  surface for the current Codex environment.
- Give the agent concrete entry points: files, failing tests, feature specs, or
  expected behavior.
- Prefer small tasks with verification over broad "improve the codebase"
  prompts.
- Preserve git hygiene: inspect existing changes before editing, avoid
  unrelated refactors, and keep patches reviewable.
- Use local tests, lint, type checks, and build commands as verification
  anchors.

## Prompt Design

Strong Codex prompts usually include:

- Objective and user-visible behavior.
- Relevant files, commands, or failing output.
- Constraints such as compatibility, style, and performance.
- Required verification command.
- Whether to implement, plan, review, or only explain.

Example shape:

```text
Implement the new lint command in the CLI.
Keep the command names consistent with CI.
Add focused tests for command construction.
Run poetry run aikb check before finishing.
```

## Security And Permissions

- Use the least autonomous approval mode that fits the task.
- Require approval for destructive git operations, external side effects, and
  broad filesystem access.
- Avoid exposing secrets in prompts, logs, screenshots, and command output.
- Treat generated patches like any other code change: review diffs and tests.
- Keep command allowlists narrow and project-specific.
- Prefer sandboxed execution for exploratory or long-running tasks.

## Evaluation Metrics

| Metric | What it catches |
| --- | --- |
| Task completion | Whether the patch satisfies the requested behavior. |
| Test pass rate | Whether verification commands pass after edits. |
| Diff relevance | Whether changes stay scoped to the task. |
| Review finding rate | Bugs or regressions found after agent output. |
| Iteration count | How much steering was required. |
| Approval safety | Whether risky actions asked before running. |
| Time to validated patch | End-to-end productivity with correctness included. |

## Production Checklist

- Add project instructions for build, test, lint, and style.
- Define approval expectations for commands and file edits.
- Keep tasks small enough to review.
- Require tests or checks before accepting changes.
- Record commands run and outputs that support the result.
- Review generated code for security and maintainability.

## Primary Sources

- [Codex documentation](https://developers.openai.com/codex)
- [OpenAI Codex GitHub repository](https://github.com/openai/codex)
- [Codex CLI getting started](https://help.openai.com/en/articles/11096431)
