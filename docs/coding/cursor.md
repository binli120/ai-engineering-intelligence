# Cursor

Cursor is an AI-native code editor. Its main value is not a single chat box; it is the combination of editor context, repository-aware rules, inline edits, agentic code changes, terminal awareness, and external tools such as MCP servers.

Use Cursor when the desired workflow is close to interactive pair programming: keep the developer in the editor, let the assistant gather local context, propose or apply edits, and keep review friction low.

## Positioning

Cursor is strongest when a task benefits from tight editor feedback:

- exploring an unfamiliar codebase,
- making scoped edits across several files,
- using repository conventions repeatedly,
- asking implementation questions while reading code,
- applying small refactors from inside the editor,
- connecting private tools through MCP.

It is weaker as a fully unattended delivery system unless the team has strong tests, clear rules, and a review process for generated diffs.

## Architecture

```text
Developer intent
  -> Cursor surface: Agent, Ask, Manual, Inline Edit
  -> Context bundle: selected files, open editors, repository index, rules, terminal, MCP tools
  -> Model plan and tool calls
  -> File edits, terminal commands, explanations, or review notes
  -> Human review, tests, and commit workflow
```

Treat Cursor as an editor-integrated agent runtime. The architecture boundary is the workspace: Cursor can see and modify local files, use indexed repository context, apply project rules, and call configured tools.

## Core Surfaces

| Surface | Use It For | Engineering Risk |
| --- | --- | --- |
| Agent | Multi-file implementation, debugging, migrations | Over-broad edits if task scope is vague |
| Ask | Repository questions, design review, code explanation | Answers can omit edge cases without explicit constraints |
| Manual | Controlled edits where the developer selects context | Slower, but easier to audit |
| Inline Edit | Local function or block rewrites | Can miss cross-file contracts |
| Rules | Persistent project conventions and team guidance | Stale rules can encode outdated practices |
| Tools and MCP | External context, internal systems, automation | Requires permission and data-boundary review |

## Context Strategy

Cursor context should be explicit and layered:

- use project rules for stable conventions such as test style, architecture boundaries, naming, and forbidden shortcuts,
- use path-scoped rules for framework-specific or package-specific guidance,
- select relevant files when the task is narrow,
- include terminal output when diagnosing failing commands,
- connect MCP only for tools that are safe and useful inside the coding workflow,
- keep long design intent in docs that Cursor can index rather than repeating it in every prompt.

The goal is to make the assistant's context match the human review boundary.

## Prompt Design

Good Cursor prompts are small implementation briefs:

```text
Change the study tools menu so each tool opens inside the current page.
Keep the existing layout and CSS naming.
Do not introduce a new route.
Add or update tests if behavior changes.
Run the existing lint/check command and report failures.
```

For larger work, split prompts by reviewable slices: schema changes, API behavior, UI behavior, then polish. Ask Cursor to explain the plan before edits when the blast radius is high.

## Security And Permissions

Cursor should be configured with the same care as other developer tools:

- review generated diffs before commit,
- avoid putting secrets into prompts, rules, or chat history,
- limit MCP servers to the minimum required capability,
- prefer read-only tools unless write access is necessary,
- require human approval for destructive commands,
- keep repository rules free of private credentials or customer data.

## Evaluation Metrics

Track Cursor usage with engineering metrics, not novelty metrics:

| Metric | Why It Matters |
| --- | --- |
| Accepted diff rate | Measures whether generated changes survive review |
| Review defect rate | Shows whether AI edits introduce regressions |
| Test pass rate after edits | Indicates implementation reliability |
| Scope control | Measures whether the assistant touched unrelated files |
| Time to first useful patch | Captures pair-programming efficiency |
| Rule effectiveness | Identifies whether project rules reduce repeated corrections |

## Production Checklist

- Define repository rules for architecture, tests, code style, and command usage.
- Keep rules short enough to be followed consistently.
- Add path-scoped rules for different packages or frameworks.
- Connect MCP servers only after reviewing permissions and data flow.
- Require tests or checks for multi-file edits.
- Review diffs before commit.
- Periodically remove stale rules and duplicated guidance.

## Primary Sources

- [Cursor Documentation](https://docs.cursor.com/)
- [Rules for AI](https://docs.cursor.com/context/rules-for-ai)
- [Agent Tools](https://docs.cursor.com/en/agent/tools)
- [Cursor Agent](https://docs.cursor.com/agent)
- [Inline Edit](https://docs.cursor.com/en/inline-edit/overview)
