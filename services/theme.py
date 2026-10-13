"""Light/dark themes: palettes + stylesheet (QSS). Changes are announced through `signals.changed`."""
from PySide6.QtCore import QObject, QSettings, Signal
from PySide6.QtWidgets import QApplication

THEMES = ("dark", "light")
DEFAULT_THEME = "dark"

PALETTES = {
    "dark": {
        "bg": "#1a1b26", "surface": "#1f2335", "surface2": "#292e42", "border": "#3b4261",
        "text": "#c0caf5", "muted": "#7982a9", "accent": "#7aa2f7", "accent_text": "#1a1b26",
        "hover": "#2a2f45", "selection": "#33467c", "marker": "#565f89", "quote": "#9aa5ce",
        "code_bg": (255, 255, 255, 28),
        "graph_bg": "#16161e", "graph_edge": "#414868", "graph_missing": "#565f89",
        "kinds": {"Note": "#7aa2f7", "Idea": "#e0af68", "Project": "#9ece6a", "Task": "#f7768e",
                  "Meeting": "#bb9af7", "Journal": "#7dcfff", "Reference": "#ff9e64"},
    },
    "light": {
        "bg": "#f4f5fa", "surface": "#ffffff", "surface2": "#eaedf5", "border": "#d3d8e6",
        "text": "#1f2430", "muted": "#6b7280", "accent": "#3b6fd8", "accent_text": "#ffffff",
        "hover": "#e6ebf7", "selection": "#cddcfa", "marker": "#a3a9bb", "quote": "#5b6478",
        "code_bg": (0, 0, 0, 20),
        "graph_bg": "#fbfcfe", "graph_edge": "#c3c9da", "graph_missing": "#aab0c0",
        "kinds": {"Note": "#3b6fd8", "Idea": "#c78a0e", "Project": "#3f9a3a", "Task": "#d6455d",
                  "Meeting": "#8a5fd0", "Journal": "#1a9bb8", "Reference": "#e0732a"},
    },
}

QSS = """
* {{ outline: 0; }}
QWidget {{ background: {bg}; color: {text}; }}
QMainWindow, QDialog {{ background: {bg}; }}
QToolTip {{ background: {surface2}; color: {text}; border: 1px solid {border}; padding: 4px; }}

QSplitter::handle {{ background: {bg}; }}
QSplitter::handle:horizontal {{ width: 6px; }}
QSplitter::handle:vertical {{ height: 6px; }}

QLineEdit, QComboBox, QPlainTextEdit, QTextBrowser, QTreeWidget, QListWidget {{
    background: {surface}; border: 1px solid {border}; border-radius: 8px;
    selection-background-color: {selection}; selection-color: {text};
}}
QLineEdit {{ padding: 6px 10px; }}
QLineEdit:focus, QComboBox:focus, QPlainTextEdit:focus {{ border-color: {accent}; }}
QPlainTextEdit, QTextBrowser {{ padding: 14px 18px; }}

QComboBox {{ padding: 5px 10px; }}
QComboBox::drop-down {{ border: none; width: 22px; }}
QComboBox QAbstractItemView {{
    background: {surface}; border: 1px solid {border}; selection-background-color: {selection};
    selection-color: {text}; padding: 4px; outline: 0;
}}

QPushButton {{
    background: {surface2}; border: 1px solid {border}; border-radius: 8px; padding: 6px 10px;
}}
QPushButton:hover {{ background: {hover}; border-color: {accent}; }}
QPushButton:pressed {{ background: {accent}; color: {accent_text}; }}

QCheckBox {{ spacing: 8px; background: transparent; }}
QLabel {{ background: transparent; }}

QTreeWidget, QListWidget {{ padding: 4px; show-decoration-selected: 0; }}
QTreeWidget::item, QListWidget::item {{ padding: 5px 6px; border-radius: 6px; }}
QTreeWidget::item:hover, QListWidget::item:hover {{ background: {hover}; }}
QTreeWidget::item:selected, QListWidget::item:selected {{ background: {selection}; color: {text}; }}

QTabWidget::pane {{ border: 1px solid {border}; border-radius: 8px; top: -1px; background: {surface}; }}
QTabBar {{ background: transparent; }}
QTabBar::tab {{
    background: transparent; color: {muted}; padding: 8px 16px; margin-right: 2px;
    border-top-left-radius: 8px; border-top-right-radius: 8px;
}}
QTabBar::tab:hover {{ color: {text}; background: {hover}; }}
QTabBar::tab:selected {{ color: {accent}; background: {surface}; border: 1px solid {border}; border-bottom: none; }}

QMenuBar {{ background: {bg}; padding: 2px 4px; }}
QMenuBar::item {{ background: transparent; padding: 5px 10px; border-radius: 6px; }}
QMenuBar::item:selected {{ background: {hover}; }}
QMenu {{ background: {surface}; border: 1px solid {border}; border-radius: 8px; padding: 6px; }}
QMenu::item {{ padding: 6px 22px; border-radius: 6px; }}
QMenu::item:selected {{ background: {selection}; }}
QMenu::separator {{ height: 1px; background: {border}; margin: 4px 8px; }}

QDockWidget {{ titlebar-close-icon: none; }}
QDockWidget::title {{ background: {bg}; color: {muted}; padding: 8px 10px; text-align: left; }}

QScrollBar:vertical {{ background: transparent; width: 10px; margin: 2px; }}
QScrollBar:horizontal {{ background: transparent; height: 10px; margin: 2px; }}
QScrollBar::handle {{ background: {border}; border-radius: 4px; min-height: 28px; min-width: 28px; }}
QScrollBar::handle:hover {{ background: {muted}; }}
QScrollBar::add-line, QScrollBar::sub-line {{ width: 0; height: 0; }}
QScrollBar::add-page, QScrollBar::sub-page {{ background: transparent; }}

QGraphicsView {{ border: 1px solid {border}; border-radius: 8px; }}
QDialogButtonBox QPushButton {{ min-width: 70px; }}
"""


class _Signals(QObject):
    changed = Signal()


signals = _Signals()
_settings = QSettings("noter", "noter")
_theme = str(_settings.value("theme", DEFAULT_THEME))
if _theme not in PALETTES:
    _theme = DEFAULT_THEME


def current() -> str:
    return _theme


def palette() -> dict:
    return PALETTES[_theme]


def stylesheet() -> str:
    return QSS.format(**palette())


def apply() -> None:
    QApplication.instance().setStyleSheet(stylesheet())


def set_theme(name: str) -> None:
    global _theme
    if name in PALETTES and name != _theme:
        _theme = name
        _settings.setValue("theme", name)
        apply()
        signals.changed.emit()
