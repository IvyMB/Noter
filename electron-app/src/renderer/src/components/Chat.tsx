import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@shared/types'
import { useI18n } from '../i18n'

interface Line {
  role: 'user' | 'assistant' | 'error'
  content: string
}

export default function Chat({ getNoteText }: { getNoteText(): string }): React.JSX.Element {
  const { t } = useI18n()
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [useNote, setUseNote] = useState(true)
  const [log, setLog] = useState<Line[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const history = useRef<ChatMessage[]>([])
  const reply = useRef('')
  const busyRef = useRef(false)
  const endRef = useRef<HTMLDivElement>(null)

  const refreshModels = useCallback(async () => {
    const list = await window.api.llm.models()
    setModels(list)
    setModel((m) => (list.includes(m) ? m : (list[0] ?? '')))
  }, [])

  useEffect(() => {
    void refreshModels()
  }, [refreshModels])

  useEffect(() => {
    // only one conversation runs at a time, so accepting events while busy is enough
    const off = window.api.llm.onEvent((ev) => {
      if (!busyRef.current) return
      if (ev.type === 'token') {
        reply.current += ev.data
        setLog((l) => [...l.slice(0, -1), { role: 'assistant', content: reply.current }])
      } else {
        if (ev.type === 'error')
          setLog((l) => [...l, { role: 'error', content: t('chat.error', { err: ev.data }) }])
        else history.current.push({ role: 'assistant', content: reply.current })
        busyRef.current = false
        setBusy(false)
      }
    })
    // wrap the bridged unsubscribe: React needs the cleanup to be a plain function
    return () => {
      off()
    }
  }, [t])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [log])

  const send = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    const text = input.trim()
    if (!text || busyRef.current || !model) return
    setInput('')
    history.current.push({ role: 'user', content: text })
    const msgs: ChatMessage[] = [...history.current]
    const note = getNoteText()
    if (useNote && note) msgs.unshift({ role: 'system', content: `${t('chat.systemNote')}\n---\n${note}\n---` })
    reply.current = ''
    busyRef.current = true
    setBusy(true)
    setLog((l) => [...l, { role: 'user', content: text }, { role: 'assistant', content: '' }])
    await window.api.llm.chat(model, msgs)
  }

  return (
    <aside className="chat">
      <div className="chat-head">
        <strong>{t('chat.title')}</strong>
      </div>
      <div className="chat-model">
        <select className="input" value={model} onChange={(e) => setModel(e.target.value)} disabled={!models.length}>
          {models.length ? models.map((m) => <option key={m}>{m}</option>) : <option>{t('chat.offline')}</option>}
        </select>
        <button className="btn icon" title={t('chat.refresh')} onClick={() => void refreshModels()}>
          ↻
        </button>
      </div>
      <label className="check">
        <input type="checkbox" checked={useNote} onChange={(e) => setUseNote(e.target.checked)} />
        {t('chat.context')}
      </label>
      <div className="chat-log">
        {log.map((l, i) => (
          <div key={i} className={`msg ${l.role}`}>
            {l.role !== 'error' && <b>{l.role === 'user' ? t('chat.you') : t('chat.ai')}</b>}
            <div>{l.content || (busy && i === log.length - 1 ? '…' : '')}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => void send(e)}>
        <input
          className="input"
          placeholder={t('chat.placeholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </aside>
  )
}
