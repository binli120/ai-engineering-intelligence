# Claude Code

Claude Code is an agentic coding assistant for software development workflows. It can run in terminals, IDEs, and managed environments, using tools to inspect files, search code, edit source, execute commands, and maintain session context.

Use Claude Code when the work benefits from a coding agent loop: gather context, make a plan, edit files, run verification, inspect failures, and iterate.

## Positioning

Claude Code is strongest for:

- codebase exploration,
- multi-file implementation,
- debugging and test repair,
- refactoring with verification,
- documentation updates tied to code changes,
- repeatable workflows packaged as skills or commands,
- tool-augmented development through MCP.

It still requires human review for product judgment, architecture tradeoffs, security-sensitive behavior, and changes that affect production data.

## Architecture

```text
Prompt or command
  -> Claude Code agent loop
  -> Context gathering: files, search, terminal, code intelligence, web, docs
  -> Plan and tool use
  -> Edits and command execution
  -> Verification: tests, lint, build, manual checks
  -> Session state, checkpoints, and handoff context
```

The important boundary is not the chat transcript. It is the set of tools, permissions, repository instructions, and verification commands available to the agent.

## Core Components

| Component | Role | Engineering Implication |
| --- | --- | --- |
| Agentic loop | Iterates through context, actions, and verification | Prompts should define the desired stopping condition |
| File and search tools | Let the agent inspect the repository directly | Repository structure and naming quality matter |
| Shell execution | Enables tests, builds, and diagnostics | Permissions should distinguish safe checks from risky commands |
| Repository instructions | Encode stable team guidance | Keep guidance current and specific |
| Sessions and checkpoints | Preserve task state and recovery points | Useful for long-running implementation |
| Skills and commands | Package reusable workflows | Good for repeated engineering tasks |
| MCP integrations | Add external tools and data | Require explicit data and permission boundaries |

## Context Strategy

Claude Code works best when durable context lives near the code:

- put repository-wide guidance in project instructions,
- keep task-specific constraints in the prompt,
- reference exact files, routes, commands, or behaviors when known,
- let the agent read code before designing changes,
- use skills or commands for workflows that repeat,
- use MCP for external systems only when the workflow needs them,
- include verification expectations up front.

For large systems, combine high-level architecture notes with local package instructions so the agent can avoid crossing ownership boundaries accidentally.

## Prompt Design

Effective prompts define the outcome, constraints, and verification path:

```text
Add a topic page for Cursor under AI Coding.
Follow the structure used by docs/coding/codex.md.
Wire it into mkdocs navigation and the dashboard cards.
Use official documentation as the primary source.
Run the project check command before finishing.
```

For production work, include rollback expectations and data migration constraints. For exploratory work, ask for findings first, then authorize edits once the risk is clear.

## Security And Permissions

Claude Code permissions should match the risk of the available tools:

- keep destructive shell commands behind explicit approval,
- review any change touching auth, secrets, billing, data deletion, or infrastructure,
- avoid storing credentials in prompts, commands, skills, or repository instructions,
- scope MCP servers by task and data sensitivity,
- run tests in isolated or local environments before production deployment,
- preserve auditability by keeping diffs reviewable.

## Evaluation Metrics

Measure Claude Code against delivery quality:

| Metric | What It Shows |
| --- | --- |
| Task completion rate | Whether the agent reaches the requested outcome |
| Verification pass rate | Whether generated changes survive lint, tests, and builds |
| Intervention count | How often humans must redirect the agent |
| Diff review quality | Whether edits are scoped and understandable |
| Regression rate | Whether AI-assisted changes break existing behavior |
| Context reuse | Whether skills, instructions, and commands reduce repeated prompting |

## Production Checklist

- Maintain project instructions that describe architecture, commands, and review expectations.
- Use reusable skills or commands for repeated workflows.
- Keep permission rules strict for shell, network, and external tools.
- Require automated checks for implementation tasks.
- Capture task handoff notes for long sessions.
- Review all generated diffs before merge.
- Periodically audit repository instructions, MCP tools, and saved workflows.

## Primary Sources

- [Claude Code Documentation](https://code.claude.com/docs/)
- [How Claude Code Works](https://code.claude.com/docs/en/how-claude-code-works)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)
