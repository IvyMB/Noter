/** Simple modal + the app dialogs (window.prompt/confirm do not exist in Electron). */
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { KINDS } from '@shared/types'
import { useI18n } from '../i18n'

function Modal({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }): React.JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

function Actions({ onCancel, submit, danger }: { onCancel(): void; submit: string; danger?: boolean }): React.JSX.Element {
  const { t } = useI18n()
  return (
    <div className="modal-actions">
      <button type="button" className="btn" onClick={onCancel}>
        {t('common.cancel')}
      </button>
      <button type="submit" className={danger ? 'btn danger' : 'btn primary'}>
        {submit}
      </button>
    </div>
  )
}

function FolderInput({
  value,
  onChange,
  folders,
  autoFocus
}: {
  value: string
  onChange(v: string): void
  folders: string[]
  autoFocus?: boolean
}): React.JSX.Element {
  const { t } = useI18n()
  return (
    <>
      <input
        className="input"
        list="folder-list"
        value={value}
        placeholder={t('field.folder.root')}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
      />
      <datalist id="folder-list">
        {folders.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
    </>
  )
}

const clean = (folder: string): string => folder.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')

export function NewNoteDialog({
  folders,
  defaultFolder,
  onSubmit,
  onClose
}: {
  folders: string[]
  defaultFolder: string
  onSubmit(title: string, kind: string, folder: string): void
  onClose(): void
}): React.JSX.Element {
  const { t, kindLabel } = useI18n()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<string>(KINDS[0])
  const [folder, setFolder] = useState(defaultFolder)
  const submit = (e: FormEvent): void => {
    e.preventDefault()
    const name = title.trim().replace(/[\\/]/g, '-')
    if (name) onSubmit(name, kind, clean(folder))
  }
  return (
    <Modal title={t('dlg.newNote')} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field">
          <span>{t('field.title')}</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>{t('field.kind')}</span>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {kindLabel(k)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('field.folder')}</span>
          <FolderInput value={folder} onChange={setFolder} folders={folders} />
        </label>
        <Actions onCancel={onClose} submit={t('common.create')} />
      </form>
    </Modal>
  )
}

export function FolderDialog({
  title,
  folders,
  initial,
  submitLabel,
  hint,
  onSubmit,
  onClose
}: {
  title: string
  folders: string[]
  initial: string
  submitLabel: string
  hint?: string
  onSubmit(folder: string): void
  onClose(): void
}): React.JSX.Element {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLFormElement>(null)
  const submit = (e: FormEvent): void => {
    e.preventDefault()
    onSubmit(clean(value))
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} ref={ref}>
        <label className="field">
          {hint && <span>{hint}</span>}
          <FolderInput value={value} onChange={setValue} folders={folders} autoFocus />
        </label>
        <Actions onCancel={onClose} submit={submitLabel} />
      </form>
    </Modal>
  )
}

export function ConfirmDialog({
  title,
  text,
  submitLabel,
  onConfirm,
  onClose
}: {
  title: string
  text: string
  submitLabel: string
  onConfirm(): void
  onClose(): void
}): React.JSX.Element {
  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onConfirm()
        }}
      >
        <p className="modal-text">{text}</p>
        <Actions onCancel={onClose} submit={submitLabel} danger />
      </form>
    </Modal>
  )
}
