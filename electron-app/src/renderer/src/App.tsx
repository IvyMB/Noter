import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KINDS, type Language, type NoteData, type NoteMeta, type Settings, type ThemeName } from '@shared/types'
import Cards from './components/Cards'
import Chat from './components/Chat'
import Editor, { type EditorHandle } from './components/Editor'
import Graph from './components/Graph'
import { ConfirmDialog, FolderDialog, NewNoteDialog } from './components/Modal'
import Sidebar from './components/Sidebar'
import { I18nContext, LANGUAGES, makeT } from './i18n'

type Tab = 'editor' | 'cards' | 'graph'
type Dialog =
  | { type: 'newNote'; folder: string }
  | { type: 'newFolder'; base: string }
  | { type: 'move'; name: string; folder: string }
  | { type: 'delete'; name: string }
  | null

export default function App(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [notes, setNotes] = useState<NoteMeta[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [current, setCurrent] = useState<NoteData | null>(null)
  const [tab, setTab] = useState<Tab>('editor')
  const [chatOpen, setChatOpen] = useState(true)
  const [dialog, setDialog] = useState<Dialog>(null)

  const noteRef = useRef<NoteData | null>(null) // live version of the note (avoids a re-render on every keystroke)
  const dirty = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const editor = useRef<EditorHandle>(null)

  const lang: Language = settings?.language ?? 'en'
  const i18n = useMemo(() => ({ ...makeT(lang), lang }), [lang])
  const { t, kindLabel } = i18n

  const refresh = useCallback(async () => {
    const r = await window.api.vault.list()
    setNotes(r.notes)
    setFolders(r.folders)
  }, [])

  useEffect(() => {
    void window.api.settings.get().then(setSettings)
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (settings) document.documentElement.dataset.theme = settings.theme
  }, [settings])

  const updateSettings = async (patch: Partial<Settings>): Promise<void> => {
    setSettings(await window.api.settings.set(patch))
  }

  // ---- saving ---------------------------------------------------------
  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current)
    if (dirty.current && noteRef.current) {
      dirty.current = false
      await window.api.vault.write(noteRef.current)
      await refresh()
    }
  }, [refresh])

  const onEdit = (text: string): void => {
    if (!noteRef.current) return
    noteRef.current = { ...noteRef.current, body: text }
    dirty.current = true
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void flush(), 600)
  }

  useEffect(() => {
    const onHide = (): void => void flush()
    window.addEventListener('beforeunload', onHide)
    return () => window.removeEventListener('beforeunload', onHide)
  }, [flush])

  // ---- actions --------------------------------------------------------
  const open = useCallback(
    async (name: string) => {
      if (!name) return
      await flush()
      const note = (await window.api.vault.read(name)) ?? (await window.api.vault.create(name, KINDS[0], ''))
      noteRef.current = note
      setCurrent(note)
      setTab('editor')
      await refresh()
    },
    [flush, refresh]
  )

  const createNote = async (name: string, kind: string, folder: string): Promise<void> => {
    setDialog(null)
    await flush()
    await window.api.vault.create(name, kind, folder)
    await open(name)
  }

  const changeKind = async (name: string, kind: string): Promise<void> => {
    await flush()
    if (noteRef.current?.name === name) {
      noteRef.current = { ...noteRef.current, kind }
      setCurrent(noteRef.current)
      await window.api.vault.write(noteRef.current)
    } else {
      const n = await window.api.vault.read(name)
      if (n) await window.api.vault.write({ ...n, kind })
    }
    await refresh()
  }

  const moveNote = async (name: string, folder: string): Promise<void> => {
    setDialog(null)
    await flush()
    await window.api.vault.move(name, folder)
    if (noteRef.current?.name === name) {
      noteRef.current = { ...noteRef.current, folder }
      setCurrent(noteRef.current)
    }
    await refresh()
  }

  const deleteNote = async (name: string): Promise<void> => {
    setDialog(null)
    await flush()
    await window.api.vault.remove(name)
    if (noteRef.current?.name === name) {
      noteRef.current = null
      setCurrent(null)
    }
    await refresh()
  }

  const pickVault = async (): Promise<void> => {
    const dir = await window.api.vault.pick()
    if (!dir) return
    await flush()
    noteRef.current = null
    setCurrent(null)
    await updateSettings({ vaultDir: dir })
    await refresh()
  }

  const backlinks = useMemo(
    () => (current ? notes.filter((n) => n.links.includes(current.name)) : []),
    [notes, current]
  )

  if (!settings) return <div className="boot" />

  return (
    <I18nContext.Provider value={i18n}>
      <div className="app">
        <header className="topbar">
          <div className="brand">Noter</div>
          <div className="tabs">
            {(['editor', 'cards', 'graph'] as Tab[]).map((x) => (
              <button key={x} className={tab === x ? 'on' : ''} onClick={() => setTab(x)}>
                {t(`tab.${x}`)}
              </button>
            ))}
          </div>
          <div className="spacer" />
          <button className="btn ghost" onClick={() => void pickVault()} title={settings.vaultDir}>
            📁 {t('app.openFolder')}
          </button>
          <div className="segmented small" title={t('app.language')}>
            {(Object.keys(LANGUAGES) as Language[]).map((l) => (
              <button key={l} className={lang === l ? 'on' : ''} onClick={() => void updateSettings({ language: l })}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="segmented small" title={t('app.theme')}>
            {(['dark', 'light'] as ThemeName[]).map((n) => (
              <button
                key={n}
                className={settings.theme === n ? 'on' : ''}
                onClick={() => void updateSettings({ theme: n })}
              >
                {n === 'dark' ? '🌙' : '☀️'} {t(`theme.${n}`)}
              </button>
            ))}
          </div>
          <button className="btn ghost" title={t('chat.toggle')} onClick={() => setChatOpen((o) => !o)}>
            💬
          </button>
        </header>

        <div className={`layout ${chatOpen ? 'with-chat' : ''}`}>
          <Sidebar
            notes={notes}
            folders={folders}
            current={current?.name ?? null}
            onOpen={(n) => void open(n)}
            onNewNote={(folder) => setDialog({ type: 'newNote', folder })}
            onNewFolder={(base) => setDialog({ type: 'newFolder', base })}
            onMove={(name) => setDialog({ type: 'move', name, folder: notes.find((n) => n.name === name)?.folder ?? '' })}
            onChangeKind={(n, k) => void changeKind(n, k)}
            onDelete={(name) => setDialog({ type: 'delete', name })}
          />

          <main className="center">
            {tab === 'cards' ? (
              <Cards notes={notes} current={current?.name ?? null} onOpen={(n) => void open(n)} />
            ) : tab === 'graph' ? (
              <Graph notes={notes} theme={settings.theme} onOpen={(n) => void open(n)} />
            ) : current ? (
              <>
                <div className="note-head">
                  <h1>{current.name}</h1>
                  <span className="muted path">{current.folder || t('field.folder.root')}</span>
                  <div className="spacer" />
                  <span className="dot" data-kind={current.kind} />
                  <select
                    className="input kind-select"
                    value={current.kind}
                    onChange={(e) => void changeKind(current.name, e.target.value)}
                  >
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {kindLabel(k)}
                      </option>
                    ))}
                  </select>
                </div>
                <Editor
                  ref={editor}
                  docKey={current.name}
                  initialText={current.body}
                  onChange={onEdit}
                  onOpenNote={(n) => void open(n)}
                />
                <div className="backlinks">
                  <span className="muted">{t('editor.backlinks')}</span>
                  {backlinks.length ? (
                    backlinks.map((b) => (
                      <button key={b.name} className="chip" onClick={() => void open(b.name)}>
                        <span className="dot" data-kind={b.kind} /> {b.name}
                      </button>
                    ))
                  ) : (
                    <span className="muted">{t('editor.noBacklinks')}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="empty">{t('editor.empty')}</div>
            )}
          </main>

          {chatOpen && <Chat getNoteText={() => editor.current?.getText() ?? ''} />}
        </div>

        {dialog?.type === 'newNote' && (
          <NewNoteDialog
            folders={folders}
            defaultFolder={dialog.folder}
            onSubmit={(n, k, f) => void createNote(n, k, f)}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog?.type === 'newFolder' && (
          <FolderDialog
            title={t('dlg.newFolder')}
            hint={t('dlg.newFolder.hint')}
            folders={folders}
            initial={dialog.base ? `${dialog.base}/` : ''}
            submitLabel={t('common.create')}
            onSubmit={(f) => {
              setDialog(null)
              if (f) void window.api.vault.createFolder(f).then(refresh)
            }}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog?.type === 'move' && (
          <FolderDialog
            title={t('dlg.move')}
            folders={folders}
            initial={dialog.folder}
            submitLabel={t('common.move')}
            onSubmit={(f) => void moveNote(dialog.name, f)}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog?.type === 'delete' && (
          <ConfirmDialog
            title={t('dlg.delete')}
            text={t('dlg.delete.text', { name: dialog.name })}
            submitLabel={t('common.delete')}
            onConfirm={() => void deleteNote(dialog.name)}
            onClose={() => setDialog(null)}
          />
        )}
      </div>
    </I18nContext.Provider>
  )
}
