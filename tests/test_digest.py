from datetime import UTC, datetime

from aikb.digest import build_digest
from aikb.models import KnowledgeItem, Source


def source(**overrides: object) -> Source:
    payload: dict[str, object] = {
        "id": "official",
        "name": "Official Docs",
        "category": "agent_framework",
        "authority": "primary",
        "type": "documentation",
        "url": "https://example.com/docs",
        "priority": 90,
    }
    payload.update(overrides)
    return Source.model_validate(payload)


def item(**overrides: object) -> KnowledgeItem:
    payload: dict[str, object] = {
        "id": "item",
        "title": "Useful Release",
        "source_id": "official",
        "url": "https://example.com/docs/release",
        "collected_at": datetime(2026, 7, 17, tzinfo=UTC),
        "category": "agent_framework",
        "summary": "Important engineering update.",
        "evidence_quality": 80,
        "engineering_impact": 80,
        "maturity": "stable",
    }
    payload.update(overrides)
    return KnowledgeItem.model_validate(payload)


def test_build_digest_empty_items_explains_next_step() -> None:
    digest = build_digest([], [source()])

    assert digest.startswith("# Weekly AI Engineering Digest")
    assert "No normalized items are available yet." in digest
    assert "Run collectors" in digest


def test_build_digest_orders_items_by_score_and_respects_limit() -> None:
    high = item(id="high", title="High Impact", engineering_impact=95)
    low = item(
        id="low",
        title="Low Impact",
        url="https://example.com/docs/low",
        engineering_impact=10,
        evidence_quality=10,
        maturity="unknown",
    )

    digest = build_digest([low, high], [source()], limit=1)

    assert "High Impact" in digest
    assert "Low Impact" not in digest
    assert "## Agent Framework" in digest


def test_build_digest_uses_editorial_fallback_for_missing_summary() -> None:
    digest = build_digest([item(summary="")], [source()])

    assert "Editorial review required." in digest
