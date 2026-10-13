"""Chat panel for the local LLM (Ollama)."""
from PySide6.QtGui import QTextCursor
from PySide6.QtWidgets import (QCheckBox, QComboBox, QHBoxLayout, QLineEdit, QPushButton,
                               QTextBrowser, QVBoxLayout, QWidget)

from services import llm
from services.i18n import signals, tr


class ChatPanel(QWidget):
    def __init__(self, get_note_text):
        super().__init__()
        self.get_note_text = get_note_text
        self.history: list[dict] = []
        self.worker = None
        self.reply = ""

        self.model = QComboBox()
        refresh = QPushButton("↻")
        refresh.setFixedWidth(38)
        refresh.clicked.connect(self.refresh_models)
        top = QHBoxLayout()
        top.addWidget(self.model, 1)
        top.addWidget(refresh)

        self.ctx = QCheckBox()
        self.ctx.setChecked(True)
        self.log = QTextBrowser()
        self.input = QLineEdit()
        self.input.returnPressed.connect(self.send)

        lay = QVBoxLayout(self)
        lay.addLayout(top)
        lay.addWidget(self.ctx)
        lay.addWidget(self.log)
        lay.addWidget(self.input)
        self.offline = False
        self.refresh_models()
        signals.changed.connect(self.retranslate)
        self.retranslate()

    def retranslate(self):
        self.ctx.setText(tr("chat.context"))
        self.input.setPlaceholderText(tr("chat.placeholder"))
        if self.offline:
            self.model.setItemText(0, tr("chat.offline"))

    def refresh_models(self):
        self.model.clear()
        models = llm.list_models()
        self.offline = not models
        self.model.addItems(models or [tr("chat.offline")])

    def send(self):
        text = self.input.text().strip()
        if not text or (self.worker and self.worker.isRunning()):
            return
        self.input.clear()
        self.history.append({"role": "user", "content": text})
        msgs = list(self.history)
        note = self.get_note_text()
        if self.ctx.isChecked() and note:
            msgs.insert(0, {"role": "system", "content": f"{tr('chat.system_note')}\n---\n{note}\n---"})
        self.log.append(f"<b>{tr('chat.you')}:</b> {text}")
        self.log.append(f"<b>{tr('chat.ai')}:</b> ")
        self.reply = ""
        self.worker = llm.ChatWorker(self.model.currentText(), msgs)
        self.worker.token.connect(self.on_token)
        self.worker.failed.connect(lambda m: self.log.append(f"<i>{m}</i>"))
        self.worker.finished.connect(
            lambda: self.history.append({"role": "assistant", "content": self.reply}))
        self.worker.start()

    def on_token(self, t):
        self.reply += t
        self.log.moveCursor(QTextCursor.End)
        self.log.insertPlainText(t)
