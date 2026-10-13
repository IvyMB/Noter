"""Entry point: python app.py [vault-folder]"""
import sys
from pathlib import Path

from PySide6.QtGui import QFont
from PySide6.QtWidgets import QApplication

from services import theme

from ui.main_window import MainWindow

DEFAULT_VAULT = Path(__file__).parent / "vault"

if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setStyle("Fusion")  # neutral base; the look comes from the theme (QSS)
    app.setFont(QFont("Segoe UI", 10))
    theme.apply()
    w = MainWindow(Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_VAULT)
    w.show()
    sys.exit(app.exec())
