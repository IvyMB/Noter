"""Graph view with a simple force-directed layout (no extra dependencies)."""
import math
import random

from PySide6.QtCore import QPointF, QTimer, Signal
from PySide6.QtGui import QBrush, QColor, QPainter, QPen
from PySide6.QtWidgets import (QGraphicsEllipseItem, QGraphicsItem, QGraphicsLineItem,
                               QGraphicsScene, QGraphicsSimpleTextItem, QGraphicsView)

from models import Graph
from services import theme


class Node(QGraphicsEllipseItem):
    R = 9

    def __init__(self, name, exists, on_open, kind="Note"):
        super().__init__(-self.R, -self.R, 2 * self.R, 2 * self.R)
        self.name, self.on_open = name, on_open
        self.vel = QPointF(0, 0)
        self.pinned = False
        self.exists, self.kind = exists, kind
        self.setFlag(QGraphicsItem.ItemIsMovable)
        self.setZValue(2)
        self.label = QGraphicsSimpleTextItem(name, self)
        self.label.setPos(self.R + 3, -8)
        self.recolor()

    def recolor(self):
        p = theme.palette()
        color = p["kinds"].get(self.kind, p["accent"]) if self.exists else p["graph_missing"]
        self.setBrush(QBrush(QColor(color)))
        self.setPen(QPen(QColor(p["graph_bg"]), 1.5))
        self.label.setBrush(QBrush(QColor(p["text"])))

    def mousePressEvent(self, e):
        self.pinned = True
        super().mousePressEvent(e)

    def mouseReleaseEvent(self, e):
        self.pinned = False
        super().mouseReleaseEvent(e)

    def mouseDoubleClickEvent(self, e):
        self.on_open(self.name)


class GraphView(QGraphicsView):
    open_note = Signal(str)

    def __init__(self):
        self._scene = QGraphicsScene()
        super().__init__(self._scene)
        self.setRenderHint(QPainter.Antialiasing)
        self.setDragMode(QGraphicsView.ScrollHandDrag)
        self.nodes: dict[str, Node] = {}
        self.edges = []
        self.timer = QTimer(self)
        self.timer.setInterval(16)
        self.timer.timeout.connect(self.step)
        theme.signals.changed.connect(self.recolor)
        self.recolor()

    def recolor(self):
        p = theme.palette()
        self.setBackgroundBrush(QBrush(QColor(p["graph_bg"])))
        for node in self.nodes.values():
            node.recolor()
        for _a, _b, line in self.edges:
            line.setPen(QPen(QColor(p["graph_edge"]), 1.2))

    def load(self, graph: Graph):
        self.scene().clear()
        self.nodes, self.edges = {}, []
        for n in graph.nodes:
            node = Node(n, n in graph.kinds, self.open_note.emit, graph.kinds.get(n, "Note"))
            node.setPos(random.uniform(-200, 200), random.uniform(-200, 200))
            self.scene().addItem(node)
            self.nodes[n] = node
        for a, b in graph.edges:
            line = QGraphicsLineItem()
            line.setPen(QPen(QColor(theme.palette()["graph_edge"]), 1.2))
            self.scene().addItem(line)
            self.edges.append((self.nodes[a], self.nodes[b], line))
        self.timer.start()

    def step(self):
        ns = list(self.nodes.values())
        for a in ns:
            for b in ns:  # repulsion
                if a is b:
                    continue
                d = a.pos() - b.pos()
                dist = max(math.hypot(d.x(), d.y()), 1)
                f = 2500 / (dist * dist)
                a.vel += QPointF(d.x() / dist * f, d.y() / dist * f)
            a.vel -= a.pos() * 0.01  # gravity towards the center
        for a, b, _ in self.edges:  # springs
            d = b.pos() - a.pos()
            dist = max(math.hypot(d.x(), d.y()), 1)
            f = (dist - 90) * 0.02
            v = QPointF(d.x() / dist * f, d.y() / dist * f)
            a.vel += v
            b.vel -= v
        for n in ns:
            if not n.pinned:
                n.setPos(n.pos() + n.vel)
            n.vel *= 0.85
        for a, b, line in self.edges:
            line.setLine(a.x(), a.y(), b.x(), b.y())

    def wheelEvent(self, e):
        s = 1.15 if e.angleDelta().y() > 0 else 1 / 1.15
        self.scale(s, s)
