# Learning Tools

Learning tools are interactive features on each content page.

When a user opens a topic, the page can create study artifacts from the current
content:

- Quiz
- Flashcards
- Audio review
- Mind map
- Study guide

The first implementation runs in the browser and uses the visible page content.
It is intentionally local and deterministic: no account, API key, upload, or
backend job is required.

## How It Works

Each page exposes a **Create from this page** toolbar below the title. The tools
extract headings, paragraphs, list items, and key terms from the current article
and render an interactive artifact in place.

## Current Tools

| Tool | Behavior |
| --- | --- |
| Quiz | Creates source-grounded review questions from page statements. |
| Flashcards | Creates cards from page sections and section summaries. |
| Audio Review | Creates a short review script and plays it with browser speech synthesis. |
| Mind Map | Creates a concept map from headings and extracted key terms. |
| Study Guide | Creates a review sequence, key terms, and self-check prompt. |

## Product Direction

The browser implementation is the first slice. The production version should add
model-backed generation, citations, saved learner state, spaced repetition,
audio file rendering, exports, and quality evaluation.
