"""Sidebar: note tree grouped by folder or kind, search and actions."""
from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (QComboBox, QDialog, QHBoxLayout, QInputDialog, QLineEdit, QMenu,
                               QMessageBox, QPushButton, QTreeWidget, QTreeWidgetItem,
                               QVBoxLayout, QWidget)

from models import KINDS, Note
from services.vault import Vault
from services.i18n import signals, tr, tr_kind
from ui.dialogs import NewNoteDialog

NOTE = Qt.UserRole        # note name (leaves only)
GROUP = Qt.UserRole + 1   # folder/kind path (groups only)


class Sidebar(QWidget):
    open_note = Signal(str)       # user picked/created a note
    request_save = Signal()       # asks the editor to save before touching files
    note_modified = Signal(str)   # note kind changed on disk
    note_deleted = Signal(str)

    def __init__(self, vault: Vault):
        super().__init__()
        self.vault = vault
        self.current: str | None = None

        self.tree = QTreeWidget()
        self.tree.setHeaderHidden(True)
        self.tree.currentItemChanged.connect(self._on_select)
        self.tree.setContextMenuPolicy(Qt.CustomContextMenu)
        self.tree.customContextMenuRequested.connect(self._menu)
        self.search = QLineEdit()
        self.search.textChanged.connect(self.refresh)
        self.group = QComboBox()
        self.group.addItems(["", ""])
        self.group.currentIndexChanged.connect(self.refresh)
        new_btn = self.new_btn = QPushButton()
        new_btn.clicked.connect(self.new_note)
        folder_btn = self.folder_btn = QPushButton()
        folder_btn.clicked.connect(self.new_folder)

        btns = QHBoxLayout()
        btns.addWidget(new_btn, 1)
        btns.addWidget(folder_btn)
        lay = QVBoxLayout(self)
        lay.addLayout(btns)
        for w in (self.search, self.group, self.tree):
            lay.addWidget(w)
        signals.changed.connect(self.retranslate)
        self.retranslate(refresh=False)

    def retranslate(self, refresh=True):
        self.search.setPlaceholderText(tr("sidebar.search"))
        self.group.setItemText(0, tr("sidebar.by_folder"))
        self.group.setItemText(1, tr("sidebar.by_kind"))
        self.new_btn.setText(tr("sidebar.new_note"))
        self.folder_btn.setText(tr("sidebar.new_folder"))
        if refresh:
            self.refresh()

    # -- tree -----------------------------------------------------------
    def refresh(self):
        q = self.search.text()
        notes = self.vault.search(q) if q else self.vault.all()
        by_kind = self.group.currentIndex() == 1
        groups: dict[str, QTreeWidgetItem] = {}
        root = self.tree.invisibleRootItem()

        def group_item(path: str) -> QTreeWidgetItem:
            """Folder/kind item (creates parents on demand)."""
            if path not in groups:
                parent, _, leaf = path.rpartition("/")
                item = QTreeWidgetItem([tr_kind(path) if by_kind else (leaf or path)])
                item.setData(0, GROUP, path)
                item.setFlags(item.flags() & ~Qt.ItemIsSelectable)
                (group_item(parent) if parent else root).addChild(item)
                groups[path] = item
            return groups[path]

        self.tree.blockSignals(True)
        self.tree.clear()
        if not by_kind and not q:
            for f in self.vault.folders():  # also show empty folders
                group_item(f)
        for n in notes:
            key = n.kind if by_kind else n.folder
            leaf = QTreeWidgetItem([n.name])
            leaf.setData(0, NOTE, n.name)
            (group_item(key) if key else root).addChild(leaf)
        self.tree.expandAll()
        self.tree.blockSignals(False)
        self.select(self.current)

    def select(self, name: str | None):
        self.current = name
        if not name:
            return
        stack = [self.tree.invisibleRootItem()]
        while stack:
            node = stack.pop()
            for i in range(node.childCount()):
                c = node.child(i)
                if c.data(0, NOTE) == name:
                    self.tree.blockSignals(True)
                    self.tree.setCurrentItem(c)
                    self.tree.blockSignals(False)
                    return
                stack.append(c)

    def _on_select(self, item, _prev=None):
        name = item.data(0, NOTE) if item else None
        if name:
            self.open_note.emit(name)

    def selected_folder(self) -> str:
        """Folder of the selected item (note or folder), used to prefill new notes/folders."""
        it = self.tree.currentItem()
        if not it or self.group.currentIndex() == 1:
            return ""
        name = it.data(0, NOTE)
        note = self.vault.get(name) if name else None
        return note.folder if note else (it.data(0, GROUP) or "")

    # -- actions ------------------------------------------------------------
    def new_note(self):
        d = NewNoteDialog(self, self.vault.folders(), self.selected_folder())
        if d.exec() != QDialog.Accepted:
            return
        title, kind, folder = d.values()
        if not title:
            return
        title = title.replace("/", "-").replace("\\", "-")
        self.request_save.emit()
        if not self.vault.exists(title):
            self.vault.save(Note.new(title, kind, folder))
        self.refresh()
        self.open_note.emit(title)

    def new_folder(self):
        base = self.selected_folder()
        name, ok = QInputDialog.getText(self, tr("dlg.new_folder.title"), tr("dlg.new_folder.label"),
                                        text=base + "/" if base else "")
        if ok and name.strip("/ "):
            self.vault.create_folder(name.strip("/ "))
            self.group.setCurrentIndex(0)
            self.refresh()

    def _menu(self, pos):
        it = self.tree.itemAt(pos)
        name = it.data(0, NOTE) if it else None
        if not name:
            return
        menu = QMenu(self)
        move = menu.addAction(tr("ctx.move"))
        kind_menu = menu.addMenu(tr("ctx.change_kind"))
        kind_actions = {kind_menu.addAction(tr_kind(k)): k for k in KINDS}
        delete = menu.addAction(tr("ctx.delete"))
        act = menu.exec(self.tree.viewport().mapToGlobal(pos))
        if act is move:
            self._move(name)
        elif act in kind_actions:
            self.request_save.emit()
            note = self.vault.get(name)
            note.kind = kind_actions[act]
            self.vault.save(note)
            self.note_modified.emit(name)
            self.refresh()
        elif act is delete:
            if QMessageBox.question(self, tr("dlg.delete.title"), tr("dlg.delete.text", name=name)) == QMessageBox.Yes:
                self.vault.delete(name)
                self.note_deleted.emit(name)
                self.refresh()

    def _move(self, name: str):
        folders = [""] + self.vault.folders()
        cur = self.vault.get(name).folder
        f, ok = QInputDialog.getItem(self, tr("dlg.move.title"), tr("dlg.move.label"), folders,
                                     folders.index(cur) if cur in folders else 0, True)
        if ok:
            self.request_save.emit()
            self.vault.move(name, f.strip().strip("/"))
            self.refresh()
