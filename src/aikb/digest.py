from collections import defaultdict

from .models import KnowledgeItem, Source
from .ranking import score


def build_digest(items: list[KnowledgeItem], sources: list[Source], limit: int = 10) -> str:
    source_map = {s.id: s for s in sources}
    ranked = sorted(
        items,
        key=lambda item: score(item, source_map[item.source_id]),
        reverse=True,
    )[:limit]

    lines = ["# Weekly AI Engineering Digest", ""]
    if not ranked:
        lines += [
            "No normalized items are available yet.",
            "",
            "Run collectors, review the resulting metadata, and then regenerate this digest.",
        ]
        return "\n".join(lines)

    grouped: dict[str, list[KnowledgeItem]] = defaultdict(list)
    for item in ranked:
        grouped[item.category].append(item)

    for category, category_items in grouped.items():
        lines += [f"## {category.replace('_', ' ').title()}", ""]
        for item in category_items:
            source = source_map[item.source_id]
            lines += [
                f"### [{item.title}]({item.url})",
                f"- Source: {source.name}",
                f"- Maturity: {item.maturity}",
                f"- Score: {score(item, source)}",
                f"- Why it matters: {item.summary or 'Editorial review required.'}",
                "",
            ]
    return "\n".join(lines)
