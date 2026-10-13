"""Translations (pt/en). Use tr("key"); language changes are announced through `signals.changed`."""
from PySide6.QtCore import QObject, QSettings, Signal

LANGUAGES = {"pt": "Português", "en": "English"}
DEFAULT_LANGUAGE = "en"  # default language and fallback for untranslated keys

STRINGS = {
    "pt": {
        "menu.vault": "Vault",
        "menu.open_folder": "Abrir pasta...",
        "menu.language": "Idioma",
        "menu.theme": "Tema",
        "theme.dark": "Escuro",
        "theme.light": "Claro",
        "dlg.pick_vault": "Escolha a pasta do vault",
        "tab.editor": "Editor (abaixo: backlinks)",
        "tab.preview": "Preview",
        "tab.graph": "Grafo",
        "sidebar.search": "Buscar...",
        "sidebar.by_folder": "Por pastas",
        "sidebar.by_kind": "Por tipo",
        "sidebar.new_note": "+ Nova nota",
        "sidebar.new_folder": "+ Pasta",
        "ctx.move": "Mover para pasta...",
        "ctx.change_kind": "Alterar tipo",
        "ctx.delete": "Excluir",
        "dlg.new_folder.title": "Nova pasta",
        "dlg.new_folder.label": "Nome (use / para subpastas):",
        "dlg.move.title": "Mover",
        "dlg.move.label": "Pasta ('' = raiz):",
        "dlg.delete.title": "Excluir",
        "dlg.delete.text": "Excluir '{name}'?",
        "dlg.new_note.title": "Nova nota",
        "field.title": "Título:",
        "field.kind": "Tipo:",
        "field.folder": "Pasta:",
        "chat.dock": "LLM local (Ollama)",
        "chat.context": "Usar nota atual como contexto",
        "chat.placeholder": "Pergunte algo... (Enter envia)",
        "chat.you": "Você",
        "chat.ai": "IA",
        "chat.offline": "(Ollama offline / sem modelos)",
        "chat.system_note": "Nota do usuário:",
        "chat.error": "Erro falando com o Ollama: {err}. Ele está instalado e rodando?",
        "kind.Note": "Nota",
        "kind.Idea": "Ideia",
        "kind.Project": "Projeto",
        "kind.Task": "Tarefa",
        "kind.Meeting": "Reunião",
        "kind.Journal": "Diário",
        "kind.Reference": "Referência",
    },
    "en": {
        "menu.vault": "Vault",
        "menu.open_folder": "Open folder...",
        "menu.language": "Language",
        "menu.theme": "Theme",
        "theme.dark": "Dark",
        "theme.light": "Light",
        "dlg.pick_vault": "Choose the vault folder",
        "tab.editor": "Editor (below: backlinks)",
        "tab.preview": "Preview",
        "tab.graph": "Graph",
        "sidebar.search": "Search...",
        "sidebar.by_folder": "By folder",
        "sidebar.by_kind": "By type",
        "sidebar.new_note": "+ New note",
        "sidebar.new_folder": "+ Folder",
        "ctx.move": "Move to folder...",
        "ctx.change_kind": "Change type",
        "ctx.delete": "Delete",
        "dlg.new_folder.title": "New folder",
        "dlg.new_folder.label": "Name (use / for subfolders):",
        "dlg.move.title": "Move",
        "dlg.move.label": "Folder ('' = root):",
        "dlg.delete.title": "Delete",
        "dlg.delete.text": "Delete '{name}'?",
        "dlg.new_note.title": "New note",
        "field.title": "Title:",
        "field.kind": "Type:",
        "field.folder": "Folder:",
        "chat.dock": "Local LLM (Ollama)",
        "chat.context": "Use current note as context",
        "chat.placeholder": "Ask something... (Enter to send)",
        "chat.you": "You",
        "chat.ai": "AI",
        "chat.offline": "(Ollama offline / no models)",
        "chat.system_note": "User's note:",
        "chat.error": "Error talking to Ollama: {err}. Is it installed and running?",
        "kind.Note": "Note",
        "kind.Idea": "Idea",
        "kind.Project": "Project",
        "kind.Task": "Task",
        "kind.Meeting": "Meeting",
        "kind.Journal": "Journal",
        "kind.Reference": "Reference",
    },
}


class _Signals(QObject):
    changed = Signal()


signals = _Signals()
_settings = QSettings("noter", "noter")
_lang = str(_settings.value("language", DEFAULT_LANGUAGE))
if _lang not in STRINGS:
    _lang = DEFAULT_LANGUAGE


def language() -> str:
    return _lang


def set_language(code: str) -> None:
    global _lang
    if code in STRINGS and code != _lang:
        _lang = code
        _settings.setValue("language", code)
        signals.changed.emit()


def tr(key: str, **kw) -> str:
    text = STRINGS[_lang].get(key) or STRINGS[DEFAULT_LANGUAGE].get(key, key)
    return text.format(**kw) if kw else text


def tr_kind(kind: str) -> str:
    """Displayed name of a kind (the value stored in the file is always the canonical pt one)."""
    return tr(f"kind.{kind}") if f"kind.{kind}" in STRINGS[_lang] else kind
