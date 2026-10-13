"""UI dialogs."""
from PySide6.QtWidgets import (QComboBox, QDialog, QDialogButtonBox, QFormLayout, QLineEdit)

from models import DEFAULT_KIND, KINDS
from services.i18n import tr, tr_kind


def fill_kinds(combo: QComboBox) -> None:
    """Items show the translated name; the data (currentData) is the canonical kind."""
    combo.clear()
    for k in KINDS:
        combo.addItem(tr_kind(k), k)


def retranslate_kinds(combo: QComboBox) -> None:
    for i in range(combo.count()):
        combo.setItemText(i, tr_kind(combo.itemData(i)))


def set_kind(combo: QComboBox, kind: str) -> None:
    combo.setCurrentIndex(max(combo.findData(kind), 0))


class NewNoteDialog(QDialog):
    def __init__(self, parent, folders, folder="", kind=DEFAULT_KIND):
        super().__init__(parent)
        self.setWindowTitle(tr("dlg.new_note.title"))
        self.title = QLineEdit()
        self.kind = QComboBox()
        fill_kinds(self.kind)
        set_kind(self.kind, kind)
        self.folder = QComboBox()
        self.folder.setEditable(True)  # lets the user type a new folder (e.g. Work/Docs)
        self.folder.addItems([""] + folders)
        self.folder.setCurrentText(folder)
        form = QFormLayout(self)
        form.addRow(tr("field.title"), self.title)
        form.addRow(tr("field.kind"), self.kind)
        form.addRow(tr("field.folder"), self.folder)
        bb = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        bb.accepted.connect(self.accept)
        bb.rejected.connect(self.reject)
        form.addRow(bb)

    def values(self):
        return (self.title.text().strip(), self.kind.currentData(),
                self.folder.currentText().strip().strip("/\\"))
