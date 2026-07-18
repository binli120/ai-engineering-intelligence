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
poetry run aikb lint
poetry run aikb check
poetry build
```

Use `poetry run aikb lint --fix` to apply Ruff fixes and formatting.

The project helper script wraps the common commands:

```bash
scripts/aikb lint
scripts/aikb test
scripts/aikb build
scripts/aikb check
scripts/aikb e2e
scripts/aikb sources
scripts/aikb run
```

`scripts/aikb run` starts MkDocs on `http://127.0.0.1:8001` by default. Override it with `PORT=8002 scripts/aikb run`.

`scripts/aikb e2e` starts a temporary MkDocs server on `http://127.0.0.1:8011`, runs browser checks with Playwright, and stops the server. Override it with `E2E_PORT=8012 scripts/aikb e2e`.

`scripts/aikb sources` builds `docs/assets/source-previews.json`, a server-side cache of external source excerpts used by the in-app source preview panel.

Install local hooks with:

```bash
poetry run pre-commit install
```

## Content refresh

Sources in `data/sources.yaml` can define:

- `refresh_interval_days`: how often the source is eligible to fetch new items.
- `retention_days`: how long source-backed items remain current before pruning.
- `max_items`: maximum items to collect from feed-style sources.

Run a local refresh with:

```bash
poetry run aikb refresh
```

Preview changes without writing or deleting files:

```bash
poetry run aikb refresh --dry-run
poetry run aikb prune --dry-run
```

The scheduled GitHub workflow runs daily, commits newly fetched `data/items/*.json`, and removes stale or unbacked items after the quality gate passes.

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
