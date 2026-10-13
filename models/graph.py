"""Note graph model."""
from dataclasses import dataclass


@dataclass
class Graph:
    nodes: list[str]
    edges: list[tuple[str, str]]
    kinds: dict[str, str]  # existing notes only; nodes missing here are links to nonexistent notes
