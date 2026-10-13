"""Ollama client (100% local LLM) at http://localhost:11434"""
import json

import requests
from PySide6.QtCore import QThread, Signal

from services.i18n import tr

HOST = "http://localhost:11434"


def list_models() -> list[str]:
    try:
        r = requests.get(f"{HOST}/api/tags", timeout=2)
        return [m["name"] for m in r.json().get("models", [])]
    except Exception:
        return []


class ChatWorker(QThread):
    token = Signal(str)
    failed = Signal(str)

    def __init__(self, model: str, messages: list[dict]):
        super().__init__()
        self.model, self.messages = model, messages

    def run(self):
        try:
            with requests.post(
                f"{HOST}/api/chat",
                json={"model": self.model, "messages": self.messages, "stream": True},
                stream=True, timeout=300,
            ) as r:
                r.raise_for_status()
                for line in r.iter_lines():
                    if line:
                        self.token.emit(json.loads(line).get("message", {}).get("content", ""))
        except Exception as e:
            self.failed.emit(tr("chat.error", err=e))
