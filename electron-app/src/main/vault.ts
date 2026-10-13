/** Repository: notes are .md files in a folder (subfolders allowed). */
import { promises as fs } from 'fs'
import { basename, dirname, join, relative, sep } from 'path'
import { extractLinks, makeExcerpt, parseNote, serializeNote } from '../shared/note'
import type { NoteData, NoteMeta } from '../shared/types'

const isHidden = (rel: string): boolean => rel.split(sep).some((p) => p.startsWith('.'))
const posix = (rel: string): string => rel.split(sep).join('/')

export class Vault {
  constructor(public root: string) {}

  async init(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true })
  }

  /** name (without .md) -> absolute path, scanning subfolders (hidden folders are skipped). */
  private async scan(): Promise<{ files: Map<string, string>; folders: string[] }> {
    const files = new Map<string, string>()
    const folders: string[] = []
    const walk = async (dir: string): Promise<void> => {
      const entries = (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      for (const e of entries) {
        const full = join(dir, e.name)
        const rel = relative(this.root, full)
        if (isHidden(rel)) continue
        if (e.isDirectory()) {
          folders.push(posix(rel))
          await walk(full)
        } else if (e.isFile() && e.name.endsWith('.md')) {
          const name = basename(e.name, '.md')
          if (!files.has(name)) files.set(name, full)
        }
      }
    }
    await walk(this.root)
    return { files, folders: folders.sort() }
  }

  private folderOf(path: string): string {
    const rel = relative(this.root, dirname(path))
    return rel ? posix(rel) : ''
  }

  async list(): Promise<{ notes: NoteMeta[]; folders: string[] }> {
    const { files, folders } = await this.scan()
    const notes = await Promise.all(
      [...files].map(async ([name, path]) => {
        const [text, stat] = await Promise.all([fs.readFile(path, 'utf-8'), fs.stat(path)])
        const { kind, body } = parseNote(text)
        return {
          name,
          folder: this.folderOf(path),
          kind,
          links: extractLinks(body),
          excerpt: makeExcerpt(body),
          mtime: stat.mtimeMs
        }
      })
    )
    notes.sort((a, b) => a.name.localeCompare(b.name))
    return { notes, folders }
  }

  async read(name: string): Promise<NoteData | null> {
    const path = (await this.scan()).files.get(name)
    if (!path) return null
    const text = await fs.readFile(path, 'utf-8')
    return { name, folder: this.folderOf(path), ...parseNote(text) }
  }

  async write(note: NoteData): Promise<void> {
    const existing = (await this.scan()).files.get(note.name)
    const path = existing ?? join(this.root, note.folder, `${note.name}.md`)
    await fs.mkdir(dirname(path), { recursive: true })
    await fs.writeFile(path, serializeNote(note), 'utf-8')
  }

  async create(name: string, kind: string, folder: string): Promise<NoteData> {
    const existing = await this.read(name)
    if (existing) return existing
    const note: NoteData = { name, folder, kind, extra: '', body: `# ${name}\n\n` }
    await this.write(note)
    return note
  }

  async remove(name: string): Promise<void> {
    const path = (await this.scan()).files.get(name)
    if (path) await fs.unlink(path)
  }

  async move(name: string, folder: string): Promise<void> {
    const src = (await this.scan()).files.get(name)
    if (!src) return
    const dst = join(this.root, folder, basename(src))
    if (dst === src) return
    await fs.mkdir(dirname(dst), { recursive: true })
    await fs.rename(src, dst)
  }

  async createFolder(folder: string): Promise<void> {
    await fs.mkdir(join(this.root, folder), { recursive: true })
  }

  async search(query: string): Promise<string[]> {
    const q = query.toLowerCase()
    const { files } = await this.scan()
    const hits: string[] = []
    for (const [name, path] of files) {
      if (name.toLowerCase().includes(q) || (await fs.readFile(path, 'utf-8')).toLowerCase().includes(q))
        hits.push(name)
    }
    return hits.sort((a, b) => a.localeCompare(b))
  }
}
