from aikb.cli import check_commands, lint_commands


def test_lint_commands_check_mode() -> None:
    assert lint_commands(fix=False) == [
        ("ruff check", ["ruff", "check", "."]),
        ("ruff format", ["ruff", "format", "--check", "."]),
    ]


def test_lint_commands_fix_mode() -> None:
    assert lint_commands(fix=True) == [
        ("ruff check", ["ruff", "check", ".", "--fix"]),
        ("ruff format", ["ruff", "format", "."]),
    ]


def test_check_commands_include_quality_gate() -> None:
    labels = [label for label, _command in check_commands()]
    assert labels == [
        "ruff check",
        "ruff format",
        "mypy",
        "pytest",
        "source registry",
        "docs build",
    ]
