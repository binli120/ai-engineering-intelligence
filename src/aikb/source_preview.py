import json
import re
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

import httpx

BOILERPLATE_PATTERNS = [
    "fetch the complete documentation index",
    "use this file to discover",
    "skip to main content",
    "copy page",
    "on this page",
    "was this page helpful",
    "search...",
    "navigation",
    "learn more",
    "get your tickets",
]


class ReadableHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.items: list[dict[str, str]] = []
        self._current_tag: str | None = None
        self._buffer: list[str] = []
        self._title: list[str] = []
        self._in_title = False
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "svg", "nav", "footer", "form"}:
            self._skip_depth += 1
            return
        if self._skip_depth:
            return
        if tag == "title":
            self._in_title = True
            return
        if tag in {"h1", "h2", "h3", "p", "li"}:
            self._flush()
            self._current_tag = tag if tag.startswith("h") else "p"
            self._buffer = []

    def handle_endtag(self, tag: str) -> None:
        if self._skip_depth:
            if tag in {"script", "style", "svg", "nav", "footer", "form"}:
                self._skip_depth -= 1
            return
        if tag == "title":
            self._in_title = False
            return
        if tag in {"h1", "h2", "h3", "p", "li"}:
            self._flush()

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        if self._in_title:
            self._title.append(data)
            return
        if self._current_tag:
            self._buffer.append(data)

    @property
    def title(self) -> str:
        return clean_text(" ".join(self._title))

    def _flush(self) -> None:
        if not self._current_tag:
            return
        text = clean_text(" ".join(self._buffer))
        min_length = 10 if self._current_tag.startswith("h") else 45
        if len(text) >= min_length:
            self.items.append({"tag": self._current_tag, "text": text})
        self._current_tag = None
        self._buffer = []


def extract_source_links(docs_dir: Path) -> list[dict[str, str]]:
    pattern = re.compile(r"\[([^\]]+)\]\((https?://[^)\s]+)\)")
    seen: set[str] = set()
    links: list[dict[str, str]] = []
    for path in sorted(docs_dir.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        for label, url in pattern.findall(text):
            if url in seen:
                continue
            seen.add(url)
            links.append({"label": clean_text(label), "url": url})
    return links


def build_source_previews(
    docs_dir: Path,
    *,
    limit: int = 80,
    timeout: float = 15.0,
) -> dict[str, Any]:
    previews: dict[str, Any] = {}
    headers = {
        "User-Agent": "AI Engineering Intelligence source preview generator",
        "Accept": "text/html,application/xhtml+xml",
    }
    with httpx.Client(follow_redirects=True, timeout=timeout, headers=headers) as client:
        for link in extract_source_links(docs_dir)[:limit]:
            url = link["url"]
            try:
                response = client.get(url)
                response.raise_for_status()
                parser = ReadableHTMLParser()
                parser.feed(response.text[:300_000])
                items = refine_items(
                    parser.items,
                    label=link["label"],
                    title=parser.title,
                    url=url,
                )[:40]
                if not items:
                    continue
                previews[url] = {
                    "url": str(response.url),
                    "label": link["label"],
                    "title": parser.title or link["label"],
                    "items": items,
                }
            except httpx.HTTPError:
                continue
    return previews


def write_source_previews(
    docs_dir: Path,
    output: Path,
    *,
    limit: int = 80,
) -> int:
    previews = build_source_previews(docs_dir, limit=limit)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(previews, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return len(previews)


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def refine_items(
    items: list[dict[str, str]],
    *,
    label: str,
    title: str,
    url: str,
) -> list[dict[str, str]]:
    filtered = [item for item in dedupe_items(items) if not is_boilerplate(item["text"])]
    start = article_start_index(filtered, label=label, title=title, url=url)
    if start > 0:
        filtered = filtered[start:]
    return filtered


def dedupe_items(items: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[str] = set()
    deduped: list[dict[str, str]] = []
    for item in items:
        key = item["text"].casefold()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def is_boilerplate(text: str) -> bool:
    normalized = text.casefold()
    if len(normalized) < 10:
        return True
    return any(pattern in normalized for pattern in BOILERPLATE_PATTERNS)


def article_start_index(
    items: list[dict[str, str]],
    *,
    label: str,
    title: str,
    url: str,
) -> int:
    desired_terms = (
        set(tokenize(label)) | set(tokenize(title)) | set(tokenize(url.rsplit("/", 1)[-1]))
    )
    best_index = 0
    best_score = 0
    for index, item in enumerate(items):
        if item["tag"] not in {"h1", "h2", "h3"}:
            continue
        terms = set(tokenize(item["text"]))
        score = len(terms & desired_terms)
        if score > best_score:
            best_index = index
            best_score = score
    return best_index


def tokenize(value: str) -> list[str]:
    return [
        token
        for token in re.split(r"[^a-z0-9]+", value.casefold())
        if len(token) > 2 and token not in {"docs", "documentation", "page"}
    ]
