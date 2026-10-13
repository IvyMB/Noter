"""Note model: markdown text with optional frontmatter (`type: ...`) and [[Note]] links."""
import re
from dataclasses import dataclass

# Canonical kind names, stored in the file as `type: Idea`; the UI translates them for display
# (see services/i18n.py).
KINDS = ["Note", "Idea", "Project", "Task", "Meeting", "Journal", "Reference"]
DEFAULT_KIND = "Note"

# Portuguese kind names written by older versions -> canonical names
LEGACY_KINDS = {
    "Nota": "Note", "Ideia": "Idea", "Projeto": "Project", "Tarefa": "Task",
    "Reunião": "Meeting", "Diário": "Journal", "Referência": "Reference",
}

LINK_RE = re.compile(r"\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]")  # [[Name]], [[Name|alias]], [[Name#section]]
FRONT_RE = re.compile(r"\A---\n(.*?)\n---\n?", re.S)  # frontmatter block at the very start of the text
# the kind line inside the frontmatter; `tipo` is the legacy (Portuguese) key
KIND_RE = re.compile(r"^(?:type|tipo):[ \t]*(.+?)[ \t]*$", re.M)


@dataclass
class Note:
    name: str
    text: str = ""  # full file content, frontmatter included
    folder: str = ""  # relative to the vault ('' = root)

    @classmethod
    def new(cls, name: str, kind: str = DEFAULT_KIND, folder: str = "") -> "Note":
        """Creates a note with a title heading; the frontmatter is only added for non-default kinds."""
        note = cls(name, f"# {name}\n\n", folder)
        if kind != DEFAULT_KIND:
            note.kind = kind
        return note

    @property
    def kind(self) -> str:
        """Kind read from the frontmatter, or DEFAULT_KIND when there is none."""
        m = FRONT_RE.match(self.text)
        k = KIND_RE.search(m.group(1)) if m else None
        return LEGACY_KINDS.get(k.group(1), k.group(1)) if k else DEFAULT_KIND

    @kind.setter
    def kind(self, kind: str) -> None:
        """Writes the kind into the frontmatter, creating the block when it is missing."""
        m = FRONT_RE.match(self.text)
        if not m:
            self.text = f"---\ntype: {kind}\n---\n{self.text}"
            return
        # drop any existing kind line (current or legacy key) and put the new one first
        rest = KIND_RE.sub("", m.group(1)).strip("\n")
        front = f"type: {kind}\n{rest}" if rest else f"type: {kind}"
        self.text = f"---\n{front}\n---\n{self.text[m.end():]}"

    @property
    def body(self) -> str:
        """Text without the frontmatter."""
        m = FRONT_RE.match(self.text)
        return self.text[m.end():] if m else self.text

    @property
    def links(self) -> set[str]:
        """Names of the notes this one links to (each name once, whitespace trimmed)."""
        return {m.strip() for m in LINK_RE.findall(self.text)}
