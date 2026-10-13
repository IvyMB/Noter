import re
from pathlib import Path

from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QAction, QActionGroup
from PySide6.QtWidgets import (QDockWidget, QFileDialog, QMainWindow, QSplitter, QTabWidget,
                               QTextBrowser)

from models import Note
from services.vault import Vault
from ui.chat_panel import ChatPanel
from ui.editor_panel import EditorPanel
from ui.graph_view import GraphView
from services import theme
from services.i18n import LANGUAGES, language, set_language, signals, tr
from ui.sidebar import Sidebar


class MainWindow(QMainWindow):
    def __init__(self, vault_dir: Path):
        super().__init__()
        self.setWindowTitle("MeuNotion")
        self.resize(1300, 800)
        self.vault = Vault(vault_dir)
        self.note: Note | None = None
        self.save_timer = QTimer(self)
        self.save_timer.setSingleShot(True)
        self.save_timer.timeout.connect(self.save)

        # left: note tree
        self.sidebar = Sidebar(self.vault)
        self.sidebar.open_note.connect(self.open_note)
        self.sidebar.request_save.connect(self.save)
        self.sidebar.note_modified.connect(self.on_note_modified)
        self.sidebar.note_deleted.connect(self.on_note_deleted)

        # center: editor / preview / graph
        self.editor = EditorPanel()
        self.editor.edited.connect(lambda: self.save_timer.start(600))
        self.editor.kind_chosen.connect(self.change_kind)
        self.editor.backlink_clicked.connect(self.open_note)
        self.preview = QTextBrowser()
        self.graph = GraphView()
        self.graph.open_note.connect(self.open_from_graph)

        self.tabs = QTabWidget()
        self.tabs.addTab(self.editor, "")
        self.tabs.addTab(self.preview, "")
        self.tabs.addTab(self.graph, "")
        self.tabs.currentChanged.connect(self.on_tab)

        split = QSplitter()
        split.addWidget(self.sidebar)
        split.addWidget(self.tabs)
        split.setSizes([250, 1000])
        self.setCentralWidget(split)

        # right: local LLM chat
        self.dock = dock = QDockWidget()
        dock.setWidget(ChatPanel(self.editor.text))
        self.addDockWidget(Qt.RightDockWidgetArea, dock)

        self.vault_menu = self.menuBar().addMenu("")
        self.open_action = QAction(self, triggered=self.pick_vault)
        self.vault_menu.addAction(self.open_action)
        self.lang_menu = self.menuBar().addMenu("")
        group = QActionGroup(self)
        for code, label in LANGUAGES.items():
            act = QAction(label, self, checkable=True, checked=code == language())
            act.triggered.connect(lambda _c=False, c=code: set_language(c))
            group.addAction(act)
            self.lang_menu.addAction(act)
        self.theme_menu = self.menuBar().addMenu("")
        self.theme_actions = {}
        tgroup = QActionGroup(self)
        for name in theme.THEMES:
            act = QAction(self, checkable=True, checked=name == theme.current())
            act.triggered.connect(lambda _c=False, n=name: theme.set_theme(n))
            tgroup.addAction(act)
            self.theme_menu.addAction(act)
            self.theme_actions[name] = act
        signals.changed.connect(self.retranslate)
        theme.signals.changed.connect(self.restyle)
        self.retranslate()
        self.restyle()
        self.sidebar.refresh()

    def retranslate(self):
        self.vault_menu.setTitle(tr("menu.vault"))
        self.open_action.setText(tr("menu.open_folder"))
        self.lang_menu.setTitle(tr("menu.language"))
        self.theme_menu.setTitle(tr("menu.theme"))
        for name, act in self.theme_actions.items():
            act.setText(tr(f"theme.{name}"))
        self.dock.setWindowTitle(tr("chat.dock"))
        for i, key in enumerate(("tab.editor", "tab.preview", "tab.graph")):
            self.tabs.setTabText(i, tr(key))

    def restyle(self):
        """Markdown preview colors follow the theme (everything else comes from the QSS)."""
        p = theme.palette()
        self.preview.document().setDefaultStyleSheet(
            f"a {{ color: {p['accent']}; }} code, pre {{ background: {p['surface2']}; }}"
            f" h1, h2, h3 {{ color: {p['accent']}; }} blockquote {{ color: {p['quote']}; }}")
        if self.tabs.currentIndex() == 1:
            self.on_tab(1)

    def on_tab(self, i):
        if i == 1:
            self.save()
            body = Note("", self.editor.text()).body
            self.preview.setMarkdown(re.sub(r"\[\[([^\]|#]+)[^\]]*\]\]", r"**\1**", body))
        elif i == 2:
            self.save()
            self.graph.load(self.vault.graph())

    def open_from_graph(self, name):
        self.open_note(name)
        self.tabs.setCurrentIndex(0)

    def open_note(self, name: str):
        if not name:
            return
        self.save()
        note = self.vault.get(name)
        if note is None:  # link to a note that does not exist yet
            note = Note.new(name)
            self.vault.save(note)
            self.sidebar.refresh()
        self.note = note
        self.editor.show_note(note, self.vault.backlinks(name))
        self.sidebar.select(name)
        self.setWindowTitle(f"MeuNotion — {name}")

    def change_kind(self, kind: str):
        if not self.note:
            return
        self.save()
        self.note.kind = kind
        self.vault.save(self.note)
        self.editor.set_text(self.note.text)
        self.sidebar.refresh()

    def on_note_modified(self, name: str):
        if self.note and name == self.note.name:
            self.open_note(name)

    def on_note_deleted(self, name: str):
        if self.note and name == self.note.name:
            self.note = None
            self.editor.clear()

    def save(self):
        if self.note:
            self.note.text = self.editor.text()
            self.vault.save(self.note)

    def pick_vault(self):
        d = QFileDialog.getExistingDirectory(self, tr("dlg.pick_vault"))
        if d:
            self.save()
            self.vault, self.note = Vault(Path(d)), None
            self.sidebar.vault, self.sidebar.current = self.vault, None
            self.editor.clear()
            self.sidebar.refresh()

    def closeEvent(self, e):
        self.save()
        super().closeEvent(e)
