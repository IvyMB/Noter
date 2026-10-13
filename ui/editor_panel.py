"""Editor tab: kind selector, note text and backlinks."""
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (QComboBox, QHBoxLayout, QLabel, QListWidget, QPlainTextEdit,
                               QSplitter, QVBoxLayout, QWidget)

from models import Note
from services.i18n import signals, tr
from ui.dialogs import fill_kinds, retranslate_kinds, set_kind
from ui.markdown_highlighter import MarkdownHighlighter


class EditorPanel(QSplitter):
    edited = Signal()
    kind_chosen = Signal(str)
    backlink_clicked = Signal(str)

    def __init__(self):
        super().__init__(Qt.Vertical)
        self.editor = QPlainTextEdit()
        self.editor.setFont(QFont("Segoe UI", 12))  # proportional font: reads like formatted text
        self.highlighter = MarkdownHighlighter(self.editor.document())
        self.editor.textChanged.connect(self.edited)
        self.editor.cursorPositionChanged.connect(
            lambda: self.highlighter.set_active(self.editor.textCursor().blockNumber()))

        self.kind_box = QComboBox()
        fill_kinds(self.kind_box)
        self.kind_box.activated.connect(lambda _i: self.kind_chosen.emit(self.kind_box.currentData()))
        head = QHBoxLayout()
        self.kind_label = QLabel()
        head.addWidget(self.kind_label)
        head.addWidget(self.kind_box)
        head.addStretch(1)
        top = QWidget()
        lay = QVBoxLayout(top)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.addLayout(head)
        lay.addWidget(self.editor)

        self.backlinks = QListWidget()
        self.backlinks.setMaximumHeight(110)
        self.backlinks.itemClicked.connect(lambda i: self.backlink_clicked.emit(i.text()))
        self.addWidget(top)
        self.addWidget(self.backlinks)
        signals.changed.connect(self.retranslate)
        self.retranslate()

    def retranslate(self):
        self.kind_label.setText(tr("field.kind"))
        retranslate_kinds(self.kind_box)

    def text(self) -> str:
        return self.editor.toPlainText()

    def set_text(self, text: str):
        """Replaces the content without emitting `edited` (not a user edit)."""
        self.editor.blockSignals(True)
        self.editor.setPlainText(text)
        self.editor.blockSignals(False)

    def show_note(self, note: Note, backlinks: list[str]):
        self.set_text(note.text)
        set_kind(self.kind_box, note.kind)
        self.backlinks.clear()
        self.backlinks.addItems(backlinks)

    def clear(self):
        self.set_text("")
        self.backlinks.clear()
