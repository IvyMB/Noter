"""Repository: notes are .md files in a folder (subfolders allowed)."""
from pathlib import Path

from models import Graph, Note


class Vault:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _paths(self) -> dict[str, Path]:
        """name (without .md) -> file, scanning subfolders (hidden folders are skipped)."""
        idx = {}
        for p in sorted(self.root.rglob("*.md")):
            rel = p.relative_to(self.root)
            if not any(part.startswith(".") for part in rel.parts):
                idx.setdefault(p.stem, p)
        return idx

    def _load(self, path: Path) -> Note:
        parent = path.parent.relative_to(self.root).as_posix()
        return Note(path.stem, path.read_text(encoding="utf-8"), "" if parent == "." else parent)

    # -- notas --------------------------------------------------------------
    def names(self) -> list[str]:
        return sorted(self._paths())

    def exists(self, name: str) -> bool:
        return name in self._paths()

    def get(self, name: str) -> Note | None:
        p = self._paths().get(name)
        return self._load(p) if p else None

    def all(self) -> list[Note]:
        return [self._load(p) for _, p in sorted(self._paths().items())]

    def save(self, note: Note) -> None:
        p = self._paths().get(note.name) or self.root / note.folder / f"{note.name}.md"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(note.text, encoding="utf-8")

    def delete(self, name: str) -> None:
        p = self._paths().get(name)
        if p:
            p.unlink()

    def move(self, name: str, folder: str) -> None:
        src = self._paths().get(name)
        if src:
            dst = self.root / folder / src.name
            if dst != src:
                dst.parent.mkdir(parents=True, exist_ok=True)
                src.rename(dst)

    # -- pastas -------------------------------------------------------------
    def folders(self) -> list[str]:
        rels = (p.relative_to(self.root) for p in self.root.rglob("*") if p.is_dir())
        return sorted(r.as_posix() for r in rels if not any(x.startswith(".") for x in r.parts))

    def create_folder(self, folder: str) -> None:
        (self.root / folder).mkdir(parents=True, exist_ok=True)

    # -- consultas ----------------------------------------------------------
    def search(self, query: str) -> list[Note]:
        q = query.lower()
        return [n for n in self.all() if q in n.name.lower() or q in n.text.lower()]

    def backlinks(self, name: str) -> list[str]:
        return [n.name for n in self.all() if name in n.links]

    def graph(self) -> Graph:
        """Links to nonexistent notes also become nodes."""
        notes = self.all()
        nodes, edges = {n.name for n in notes}, set()
        for n in notes:
            for t in n.links:
                nodes.add(t)
                edges.add((n.name, t))
        return Graph(sorted(nodes), sorted(edges), {n.name: n.kind for n in notes})
