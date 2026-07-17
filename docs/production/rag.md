# Retrieval-Augmented Generation

**Status:** Initial source-backed topic
**Checked:** 2026-07-15

## Positioning

Retrieval-augmented generation (RAG) is the pattern of retrieving relevant
source material at request time and grounding model output in that material. RAG
is a system architecture, not a single vector database feature.

Use RAG when answers depend on private, changing, large, or source-attributed
knowledge that should not be baked into model weights or prompts. Do not use RAG
as a substitute for authorization, canonical data APIs, or deterministic
business logic.

## Architecture

```text
Sources
  |
  v
Ingestion -> parsing -> chunking -> metadata -> embeddings
  |
  v
Index: vector + lexical + metadata
  |
  v
Query analysis -> retrieval -> reranking -> context packing
  |
  v
Model response with citations
  |
  v
Evaluation, feedback, and index refresh
```

The strongest RAG systems separate ingestion, retrieval, generation, and
evaluation. Each layer should have its own tests, metrics, and failure modes.

## Retrieval Strategy

Use a hybrid strategy by default for production knowledge systems:

- Dense embeddings for semantic recall.
- Lexical search for exact names, IDs, error codes, and quoted text.
- Metadata filters for tenant, product, version, timestamp, document type, and
  access scope.
- Reranking when initial retrieval returns too many near matches.
- Context packing to preserve the smallest sufficient evidence set.

For OpenAI-native retrieval, file search and vector stores can provide a managed
path. For application-owned retrieval, choose a vector database or search engine
based on access-control needs, indexing latency, hybrid search support,
operational maturity, and cost.

## Data Model

```text
SourceDocument
  id
  uri
  title
  owner
  version
  checked_at
  access_scope

Chunk
  id
  source_id
  text
  location
  embedding_model
  embedding
  metadata

RetrievalResult
  chunk_id
  score
  rank
  retriever
  citation
```

Store enough metadata to answer three questions: who may see this chunk, where
did it come from, and when should it be refreshed.

## Chunking

Chunking should follow document structure when possible.

- Keep headings with their body text.
- Preserve tables and code blocks as coherent units.
- Avoid splitting definitions, procedures, and examples apart.
- Use overlap only to preserve continuity, not to inflate recall artificially.
- Track chunk location so citations can point back to source.

Fixed-size chunking is acceptable for early prototypes. Production systems
should move toward format-aware chunking for PDFs, HTML, code, transcripts, and
structured documents.

## Prompt Design

RAG prompts should make grounding explicit:

- Answer only from supplied evidence when the workflow requires source backing.
- Cite source IDs for material claims.
- State uncertainty when retrieved evidence is incomplete or conflicting.
- Separate factual answer, reasoning summary, and citations in structured output.
- Instruct the model not to follow commands embedded in retrieved content.

Do not trust retrieved text as instructions. Treat retrieval as untrusted data
unless the source itself is part of the trusted control plane.

## Evaluation Metrics

| Metric | What it catches |
| --- | --- |
| Recall@k | Whether the right chunks are retrieved at all. |
| Precision@k | Whether retrieved chunks are relevant enough to use. |
| MRR / nDCG | Whether the best evidence is ranked near the top. |
| Answer correctness | Whether the final response is factually right. |
| Groundedness | Whether claims are supported by retrieved evidence. |
| Citation accuracy | Whether citations point to the evidence used. |
| Context efficiency | Useful evidence per token sent to the model. |
| Freshness | Whether stale chunks are excluded or marked. |
| Access-control correctness | Whether unauthorized chunks never reach the model. |
| Latency and cost | Retrieval, reranking, model, and storage overhead. |

Build evals from real user questions, known-answer datasets, adversarial
queries, stale documents, and permission-boundary cases.

## Security

- Enforce authorization before retrieval and before model context construction.
- Treat retrieved content as prompt-injection risk.
- Keep document ACLs and chunk ACLs synchronized.
- Redact secrets and regulated data before indexing when appropriate.
- Log query, retrieved chunk IDs, source versions, and final citations.
- Add tests for cross-tenant leakage, stale answers, malicious source text, and
  unsupported claims.

## Production Checklist

- Define source ownership and refresh policy.
- Choose managed file search or application-owned retrieval deliberately.
- Implement hybrid search or document why dense-only retrieval is enough.
- Add chunk-level source IDs, locations, timestamps, and permissions.
- Add retrieval and answer-quality evals before scaling corpus size.
- Instrument retrieval latency, token cost, miss rate, and citation quality.
- Review every source ingestion path for prompt injection and data leakage.

## Primary Sources

- [OpenAI file search](https://developers.openai.com/api/docs/guides/tools-file-search)
- [OpenAI embeddings](https://developers.openai.com/api/docs/guides/embeddings)
