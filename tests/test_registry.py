from pathlib import Path

from aikb.registry import load_sources


def test_registry_is_valid_and_unique() -> None:
    sources = load_sources(Path("data/sources.yaml"))
    assert sources
    ids = [source.id for source in sources]
    assert len(ids) == len(set(ids))
    assert all(source.priority >= 0 for source in sources)
