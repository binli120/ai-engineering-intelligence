# AI Engineering Intelligence

A version-controlled, source-backed knowledge system for AI coding, agent development, MCP, tutorials, examples, research, and production practices.

## MVP goals

- Maintain a curated registry of authoritative sources.
- Publish structured framework and technique notes.
- Generate a weekly digest scaffold.
- Validate metadata and links in CI.
- Provide runnable examples separately from conceptual documentation.
- Keep factual claims source-attributed and time-stamped.

## Quick start

```bash
pipx install "poetry>=2.0,<3.0"
poetry install --with dev
poetry run aikb validate
poetry run mkdocs serve
```

Open the local URL printed by MkDocs.

## Development checks

```bash
poetry run ruff check .
poetry run ruff format --check .
poetry run mypy
poetry run pytest
poetry run mkdocs build --strict
poetry build
```

Install local hooks with:

```bash
poetry run pre-commit install
```

## Repository structure

```text
docs/                  Human-curated knowledge base
examples/              Runnable agent examples
src/aikb/              Collectors, schemas, ranking, and digest code
data/sources.yaml      Authoritative source registry
data/items/            Normalized collected items
tests/                 Validation tests
.github/workflows/     CI and scheduled digest workflow
```

## Editorial principles

1. Prefer official documentation, release notes, repositories, and papers.
2. Separate verified facts from interpretation.
3. Record `checked_at`, version, and source URL.
4. Rank by engineering impact, evidence quality, maturity, and relevance.
5. Avoid treating GitHub stars or social attention as proof of production quality.
6. Explicitly mark experimental, preview, beta, and deprecated features.
