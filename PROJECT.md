# AI Engineering Intelligence

## Mission

Build the world's best open AI engineering knowledge system.

This project is not a bookmark collection. It is a continuously evolving engineering handbook for building production AI systems, with source-backed documentation, runnable examples, structured knowledge, and lightweight automation.

The repository should become a reference comparable to high-quality engineering documentation for:

- AI coding
- LLMs
- Agent engineering
- MCP
- OpenAI APIs
- RAG
- Prompt engineering
- Evaluation
- Observability
- Security
- Tutorials
- Example projects
- Production best practices

## Guiding Principles

1. Prefer official documentation over blogs.
2. Every technical statement should be source-backed whenever possible.
3. Examples should compile and run.
4. Documentation is as important as code.
5. Prefer simplicity over unnecessary abstractions.
6. Production engineering takes precedence over demos.
7. Version everything.
8. Never duplicate information.
9. Every tutorial should be executable.
10. Every comparison should explain tradeoffs.

## Repository Philosophy

The repository has four major components.

### Documentation

High-quality engineering handbook content under `docs/`.

Documentation should be written for engineers making real design and implementation decisions. Pages should emphasize architecture, tradeoffs, operational constraints, failure modes, and production readiness.

### Examples

Runnable examples under `examples/`.

Examples must be dependency-pinned, documented, and testable. They should demonstrate realistic patterns rather than isolated snippets.

### Automation

Scripts and CLI workflows that collect, validate, normalize, and publish updates.

Automation should support editorial quality. It should not replace human review for claims, comparisons, or production recommendations.

### Knowledge

Structured metadata describing AI technologies, sources, frameworks, releases, and examples.

Structured knowledge should avoid duplication with narrative docs. Use it for validation, ranking, search, generation, and update tracking.

## Priority Topics

### Highest Priority

★★★★★

- OpenAI Agents SDK
- Responses API
- MCP
- LangGraph
- AI Coding
- Codex
- Cursor
- Claude Code

### High Priority

★★★★☆

- CrewAI
- PydanticAI
- LlamaIndex
- RAG
- Evaluation
- Security

### Medium Priority

★★★☆☆

- Everything else

## Coding Standards

Use the project toolchain consistently:

- Python
- Poetry
- Ruff
- Mypy
- Pytest
- MkDocs
- GitHub Actions

Type hints are required. Public APIs must not be untyped.

Prefer clear, maintainable code over clever abstractions. Keep modules small, explicit, and easy to validate. Add automation only when it improves correctness, repeatability, or editorial throughput.

## Documentation Standards

Every framework page should contain:

- Overview
- Architecture
- Strengths
- Weaknesses
- Quickstart
- Examples
- Tutorials
- Best Practices
- Common Mistakes
- Comparison
- Primary Sources

Documentation should distinguish facts from interpretation. Claims about APIs, SDK behavior, pricing, support level, deprecation, compatibility, and security posture should cite primary sources whenever possible.

## Editorial Rules

Never use unofficial information when official documentation exists.

Always distinguish:

- Stable
- Preview
- Experimental
- Deprecated

When a topic is changing quickly, record the check date and source. If a claim cannot be verified from a primary source, mark it as interpretation or needs review.

## Development Philosophy

The project is documentation-first.

Priorities:

1. Documentation
2. Code
3. Automation
4. AI agents

Avoid premature complexity. Build the handbook and examples first. Add automation where it makes the knowledge system more accurate, easier to maintain, or easier to verify.

## Long-Term Vision

Eventually this repository should contain:

- Thousands of pages
- Hundreds of runnable examples
- Automated weekly updates
- MCP integrations
- Searchable documentation
- Local vector search
- AI tutor mode
- Engineering roadmap

This is expected to become a long-term project. Design choices should preserve maintainability, source quality, and editorial trust over time.
