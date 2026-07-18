from pathlib import Path

from aikb.source_preview import ReadableHTMLParser, extract_source_links, refine_items


def test_readable_html_parser_extracts_title_and_content() -> None:
    parser = ReadableHTMLParser()
    parser.feed(
        """
        <html>
          <head><title>Example Docs</title><style>.x{}</style></head>
          <body>
            <nav>This should be skipped</nav>
            <main>
              <h1>Readable Heading For The Documentation Page</h1>
              <p>This paragraph is long enough to become preview content for the app.</p>
              <script>ignored()</script>
            </main>
          </body>
        </html>
        """
    )

    assert parser.title == "Example Docs"
    assert parser.items == [
        {"tag": "h1", "text": "Readable Heading For The Documentation Page"},
        {
            "tag": "p",
            "text": "This paragraph is long enough to become preview content for the app.",
        },
    ]


def test_extract_source_links_deduplicates_markdown_urls(tmp_path: Path) -> None:
    docs = tmp_path / "docs"
    docs.mkdir()
    (docs / "topic.md").write_text(
        """
        [One](https://example.com/one)
        [Duplicate](https://example.com/one)
        [Two](https://example.com/two)
        """,
        encoding="utf-8",
    )

    assert extract_source_links(docs) == [
        {"label": "One", "url": "https://example.com/one"},
        {"label": "Two", "url": "https://example.com/two"},
    ]


def test_refine_items_removes_boilerplate_and_starts_at_article_heading() -> None:
    items = [
        {"tag": "p", "text": "Fetch the complete documentation index at: /llms.txt"},
        {"tag": "p", "text": "Use this file to discover all available pages before exploring."},
        {"tag": "h3", "text": "Navigation"},
        {"tag": "p", "text": "This navigation item should not appear in the preview output."},
        {"tag": "h1", "text": "LangGraph overview"},
        {
            "tag": "p",
            "text": "LangGraph is a low-level orchestration framework for stateful agents.",
        },
        {"tag": "h2", "text": "Core benefits"},
        {"tag": "p", "text": "Persistence and human-in-the-loop workflows are central benefits."},
    ]

    refined = refine_items(
        items,
        label="LangGraph Overview",
        title="LangGraph overview - Docs by LangChain",
        url="https://docs.langchain.com/oss/python/langgraph/overview",
    )

    assert refined == items[4:]
