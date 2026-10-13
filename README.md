# Noter

A desktop app for markdown notes with links, a graph view and a local AI chat. Your notes are plain `.md` files in a folder, so nothing is locked in and nothing leaves your computer.

There are two versions of the app in this repository:

| Version | Folder | Stack | Status |
|---|---|---|---|
| **Electron** | [`electron-app/`](electron-app) | Electron, React, TypeScript, CodeMirror 6 | Main version, has everything below |
| **Python** | repository root | PySide6 (Qt) | First version, no cards view |

## Features

- **Plain markdown files:** each note is a `.md` file. Folders and subfolders are supported.
- **Links between notes:** write `[[Note name]]` to link. Notes that link to the open one show up as backlinks.
- **Note types:** Note, Idea, Project, Task, Meeting, Journal and Reference. Group the sidebar by folder or by type.
- **Live markdown:** headings, bold, italic, code, lists and quotes are formatted while you type. The markdown symbols hide, except on the line holding the cursor.
- **Graph view:** every note is a node colored by type. Drag nodes, zoom, double-click to open a note.
- **Cards view** (Electron only): notes as cards with a text preview and their connections (`→` links to, `←` linked from). Filter by type, folder, text, or by notes connected to a chosen note (1 to 3 hops, any direction).
- **Local AI chat:** talk to a model running on your machine through [Ollama](https://ollama.com), optionally using the open note as context.
- **English and Portuguese**, and **dark and light themes**, switchable inside the app.

## Run it

### Electron version

Requires [Node.js](https://nodejs.org) (tested with v24).

```bash
cd electron-app
npm install
npm run build
npm start
```

For development with live reload, use `npm run dev` instead of `build` and `start`.

### Python version

Requires Python 3.10 or newer.

```bash
pip install -r requirements.txt
python app.py              # uses the ./vault folder
python app.py path/to/vault
```

### Local AI chat (optional)

Install [Ollama](https://ollama.com), pull a model (for example `ollama pull llama3.2`) and keep it running. The chat panel lists your installed models. Without Ollama the app works normally and the panel shows "offline".

## Where your notes live

- **Python:** the `vault` folder next to `app.py` (created if missing), or the folder you pass on the command line. The menu **Vault > Open folder** switches it.
- **Electron:** a `vault` folder next to `electron-app` if it exists, otherwise `Documents/noter-vault`. The **Open folder…** button switches it, and the choice is remembered.

The `vault/` folder is git-ignored on purpose, so your personal notes are not published by accident.

## Note format

A note is markdown. The type is stored in an optional header at the top of the file:

```markdown
---
type: Idea
---
# My idea

Related to [[Projects]]. Also see [[Reading list|my reading list]].
```

- Links accept an alias (`[[Note|text]]`) or a section (`[[Note#heading]]`); only the note name is used for the connection.
- A note without a header is a plain **Note**.
- Files written by older versions with `tipo: Ideia` (Portuguese names) are still read correctly.

## Project layout

```
app.py              Python entry point
models/             Note and Graph data models
services/           vault (files), i18n, theme, Ollama client
ui/                 Qt widgets (sidebar, editor, graph, chat, dialogs)
electron-app/
  src/main/         Electron main process (files, settings, Ollama)
  src/preload/      Bridge between main and renderer
  src/renderer/     React interface (sidebar, editor, cards, graph, chat)
  src/shared/       Types and note parsing used by both sides
```

## Troubleshooting

- **Electron window does not open, error `Cannot read properties of undefined (reading 'whenReady')`:** the environment variable `ELECTRON_RUN_AS_NODE` is set, which happens in some VS Code terminals. Unset it before running: `unset ELECTRON_RUN_AS_NODE` (Git Bash) or `Remove-Item Env:ELECTRON_RUN_AS_NODE` (PowerShell).
- **`npm install` fails while downloading Electron:** point it to a mirror and try again, for example `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install`.
- **Chat says Ollama is offline:** make sure Ollama is running and listening on `http://localhost:11434`.
