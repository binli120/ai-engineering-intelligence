# RAG Evaluation

This tutorial teaches how to evaluate retrieval-augmented generation as a pipeline, not as a single answer. Retrieval quality, evidence extraction, answer generation, and citation validation should each have their own checks.

## Objective

Build a small RAG evaluation loop that answers known questions from a controlled source set and records where failures occur.

## Architecture

```text
Question set
  -> Query rewriting
  -> Retrieval
  -> Reranking
  -> Evidence extraction
  -> Answer generation
  -> Citation validation
  -> Metrics report
```

Treat each stage as measurable. A bad answer is not always a generation problem; it is often a retrieval or evidence-selection problem.

## Step 1: Create A Question Set

Start with 20 to 50 questions:

- direct fact questions,
- comparison questions,
- questions with no answer in the corpus,
- questions requiring multiple sources,
- adversarial wording,
- stale or version-sensitive questions.

Each question should include expected evidence, not just an expected final answer.

## Step 2: Measure Retrieval

Track whether the right documents appear in the top results:

| Metric | Meaning |
| --- | --- |
| Recall@K | The expected source appears in the first K results |
| MRR | The expected source appears near the top |
| Duplicate rate | Similar chunks crowd out useful context |
| No-answer retrieval | The system avoids irrelevant evidence |

Retrieval metrics should be available before generation runs.

## Step 3: Validate Answers

Answer quality should be judged against evidence:

- Does the answer address the question?
- Are claims supported by cited sources?
- Are missing facts acknowledged?
- Are version constraints preserved?
- Does the answer avoid overgeneralizing from one source?

Use model graders only after defining deterministic checks for citation presence and source coverage.

## Step 4: Track Failures

Classify failures by stage:

| Failure Type | Example |
| --- | --- |
| Ingestion | Document missing or stale |
| Chunking | Relevant fact split across chunks |
| Retrieval | Correct source not returned |
| Reranking | Correct source ranked too low |
| Generation | Correct source present but answer wrong |
| Citation | Answer correct but source attribution missing |

This classification tells you which part to improve.

## Prompt Design

Evaluation prompts should keep graders grounded:

```text
Judge the answer only against the provided reference evidence.
Return supported, unsupported, or partially_supported.
List unsupported claims.
Do not use outside knowledge.
```

## Production Checklist

- Keep a stable golden question set.
- Add new questions from user failures.
- Separate retrieval metrics from answer metrics.
- Track stale documents and source versions.
- Run evaluation before changing chunking, embeddings, rerankers, or prompts.
- Record latency and cost per stage.

## Primary Sources

- [OpenAI File Search Guide](https://developers.openai.com/api/docs/guides/tools-file-search)
- [OpenAI Evals Guide](https://developers.openai.com/api/docs/guides/evals)
- [OpenAI Embeddings Guide](https://developers.openai.com/api/docs/guides/embeddings)
