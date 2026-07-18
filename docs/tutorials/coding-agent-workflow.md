# Coding Agent Workflow

This tutorial teaches a reviewable AI coding workflow. The goal is to use coding agents to produce small, testable diffs with clear context and verification, not to maximize unattended edits.

## Objective

Use an AI coding assistant to implement one scoped change, run checks, inspect the diff, and prepare a handoff.

## Workflow

```text
Issue or request
  -> repo inspection
  -> implementation plan
  -> small edit
  -> targeted test
  -> full check
  -> diff review
  -> handoff or commit
```

The loop is intentionally conservative. Most coding-agent failures come from vague scope, skipped tests, or unreviewed broad edits.

## Step 1: Write The Task Brief

Use a brief with constraints:

```text
Fix the dashboard card alignment.
Keep changes limited to docs/assets/learning-tools.css unless JS is necessary.
Preserve the existing visual style.
Verify with browser measurement and the project check command.
```

Good briefs define the files, behavior, constraints, and finish line.

## Step 2: Inspect Before Editing

The agent should inspect:

- related files,
- existing patterns,
- test commands,
- current git status,
- any user changes in touched files.

Do not let the agent start with a rewrite when a scoped patch is enough.

## Step 3: Make A Small Diff

Prefer one behavior change per diff. Keep unrelated cleanup out of the patch. If the agent discovers a larger architectural issue, capture it separately instead of expanding the current task.

## Step 4: Verify

Use layered checks:

| Check | Purpose |
| --- | --- |
| Syntax or type check | Catch local breakage fast |
| Targeted test | Verify changed behavior |
| Browser or integration check | Validate user-visible behavior |
| Full quality gate | Catch cross-project regressions |

## Step 5: Review The Diff

Review for:

- accidental unrelated changes,
- brittle selectors or prompts,
- missing edge cases,
- hidden state changes,
- deleted user work,
- tests that assert implementation details instead of behavior.

## Evaluation Metrics

- Percentage of agent diffs accepted after review.
- Number of human correction turns.
- Test pass rate after first patch.
- Regressions introduced per change.
- Average diff size for scoped tasks.
- Time from request to verified patch.

## Production Checklist

- Keep repository instructions current.
- Define approved commands.
- Require tests for shared behavior.
- Use feature flags for risky product changes.
- Keep generated diffs small enough to review.
- Never ship coding-agent output without human review.

## Primary Sources

- [OpenAI Codex Documentation](https://developers.openai.com/codex)
- [Cursor Documentation](https://docs.cursor.com/)
- [Claude Code Documentation](https://code.claude.com/docs/)
