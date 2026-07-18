from pathlib import Path

import pytest

from aikb.registry import load_sources


def test_load_sources_rejects_non_mapping_yaml(tmp_path: Path) -> None:
    path = tmp_path / "sources.yaml"
    path.write_text("- not\n- a\n- mapping\n", encoding="utf-8")

    with pytest.raises(ValueError, match="Expected YAML mapping"):
        load_sources(path)


def test_load_sources_rejects_non_list_sources(tmp_path: Path) -> None:
    path = tmp_path / "sources.yaml"
    path.write_text("sources: nope\n", encoding="utf-8")

    with pytest.raises(ValueError, match="Expected 'sources' to be a list"):
        load_sources(path)
