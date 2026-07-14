import json
from pathlib import Path

import typer
from rich import print

from .digest import build_digest
from .models import KnowledgeItem
from .registry import load_sources

app = typer.Typer(no_args_is_help=True)


@app.command()
def validate(registry: Path = Path("data/sources.yaml")) -> None:
    sources = load_sources(registry)
    ids = [s.id for s in sources]
    duplicates = sorted({source_id for source_id in ids if ids.count(source_id) > 1})
    if duplicates:
        raise typer.BadParameter(f"Duplicate source IDs: {duplicates}")
    print(f"[green]Validated {len(sources)} sources.[/green]")


@app.command()
def digest(
    items_dir: Path = Path("data/items"),
    registry: Path = Path("data/sources.yaml"),
    output: Path = Path("docs/weekly/latest.md"),
) -> None:
    sources = load_sources(registry)
    items = (
        [
            KnowledgeItem.model_validate(json.loads(path.read_text(encoding="utf-8")))
            for path in sorted(items_dir.glob("*.json"))
        ]
        if items_dir.exists()
        else []
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(build_digest(items, sources), encoding="utf-8")
    print(f"[green]Wrote {output}[/green]")


if __name__ == "__main__":
    app()
