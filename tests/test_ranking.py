from datetime import UTC, datetime

from aikb.models import KnowledgeItem, Source
from aikb.ranking import score


def test_primary_stable_source_scores_higher() -> None:
    item = KnowledgeItem.model_validate(
        {
            "id": "x",
            "title": "Release",
            "source_id": "s",
            "url": "https://example.com/release",
            "collected_at": datetime.now(UTC),
            "category": "agent_framework",
            "evidence_quality": 90,
            "engineering_impact": 90,
            "maturity": "stable",
        }
    )
    primary = Source.model_validate(
        {
            "id": "s",
            "name": "Official",
            "category": "agent_framework",
            "authority": "primary",
            "type": "documentation",
            "url": "https://example.com",
            "priority": 90,
        }
    )
    community = primary.model_copy(update={"authority": "community"})
    assert score(item, primary) > score(item, community)


def test_deprecated_item_scores_lower_than_stable_item() -> None:
    source = Source.model_validate(
        {
            "id": "s",
            "name": "Official",
            "category": "agent_framework",
            "authority": "primary",
            "type": "documentation",
            "url": "https://example.com",
            "priority": 90,
        }
    )
    stable = KnowledgeItem.model_validate(
        {
            "id": "stable",
            "title": "Stable",
            "source_id": "s",
            "url": "https://example.com/stable",
            "collected_at": datetime.now(UTC),
            "category": "agent_framework",
            "evidence_quality": 90,
            "engineering_impact": 90,
            "maturity": "stable",
        }
    )
    deprecated = stable.model_copy(
        update={
            "id": "deprecated",
            "title": "Deprecated",
            "url": "https://example.com/deprecated",
            "maturity": "deprecated",
        }
    )

    assert score(stable, source) > score(deprecated, source)
