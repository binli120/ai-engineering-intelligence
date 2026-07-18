# Weekly Updates

Weekly updates turn the source registry into an editorial review queue. The goal is to make new AI engineering changes visible without letting stale or low-quality documents accumulate.

## Digest Questions

Each digest should answer:

1. What materially changed?
2. Which developers are affected?
3. Is the change stable, preview, beta, alpha, deprecated, or unknown?
4. What should be learned or tested?
5. What can safely be ignored?
6. Which claims come from primary sources?
7. What should be rechecked next week?

## Refresh Pipeline

```text
data/sources.yaml
  -> daily refresh
  -> normalized data/items/*.json
  -> stale item pruning
  -> source validation
  -> weekly digest generation
  -> editorial review
```

The refresh job should collect new items, prune stale or unbacked documents, and keep the registry source-backed. Automation prepares the queue; editorial review decides what deserves attention.

## Source Policy

Each source can define:

- `refresh_interval_days`: how often it is eligible for refresh,
- `retention_days`: when old items should be removed,
- `max_items`: maximum items collected from feed-style sources.

Primary sources should have higher priority than community commentary. Research feeds can have shorter retention because relevance changes quickly.

## Digest Structure

Use this structure for the weekly page:

```text
# Weekly AI Engineering Digest

## Material Changes
## Framework And Platform Updates
## Production Risks
## Tutorials To Recheck
## Items Removed As Stale
## Next Week Watchlist
```

Avoid long news dumps. Each item should explain why an engineer should care.

## Evaluation Metrics

| Metric | Why It Matters |
| --- | --- |
| New primary-source items | Shows official change volume |
| Stale items pruned | Keeps the app current |
| Digest acceptance rate | Measures editorial relevance |
| Broken source rate | Finds dead or moved docs |
| Time to review | Prevents stale queues |
| Repeat topic rate | Identifies noisy sources |

## Operating Commands

Preview refresh work:

```bash
scripts/aikb refresh:dry
```

Run the refresh locally:

```bash
scripts/aikb refresh
```

Run the quality gate:

```bash
scripts/aikb check
```

## Production Checklist

- Keep source IDs stable.
- Prefer official docs, release notes, repositories, and papers.
- Mark generated items with collection time.
- Remove documents that are stale, disabled, or no longer source-backed.
- Review high-impact items before promoting them to tutorials or topic pages.
- Track changes that require app code updates.

## Primary Sources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-06-18/index)
- [OpenAI Agents SDK Documentation](https://openai.github.io/openai-agents-python/)
- [LangGraph Documentation](https://docs.langchain.com/oss/python/langgraph/overview)
