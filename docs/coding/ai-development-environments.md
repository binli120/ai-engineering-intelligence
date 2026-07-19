# AI Development Environments And IDEs

AI development environments combine code editing, repository context, model access, tool execution, terminal integration, and change review. The important distinction is not whether an editor has chat. It is where the agent runs, what context it can gather, which actions it can take, and how developers review or constrain those actions.

**Status:** active  
**Checked:** 2026-07-18

## Positioning

Use an AI-enabled IDE when the work benefits from rapid movement between code comprehension, editing, execution, and review. These environments are particularly effective for repository exploration, scoped implementation, debugging, refactoring, and test-driven iteration.

An IDE is not automatically the best agent host. Terminal-first agents are often stronger for automation and reproducible command workflows, while cloud workspaces are useful when isolation, standardized dependencies, or remote execution matter more than immediate editor feedback.

## Environment Taxonomy

| Environment | Primary Interaction | Context Boundary | Best Fit |
| --- | --- | --- | --- |
| AI-native IDE | Editor, agent panel, inline edits | Open workspace, index, rules, tools | Interactive implementation and review |
| AI-enabled general IDE | Extensions or built-in agents | IDE project model and plugin permissions | Existing language-specific workflows |
| Terminal-first agent | Prompt and command loop | Working directory, shell, configured tools | Automation, migrations, CI-like verification |
| Cloud development environment | Browser IDE and remote runtime | Provisioned workspace or container | Reproducible onboarding and isolated execution |
| Agent orchestration surface | Multiple sessions or worktrees | Per-agent workspace and delegated scope | Parallel tasks and long-running work |

The categories overlap. VS Code, JetBrains IDEs, Zed, Cursor, and similar products increasingly support both editor-native assistance and autonomous agents. The useful architectural question is which component owns the model, context assembly, permissions, tools, and execution environment.

## IDE And Agent Landscape

| Environment | Agent Model | Notable Boundary | Evaluate Carefully |
| --- | --- | --- | --- |
| VS Code with GitHub Copilot | Local, CLI, cloud, and third-party agent sessions | Workspace-scoped Chat view or cross-workspace Agents window | Organization policy, model access, permission levels |
| Cursor | Editor-integrated agent with repository indexing, rules, terminal, and MCP | Cursor workspace and configured external services | Indexing scope, rules drift, unattended execution |
| JetBrains IDEs | AI Assistant plus integrated or external coding agents | IDE project model, plugins, `.aiignore`, agent settings | Language-specific support, subscription and provider boundaries |
| Zed | Native Zed Agent, ACP external agents, and terminal threads | Agent profile, tool permissions, provider configuration | Agent-path differences and feature compatibility |
| Windsurf | Agentic editor workflow centered on Cascade | Editor workspace, indexed context, configured tools | Context selection, permissions, and vendor-specific workflow |
| Codex or Claude Code | Terminal-first agent with editor interoperability | Repository checkout, sandbox, commands, skills, and tools | Approval policy, isolation, and review discipline |
| Cloud IDEs | Browser editor plus managed compute | Container, VM, or hosted workspace | Secrets, persistence, cost, network boundaries |

Avoid choosing by feature count alone. A team should test the exact workflow it intends to standardize: repository startup, context discovery, implementation, terminal use, test execution, diff review, rollback, and handoff.

## Architecture And Data Flow

```text
Developer intent
  -> IDE or agent session
  -> context assembly: files, symbols, index, instructions, terminal, tools
  -> model planning and tool calls
  -> edits, commands, tests, browser actions, or explanations
  -> diff and evidence review
  -> accept, revise, revert, or hand off
```

Production use requires explicit boundaries between the editor UI, agent runtime, model provider, repository, terminal, MCP or ACP tools, and remote services. Authentication and data-retention policies can differ at each boundary.

## Context And Retrieval Strategy

For small tasks, explicit file selection and the current editor buffer are usually sufficient. For repository-scale work, use layered retrieval:

1. load stable project instructions and path-scoped conventions,
2. retrieve symbols and files related to the requested change,
3. include recent terminal or test output when diagnosing behavior,
4. fetch external context only through approved tools,
5. summarize or compact long sessions before context quality degrades.

Repository indexes improve discovery but can be stale or over-inclusive. Evaluate retrieval using relevant-file recall, irrelevant-context rate, instruction adherence, and whether the agent finds cross-file contracts before editing.

## Prompt Design

Prompts should define the outcome, scope, constraints, verification, and review boundary:

```text
Implement the requested behavior in the existing workspace.
Preserve the current public API and unrelated user changes.
Follow repository instructions and reuse existing patterns.
Add tests at the observable behavior boundary.
Run the focused test first, then the complete quality gate.
Report changed files, verification, and unresolved risks.
```

Use separate planning and implementation turns when the blast radius is high. For routine changes, a compact implementation brief is usually more reliable than a long conversational prompt.

## Permissions And Security

AI IDEs and development agents can read proprietary code, execute commands, access environment variables, call external tools, and modify files. Apply least privilege at every layer:

- separate read, edit, command, network, and external-tool permissions,
- keep secrets out of prompts, instructions, logs, and committed configuration,
- sandbox untrusted code and generated commands,
- review MCP, ACP, extension, and plugin trust boundaries,
- require confirmation for destructive or externally visible actions,
- retain diffs, test results, and tool activity for auditability,
- define which repositories and data classifications may use external models.

Treat generated code as an untrusted contribution until tests and human review establish otherwise.

## Evaluation Metrics

| Metric | What It Reveals |
| --- | --- |
| Task success rate | Whether the environment completes representative work correctly |
| Accepted diff rate | Whether generated changes survive engineering review |
| First-pass test rate | Implementation correctness before follow-up prompting |
| Review defect rate | Regressions and security issues introduced by accepted changes |
| Context precision and recall | Whether retrieval finds required files without overwhelming the model |
| Scope-control rate | Frequency of unrelated or unnecessary edits |
| Median task latency | Interactive responsiveness and end-to-end completion time |
| Cost per accepted change | Model, compute, and developer-review cost |
| Recovery success | Ability to revert, retry, or hand off failed agent work |

Build an evaluation set from real maintenance, feature, debugging, and refactoring tasks. Record repository state, prompt, permissions, model, outcome, tests, review findings, latency, and cost. Compare environments on identical tasks rather than vendor demonstrations.

## Selection Framework

Choose an environment by weighting the constraints that matter to the team:

- language and framework intelligence,
- local versus cloud execution,
- model and provider flexibility,
- repository indexing and context controls,
- terminal, browser, MCP, ACP, and extension support,
- permission granularity and sandboxing,
- diff review, checkpoints, and rollback,
- enterprise identity, policy, audit, and data retention,
- accessibility, latency, and developer ergonomics,
- licensing and total operational cost.

Pilot with representative repositories and tasks for several weeks. Standardize instructions, tests, and review expectations before comparing productivity outcomes.

## Primary Sources

- [Build with agents in VS Code](https://code.visualstudio.com/docs/agents/overview)
- [VS Code agent security](https://code.visualstudio.com/docs/copilot/security)
- [Cursor documentation](https://docs.cursor.com/)
- [JetBrains AI Assistant](https://www.jetbrains.com/help/ai-assistant/about-ai-assistant.html)
- [JetBrains coding agents](https://www.jetbrains.com/help/ai-assistant/agents.html)
- [Zed agents](https://zed.dev/docs/ai/agents)
- [Zed Agent profiles](https://zed.dev/docs/ai/agent-profiles)
- [Windsurf documentation](https://docs.windsurf.com/)
- [OpenAI Codex documentation](https://developers.openai.com/codex/)
- [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code/overview)
