/** Types shared by main, preload and renderer. */

// Canonical kind names, stored in the file as `type: Idea`; the displayed name comes from i18n.
// Older notes may still use the Portuguese names/key (see LEGACY_KINDS in note.ts).
export const KINDS = ['Note', 'Idea', 'Project', 'Task', 'Meeting', 'Journal', 'Reference'] as const
export const DEFAULT_KIND = 'Note'

export type Language = 'en' | 'pt'
export type ThemeName = 'dark' | 'light'

export interface Settings {
  language: Language
  theme: ThemeName
  vaultDir: string
}

/** Note summary (list, search, graph). */
export interface NoteMeta {
  name: string
  folder: string // relative to the vault ('' = root)
  kind: string
  links: string[]
  excerpt: string // plain-text preview of the body (cards view)
  mtime: number // last modified, ms since epoch
}

/** Full note. `extra` keeps the other frontmatter lines so they are not lost. */
export interface NoteData {
  name: string
  folder: string
  kind: string
  extra: string
  body: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ChatEvent =
  | { id: string; type: 'token'; data: string }
  | { id: string; type: 'done' }
  | { id: string; type: 'error'; data: string }

export interface NoterApi {
  settings: {
    get(): Promise<Settings>
    set(patch: Partial<Settings>): Promise<Settings>
  }
  vault: {
    pick(): Promise<string | null>
    list(): Promise<{ notes: NoteMeta[]; folders: string[] }>
    read(name: string): Promise<NoteData | null>
    write(note: NoteData): Promise<void>
    create(name: string, kind: string, folder: string): Promise<NoteData>
    remove(name: string): Promise<void>
    move(name: string, folder: string): Promise<void>
    createFolder(folder: string): Promise<void>
    search(query: string): Promise<string[]>
  }
  llm: {
    models(): Promise<string[]>
    chat(model: string, messages: ChatMessage[]): Promise<string>
    onEvent(cb: (e: ChatEvent) => void): () => void
  }
}
