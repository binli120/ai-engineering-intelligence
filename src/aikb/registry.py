from pathlib import Path
from typing import Any

import yaml

from .models import Source


def load_sources(path: Path) -> list[Source]:
    payload: Any = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected YAML mapping in {path}")

    sources = payload.get("sources", [])
    if not isinstance(sources, list):
        raise ValueError(f"Expected 'sources' to be a list in {path}")

    return [Source.model_validate(item) for item in sources]
