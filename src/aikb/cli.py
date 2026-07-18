import subprocess
from collections.abc import Sequence
from pathlib import Path

import typer
from rich import print

from .digest import build_digest
from .refresh import load_items, prune_stale_items, refresh_sources
from .registry import load_sources
from .source_preview import write_source_previews

app = typer.Typer(no_args_is_help=True)

Command = tuple[str, list[str]]


def lint_commands(*, fix: bool) -> list[Command]:
    return [
        ("ruff check", ["ruff", "check", ".", "--fix"] if fix else ["ruff", "check", "."]),
        ("ruff format", ["ruff", "format", "."] if fix else ["ruff", "format", "--check", "."]),
    ]


def check_commands() -> list[Command]:
    return [
        *lint_commands(fix=False),
        ("mypy", ["mypy"]),
        ("pytest", ["pytest"]),
        ("source registry", ["aikb", "validate"]),
        ("docs build", ["mkdocs", "build", "--strict"]),
    ]


def run_commands(commands: Sequence[Command]) -> None:
    for label, command in commands:
        print(f"[bold cyan]Running {label}[/bold cyan] [dim]{' '.join(command)}[/dim]")
        result = subprocess.run(command, check=False)
        if result.returncode != 0:
            print(f"[red]Failed {label} with exit code {result.returncode}.[/red]")
            raise typer.Exit(result.returncode)
    print("[green]All checks passed.[/green]")


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
    items = load_items(items_dir)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(build_digest(items, sources), encoding="utf-8")
    print(f"[green]Wrote {output}[/green]")


@app.command()
def refresh(
    items_dir: Path = Path("data/items"),
    registry: Path = Path("data/sources.yaml"),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        help="Report refresh and prune work without writing files.",
    ),
    skip_prune: bool = typer.Option(
        False,
        "--skip-prune",
        help="Fetch new content without deleting stale items.",
    ),
) -> None:
    """Fetch due sources and prune stale knowledge items."""
    sources = load_sources(registry)
    stats = refresh_sources(sources, items_dir=items_dir, dry_run=dry_run, prune=not skip_prune)
    print(
        "[green]Refresh complete.[/green] "
        f"due={stats.due} fetched={stats.fetched} written={stats.written} "
        f"skipped={stats.skipped} pruned={stats.pruned} failed={stats.failed}"
    )


@app.command()
def prune(
    items_dir: Path = Path("data/items"),
    registry: Path = Path("data/sources.yaml"),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        help="Report stale items without deleting files.",
    ),
) -> None:
    """Delete items that are stale, disabled, or no longer backed by a source."""
    sources = load_sources(registry)
    stats = prune_stale_items(sources, items_dir=items_dir, dry_run=dry_run)
    print(f"[green]Prune complete.[/green] pruned={stats.pruned}")


@app.command("source-previews")
def source_previews(
    docs_dir: Path = Path("docs"),
    output: Path = Path("docs/assets/source-previews.json"),
    limit: int = typer.Option(80, "--limit", help="Maximum source links to fetch."),
) -> None:
    """Fetch source pages server-side and cache readable previews for the app."""
    count = write_source_previews(docs_dir, output, limit=limit)
    print(f"[green]Wrote {count} source previews to {output}.[/green]")


@app.command()
def lint(
    fix: bool = typer.Option(
        False,
        "--fix",
        help="Apply Ruff fixes and formatting instead of checking only.",
    ),
) -> None:
    """Run formatting and lint checks."""
    run_commands(lint_commands(fix=fix))


@app.command()
def check() -> None:
    """Run the local quality gate used before publishing changes."""
    run_commands(check_commands())


if __name__ == "__main__":
    app()
