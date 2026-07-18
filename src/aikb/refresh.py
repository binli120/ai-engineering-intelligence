import hashlib
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any

import feedparser
import httpx

from .models import KnowledgeItem, Source


@dataclass(frozen=True)
class RefreshStats:
    due: int = 0
    fetched: int = 0
    written: int = 0
    skipped: int = 0
    pruned: int = 0
    failed: int = 0

    def merge(self, other: "RefreshStats") -> "RefreshStats":
        return RefreshStats(
            due=self.due + other.due,
            fetched=self.fetched + other.fetched,
            written=self.written + other.written,
            skipped=self.skipped + other.skipped,
            pruned=self.pruned + other.pruned,
            failed=self.failed + other.failed,
        )


def load_items(items_dir: Path) -> list[KnowledgeItem]:
    if not items_dir.exists():
        return []
    return [
        KnowledgeItem.model_validate(json.loads(path.read_text(encoding="utf-8")))
        for path in sorted(items_dir.glob("*.json"))
    ]


def refresh_sources(
    sources: list[Source],
    *,
    items_dir: Path,
    now: datetime | None = None,
    dry_run: bool = False,
    prune: bool = True,
) -> RefreshStats:
    clock = normalize_datetime(now or datetime.now(UTC))
    existing = load_items(items_dir)
    stats = RefreshStats()

    for source in sources:
        if not source.enabled:
            continue
        if not should_refresh(source, existing, clock):
            stats = stats.merge(RefreshStats(skipped=1))
            continue
        if dry_run:
            stats = stats.merge(RefreshStats(due=1))
            continue
        try:
            stats = stats.merge(
                write_items(fetch_source(source, clock), items_dir, dry_run=dry_run)
            )
        except (httpx.HTTPError, ValueError):
            stats = stats.merge(RefreshStats(failed=1))

    if prune:
        stats = stats.merge(
            prune_stale_items(sources, items_dir=items_dir, now=clock, dry_run=dry_run)
        )

    return stats


def should_refresh(source: Source, items: list[KnowledgeItem], now: datetime) -> bool:
    source_items = [item for item in items if item.source_id == source.id]
    if not source_items:
        return True
    latest = max(normalize_datetime(item.collected_at) for item in source_items)
    return latest <= now - timedelta(days=source.refresh_interval_days)


def fetch_source(source: Source, now: datetime) -> list[KnowledgeItem]:
    if source.type == "rss":
        return fetch_rss(source, now)
    return [fetch_page_snapshot(source, now)]


def fetch_rss(source: Source, now: datetime) -> list[KnowledgeItem]:
    parsed = feedparser.parse(str(source.url))
    if parsed.bozo and not parsed.entries:
        raise ValueError(f"Could not parse feed for source {source.id}")
    items: list[KnowledgeItem] = []
    for entry in parsed.entries[: source.max_items]:
        url = str(getattr(entry, "link", source.url))
        title = clean_text(str(getattr(entry, "title", source.name)))
        summary = clean_text(str(getattr(entry, "summary", "")))
        published_at = parse_optional_datetime(
            getattr(entry, "published", None) or getattr(entry, "updated", None)
        )
        items.append(
            KnowledgeItem.model_validate(
                {
                    "id": item_id(source.id, url, title),
                    "title": title or source.name,
                    "source_id": source.id,
                    "url": url,
                    "published_at": published_at,
                    "collected_at": now,
                    "category": source.category,
                    "summary": summary,
                    "evidence_quality": evidence_quality(source),
                    "engineering_impact": source.priority,
                    "maturity": "unknown",
                    "tags": tags_for_source(source),
                }
            )
        )
    return items


def fetch_page_snapshot(source: Source, now: datetime) -> KnowledgeItem:
    response = httpx.get(str(source.url), follow_redirects=True, timeout=20)
    response.raise_for_status()
    body = response.text[:200_000]
    title = extract_title(body) or source.name
    summary = extract_description(body) or f"Current snapshot of {source.name}."
    published_at = parse_http_datetime(response.headers.get("last-modified"))
    return KnowledgeItem.model_validate(
        {
            "id": item_id(source.id, str(response.url), title),
            "title": clean_text(title),
            "source_id": source.id,
            "url": str(response.url),
            "published_at": published_at,
            "collected_at": now,
            "category": source.category,
            "summary": clean_text(summary),
            "evidence_quality": evidence_quality(source),
            "engineering_impact": source.priority,
            "maturity": "stable" if source.authority == "primary" else "unknown",
            "tags": tags_for_source(source),
        }
    )


def write_items(
    items: list[KnowledgeItem],
    items_dir: Path,
    *,
    dry_run: bool = False,
) -> RefreshStats:
    if not items:
        return RefreshStats()

    items_dir.mkdir(parents=True, exist_ok=True)
    existing_by_key = {(item.source_id, str(item.url)): item for item in load_items(items_dir)}
    written = 0
    skipped = 0

    for item in items:
        current = existing_by_key.get((item.source_id, str(item.url)))
        if current and normalize_datetime(current.collected_at) >= normalize_datetime(
            item.collected_at
        ):
            skipped += 1
            continue
        if not dry_run:
            path = items_dir / f"{item.id}.json"
            path.write_text(
                json.dumps(item.model_dump(mode="json"), indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            if current and current.id != item.id:
                old_path = items_dir / f"{current.id}.json"
                if old_path.exists():
                    old_path.unlink()
        written += 1

    return RefreshStats(fetched=len(items), written=written, skipped=skipped)


def prune_stale_items(
    sources: list[Source],
    *,
    items_dir: Path,
    now: datetime | None = None,
    dry_run: bool = False,
) -> RefreshStats:
    if not items_dir.exists():
        return RefreshStats()

    clock = normalize_datetime(now or datetime.now(UTC))
    sources_by_id = {source.id: source for source in sources}
    pruned = 0

    for path in sorted(items_dir.glob("*.json")):
        item = KnowledgeItem.model_validate(json.loads(path.read_text(encoding="utf-8")))
        source = sources_by_id.get(item.source_id)
        if source is None or not source.enabled:
            should_delete = True
        else:
            freshness_date = normalize_datetime(item.published_at or item.collected_at)
            should_delete = freshness_date < clock - timedelta(days=source.retention_days)
        if should_delete:
            pruned += 1
            if not dry_run:
                path.unlink()

    return RefreshStats(pruned=pruned)


def item_id(source_id: str, url: str, title: str) -> str:
    digest = hashlib.sha256(f"{source_id}:{url}".encode()).hexdigest()[:10]
    return f"{slugify(title or source_id)}-{digest}"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:70].strip("-") or "item"


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value)).strip()


def extract_title(html: str) -> str | None:
    match = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
    return clean_text(match.group(1)) if match else None


def extract_description(html: str) -> str | None:
    patterns = [
        r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']',
        r'<meta\s+content=["\'](.*?)["\']\s+name=["\']description["\']',
        r'<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, flags=re.IGNORECASE | re.DOTALL)
        if match:
            return clean_text(match.group(1))
    return None


def parse_http_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return normalize_datetime(parsedate_to_datetime(value))
    except (TypeError, ValueError):
        return None


def parse_optional_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return normalize_datetime(parsedate_to_datetime(str(value)))
    except (TypeError, ValueError):
        pass
    try:
        return normalize_datetime(datetime.fromisoformat(str(value).replace("Z", "+00:00")))
    except ValueError:
        return None


def normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def evidence_quality(source: Source) -> int:
    if source.authority == "primary":
        return 90
    if source.authority == "secondary":
        return 70
    return 50


def tags_for_source(source: Source) -> list[str]:
    return [source.category.replace("_", "-"), source.type]
