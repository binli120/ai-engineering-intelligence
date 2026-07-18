import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from pytest import MonkeyPatch

from aikb.models import KnowledgeItem, Source
from aikb.refresh import (
    RefreshStats,
    clean_text,
    extract_description,
    extract_title,
    item_id,
    parse_http_datetime,
    prune_stale_items,
    refresh_sources,
    should_refresh,
    write_items,
)


def source(**overrides: object) -> Source:
    payload: dict[str, object] = {
        "id": "example",
        "name": "Example Docs",
        "category": "ai_coding",
        "authority": "primary",
        "type": "documentation",
        "url": "https://example.com/docs",
        "priority": 90,
        "refresh_interval_days": 1,
        "retention_days": 30,
        "max_items": 10,
    }
    payload.update(overrides)
    return Source.model_validate(payload)


def item(**overrides: object) -> KnowledgeItem:
    payload: dict[str, object] = {
        "id": "example-docs",
        "title": "Example Docs",
        "source_id": "example",
        "url": "https://example.com/docs",
        "collected_at": "2026-07-17T00:00:00Z",
        "category": "ai_coding",
        "summary": "Example summary.",
    }
    payload.update(overrides)
    return KnowledgeItem.model_validate(payload)


def write_json(path: Path, value: KnowledgeItem) -> None:
    path.write_text(json.dumps(value.model_dump(mode="json")), encoding="utf-8")


def test_should_refresh_respects_source_interval() -> None:
    current = item(collected_at="2026-07-17T00:00:00Z")
    assert not should_refresh(
        source(refresh_interval_days=2),
        [current],
        datetime(2026, 7, 18, tzinfo=UTC),
    )
    assert should_refresh(
        source(refresh_interval_days=1),
        [current],
        datetime(2026, 7, 18, 1, tzinfo=UTC),
    )


def test_write_items_deduplicates_by_source_and_url(tmp_path: Path) -> None:
    older = item(id="old-title")
    write_json(tmp_path / "old-title.json", older)

    newer = item(
        id="new-title",
        title="New Title",
        collected_at="2026-07-18T00:00:00Z",
    )
    stats = write_items([newer], tmp_path, dry_run=False)

    assert stats == RefreshStats(fetched=1, written=1)
    assert not (tmp_path / "old-title.json").exists()
    assert (tmp_path / "new-title.json").exists()


def test_prune_stale_items_removes_old_and_unbacked_items(tmp_path: Path) -> None:
    stale = item(
        id="stale",
        collected_at=(datetime(2026, 7, 17, tzinfo=UTC) - timedelta(days=31)).isoformat(),
    )
    current = item(id="current", collected_at="2026-07-17T00:00:00Z")
    unbacked = item(id="unbacked", source_id="missing", collected_at="2026-07-17T00:00:00Z")
    for value in [stale, current, unbacked]:
        write_json(tmp_path / f"{value.id}.json", value)

    stats = prune_stale_items(
        [source(retention_days=30)],
        items_dir=tmp_path,
        now=datetime(2026, 7, 17, tzinfo=UTC),
    )

    assert stats.pruned == 2
    assert not (tmp_path / "stale.json").exists()
    assert (tmp_path / "current.json").exists()
    assert not (tmp_path / "unbacked.json").exists()


def test_prune_stale_items_dry_run_does_not_delete(tmp_path: Path) -> None:
    stale = item(
        id="stale",
        collected_at=(datetime(2026, 7, 17, tzinfo=UTC) - timedelta(days=31)).isoformat(),
    )
    write_json(tmp_path / "stale.json", stale)

    stats = prune_stale_items(
        [source(retention_days=30)],
        items_dir=tmp_path,
        now=datetime(2026, 7, 17, tzinfo=UTC),
        dry_run=True,
    )

    assert stats.pruned == 1
    assert (tmp_path / "stale.json").exists()


def test_prune_stale_items_removes_disabled_source_items(tmp_path: Path) -> None:
    disabled_item = item(id="disabled")
    write_json(tmp_path / "disabled.json", disabled_item)

    stats = prune_stale_items(
        [source(enabled=False)],
        items_dir=tmp_path,
        now=datetime(2026, 7, 17, tzinfo=UTC),
    )

    assert stats.pruned == 1
    assert not (tmp_path / "disabled.json").exists()


def test_refresh_sources_skips_recent_sources(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    write_json(tmp_path / "example-docs.json", item())

    def fail_fetch(_source: Source, _now: datetime) -> list[KnowledgeItem]:
        raise AssertionError("recent sources should not be fetched")

    monkeypatch.setattr("aikb.refresh.fetch_source", fail_fetch)
    stats = refresh_sources(
        [source(refresh_interval_days=2)],
        items_dir=tmp_path,
        now=datetime(2026, 7, 18, tzinfo=UTC),
        prune=False,
    )

    assert stats.skipped == 1


def test_refresh_sources_dry_run_does_not_fetch(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    def fail_fetch(_source: Source, _now: datetime) -> list[KnowledgeItem]:
        raise AssertionError("dry-run should not fetch remote content")

    monkeypatch.setattr("aikb.refresh.fetch_source", fail_fetch)
    stats = refresh_sources(
        [source()],
        items_dir=tmp_path,
        now=datetime(2026, 7, 18, tzinfo=UTC),
        dry_run=True,
        prune=False,
    )

    assert stats.due == 1
    assert stats.fetched == 0


def test_refresh_sources_counts_fetch_failures(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    def fail_fetch(_source: Source, _now: datetime) -> list[KnowledgeItem]:
        raise ValueError("bad feed")

    monkeypatch.setattr("aikb.refresh.fetch_source", fail_fetch)
    stats = refresh_sources(
        [source()],
        items_dir=tmp_path,
        now=datetime(2026, 7, 18, tzinfo=UTC),
        prune=False,
    )

    assert stats.failed == 1


def test_write_items_skips_newer_existing_item(tmp_path: Path) -> None:
    newer_existing = item(collected_at="2026-07-19T00:00:00Z")
    write_json(tmp_path / "example-docs.json", newer_existing)

    older_incoming = item(id="older", collected_at="2026-07-18T00:00:00Z")
    stats = write_items([older_incoming], tmp_path, dry_run=False)

    assert stats == RefreshStats(fetched=1, skipped=1)
    assert not (tmp_path / "older.json").exists()
    assert (tmp_path / "example-docs.json").exists()


def test_html_metadata_helpers_extract_and_clean_values() -> None:
    html = """
    <html>
      <head>
        <title> Example   Page </title>
        <meta name="description" content=" Useful   description. ">
      </head>
    </html>
    """

    assert extract_title(html) == "Example Page"
    assert extract_description(html) == "Useful description."
    assert clean_text("<p>Hello<br> world</p>") == "Hello world"


def test_item_id_is_stable_and_slugged() -> None:
    first = item_id("source", "https://example.com/a", "Hello, World!")
    second = item_id("source", "https://example.com/a", "Hello, World!")

    assert first == second
    assert first.startswith("hello-world-")


def test_parse_http_datetime_returns_utc_datetime() -> None:
    parsed = parse_http_datetime("Fri, 17 Jul 2026 13:06:07 GMT")

    assert parsed == datetime(2026, 7, 17, 13, 6, 7, tzinfo=UTC)
