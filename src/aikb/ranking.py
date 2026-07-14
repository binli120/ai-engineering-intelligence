from .models import KnowledgeItem, Source

AUTHORITY_WEIGHT = {"primary": 1.0, "secondary": 0.7, "community": 0.45}
MATURITY_WEIGHT = {
    "stable": 1.0,
    "preview": 0.65,
    "beta": 0.60,
    "alpha": 0.45,
    "deprecated": 0.10,
    "unknown": 0.50,
}


def score(item: KnowledgeItem, source: Source) -> float:
    weighted = (
        0.35 * item.engineering_impact
        + 0.30 * item.evidence_quality
        + 0.20 * source.priority
        + 0.15 * 100 * MATURITY_WEIGHT[item.maturity]
    )
    return round(weighted * AUTHORITY_WEIGHT[source.authority], 2)
