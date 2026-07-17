# AI Skills

**Status:** Initial source-backed topic
**Checked:** 2026-07-14

## Positioning

AI skills are reusable packages of procedural knowledge for agents. A skill is
typically a directory with a `SKILL.md` entrypoint plus optional scripts,
references, templates, assets, and examples. The goal is to turn repeated
prompts, checklists, and multi-step workflows into version-controlled capability
modules that an agent can discover and load when relevant.

Skills sit between prompts and tools:

- A prompt gives task-specific instructions for one interaction.
- A skill packages reusable workflow knowledge and supporting files.
- A tool exposes an executable capability or external system boundary.
- MCP exposes live tools and resources through a protocol boundary.

Use skills when the agent needs repeatable process knowledge. Use tools or MCP
when the agent needs a typed action, live data, external APIs, or a stronger
permission boundary.

## Architecture

```text
User task
   |
   v
Skill discovery
   |
   +--> Name + description loaded into context
   |
   v
Skill activation
   |
   +--> Full SKILL.md loaded only when relevant
   |
   v
Skill execution
   |
   +--> Follow instructions
   +--> Load references
   +--> Use templates/assets
   +--> Run scripts or tools if allowed
   |
   v
Agent output, edits, tool calls, or artifacts
```

The main design pattern is progressive disclosure. Agents can keep many skills
available while loading only compact metadata until a task matches a skill's
description. This keeps context costs low and makes skill selection an explicit
part of the agent workflow.

## Skill Package Shape

```text
my-skill/
  SKILL.md
  references/
  scripts/
  assets/
  examples/
```

`SKILL.md` should define when the skill applies, what the agent should do, what
inputs are expected, what files or tools are safe to use, and how success should
be verified. Supporting files should be referenced from `SKILL.md` so the agent
knows when to load them.

## When To Create A Skill

Create a skill when:

- The same workflow is being pasted into prompts repeatedly.
- A process has multiple steps, checks, or decision points.
- A team wants consistent output shape across agents or sessions.
- The workflow needs reference material that should not always be in context.
- The task benefits from scripts, templates, examples, or validation helpers.

Do not create a skill for a one-off instruction, a single fact, or a capability
that really needs an authenticated API/tool boundary.

## Prompt Design

The `description` is a retrieval and routing surface. It should be specific
enough for the agent to select the skill when appropriate and ignore it when it
does not apply.

Good skill prompts define:

- Task triggers and non-triggers.
- Required inputs and assumptions.
- Execution sequence.
- Tool and file access expectations.
- Verification steps.
- Output format.
- Escalation or stop conditions.

Avoid vague descriptions such as "helps with coding." Prefer descriptions like
"Use when migrating React tests from unsafe type assertions to typed helper
builders."

## Retrieval Strategy

Skills are a local capability library, so retrieval quality matters. Treat skill
selection as a retrieval problem with governance:

1. Load only name, description, and trust metadata during discovery.
2. Match tasks against descriptions, scopes, and repository location.
3. Prefer project-local skills for project-specific workflows.
4. Prefer organization-reviewed skills over personal or community skills for
   sensitive work.
5. Load full instructions only after selection.
6. Load references lazily when the selected skill asks for them.

For large skill libraries, use hybrid retrieval: lexical matching for exact
workflow names and embeddings for semantic task matches. Add reranking or
allowlists for high-risk environments.

## Evaluation Metrics

Evaluate skills independently and in combination with the agent that uses them.

| Metric | What it catches |
| --- | --- |
| Trigger precision | Whether the skill activates only when appropriate. |
| Trigger recall | Whether the agent finds the skill when it should. |
| Task success rate | Whether the workflow completes correctly with the skill. |
| Token overhead | Whether discovery and activation costs are justified. |
| Tool-call accuracy | Whether the skill leads to correct tool use. |
| Verification coverage | Whether the skill checks its own output meaningfully. |
| Regression rate | Whether skill edits break prior workflows. |
| Security findings | Unsafe commands, prompt injection paths, secret exposure, or overbroad permissions. |

Maintain golden tasks for each skill. Test direct invocation, automatic
selection, no-trigger cases, missing-input cases, and hostile reference content.

## Security And Governance

Skills are operational instructions, not passive documentation. Treat third-party
skills as supply-chain inputs.

- Review `SKILL.md` and supporting files before use.
- Version-control project and organization skills.
- Separate trusted, reviewed, experimental, and third-party skill tiers.
- Require explicit approval for state-changing scripts or external tool calls.
- Avoid embedding secrets or credentials in skill files.
- Constrain dynamic context injection and shell commands.
- Add tests for prompt injection through skill descriptions, references, and
  examples.
- Record which skill version was used for important agent outputs.

## Production Patterns

- **Project runbook skill:** captures install, build, run, and verification
  commands for a repo.
- **Code review skill:** standardizes review scope, severity, evidence, and test
  expectations.
- **Migration skill:** encodes a repeatable refactor with examples and a
  validation script.
- **Document generation skill:** combines templates, brand rules, and export
  checks.
- **Incident analysis skill:** guides log collection, hypothesis testing, and
  report structure.

## Anti-Patterns

- Huge skills that load full reference manuals for every task.
- Skills that silently run destructive commands.
- Skills that duplicate live API behavior better represented as MCP tools.
- Skills that rely on hidden global state or undocumented local paths.
- Marketplace skills installed without review, pinning, or trust tiering.

## Implementation Checklist

- Give each skill one clear responsibility.
- Keep the description short, specific, and trigger-oriented.
- Put long references in separate files and load them only when needed.
- Include examples of expected outputs.
- Add deterministic validation scripts where possible.
- Document required tools and permissions.
- Add direct and automatic-selection evals.
- Review permissions before enabling scripts or external tool access.

## Primary Sources

- [Agent Skills overview](https://agentskills.io/)
- [Agent Skills specification](https://agentskills.io/specification)
- [Claude Code skills documentation](https://code.claude.com/docs/en/skills)
