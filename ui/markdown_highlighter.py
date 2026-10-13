"""Live markdown formatting in the editor: large headings, bold, italic, code, links..."""
import re

from PySide6.QtCore import Qt
from PySide6.QtGui import QColor, QFont, QSyntaxHighlighter, QTextCharFormat

HEADING_SIZES = [2.0, 1.6, 1.35, 1.15, 1.05, 1.0]
from services import theme


def _color(key: str) -> QColor:
    return QColor(*theme.palette()[key]) if key == "code_bg" else QColor(theme.palette()[key])

HEADING_RE = re.compile(r"^(#{1,6})(\s+)(.*)$")
QUOTE_RE = re.compile(r"^(\s*>+\s?)(.*)$")
LIST_RE = re.compile(r"^(\s*)([-*+]|\d+[.)])(\s+)(\[[ xX]\]\s+)?")
RULE_RE = re.compile(r"^\s*(---+|\*\*\*+|___+)\s*$")
FENCE_RE = re.compile(r"^\s*```")
# (regex, opening/closing marker length, inner text properties)
INLINE = [
    (re.compile(r"\*\*(?=\S)(.+?)(?<=\S)\*\*|__(?=\S)(.+?)(?<=\S)__"), 2, {"bold": True}),
    (re.compile(r"(?<![*\w])\*(?=[^\s*])(.+?)(?<=[^\s*])\*(?![*\w])|(?<![_\w])_(?=[^\s_])(.+?)(?<=[^\s_])_(?![_\w])"),
     1, {"italic": True}),
    (re.compile(r"~~(?=\S)(.+?)(?<=\S)~~"), 2, {"strike": True}),
    (re.compile(r"`([^`]+)`"), 1, {"code": True}),
]
WIKILINK_RE = re.compile(r"\[\[[^\]]+\]\]")
LINK_RE = re.compile(r"(\[)([^\]]+)(\]\()([^)]+)(\))")

# block states
NORMAL, FRONT, FENCE = 0, 1, 2


class MarkdownHighlighter(QSyntaxHighlighter):
    """Hides the markdown symbols except on the line holding the cursor."""

    def __init__(self, document):
        self.active = -1  # block (line) number holding the cursor
        super().__init__(document)
        theme.signals.changed.connect(self.rehighlight)

    def set_active(self, block_number: int):
        old, self.active = self.active, block_number
        if old == block_number:
            return
        for n in (old, block_number):
            b = self.document().findBlockByNumber(n)
            if b.isValid():
                self.rehighlightBlock(b)

    def _merge(self, start: int, length: int, *, marker=False, bold=False, italic=False, strike=False,
               code=False, color=None, underline=False, scale=None):
        """Applies properties on top of what is already formatted (so bold+italic can nest)."""
        for i in range(start, start + length):
            f = QTextCharFormat(self.format(i))
            if bold:
                f.setFontWeight(QFont.Bold)
            if italic:
                f.setFontItalic(True)
            if strike:
                f.setFontStrikeOut(True)
            if underline:
                f.setFontUnderline(True)
            if code:
                f.setFontFamilies(["Consolas", "monospace"])
                f.setBackground(_color("code_bg"))
            if color is not None:
                f.setForeground(color)
            if scale:
                f.setFontPointSize(self.document().defaultFont().pointSizeF() * scale)
            if marker:
                if self.currentBlock().blockNumber() == self.active:
                    f.setForeground(_color("marker"))
                else:  # hide: invisible and 1pt wide
                    f.setForeground(Qt.transparent)
                    f.setFontPointSize(1)
            self.setFormat(i, 1, f)

    def highlightBlock(self, text: str):
        prev = self.previousBlockState()
        # frontmatter (--- ... --- at the start of the file)
        if (self.currentBlock().blockNumber() == 0 and text.strip() == "---") or prev == FRONT:
            self._merge(0, len(text), marker=True)
            self.setCurrentBlockState(NORMAL if prev == FRONT and text.strip() == "---" else FRONT)
            return
        # code block ```
        if FENCE_RE.match(text):
            self._merge(0, len(text), code=True, marker=True)
            self.setCurrentBlockState(NORMAL if prev == FENCE else FENCE)
            return
        if prev == FENCE:
            self._merge(0, len(text), code=True)
            self.setCurrentBlockState(FENCE)
            return
        self.setCurrentBlockState(NORMAL)

        if RULE_RE.match(text):
            self._merge(0, len(text), marker=True)
            return
        if m := HEADING_RE.match(text):
            level = len(m.group(1))
            self._merge(0, len(text), bold=True, scale=HEADING_SIZES[level - 1])
            self._merge(0, len(m.group(1)) + len(m.group(2)), marker=True)
            body_start = m.start(3)
        elif m := QUOTE_RE.match(text):
            self._merge(0, len(m.group(1)), marker=True)
            self._merge(m.start(2), len(m.group(2)), italic=True, color=_color("quote"))
            body_start = m.start(2)
        elif m := LIST_RE.match(text):
            self._merge(m.start(2), len(m.group(2)), bold=True, color=_color("accent"))
            if m.group(4):
                self._merge(m.start(4), len(m.group(4)), color=_color("accent"))
            body_start = m.end()
        else:
            body_start = 0
        self._inline(text, body_start)

    def _inline(self, text: str, start: int):
        for rx, mark, props in INLINE:
            for m in rx.finditer(text, start):
                if props.get("code"):
                    self._merge(m.start(), m.end() - m.start(), code=True)
                else:
                    self._merge(m.start(), m.end() - m.start(), **props)
                self._merge(m.start(), mark, marker=True)
                self._merge(m.end() - mark, mark, marker=True)
        for m in WIKILINK_RE.finditer(text, start):
            self._merge(m.start(), 2, marker=True)
            self._merge(m.start() + 2, m.end() - m.start() - 4, color=_color("accent"), underline=True)
            self._merge(m.end() - 2, 2, marker=True)
        for m in LINK_RE.finditer(text, start):
            for g in (1, 3, 4, 5):
                self._merge(m.start(g), len(m.group(g)), marker=True)
            self._merge(m.start(2), len(m.group(2)), color=_color("accent"), underline=True)
