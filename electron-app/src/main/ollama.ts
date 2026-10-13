/** Cliente do Ollama (LLM 100% local) em http://localhost:11434 */
import type { ChatEvent, ChatMessage } from '../shared/types'

const HOST = 'http://localhost:11434'

export async function listModels(): Promise<string[]> {
  try {
    const r = await fetch(`${HOST}/api/tags`, { signal: AbortSignal.timeout(2000) })
    const data = (await r.json()) as { models?: { name: string }[] }
    return (data.models ?? []).map((m) => m.name)
  } catch {
    return []
  }
}

/** Streams the reply; each body line is a JSON object holding a chunk of text. */
export async function chat(
  id: string,
  model: string,
  messages: ChatMessage[],
  emit: (e: ChatEvent) => void
): Promise<void> {
  try {
    const r = await fetch(`${HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true })
    })
    if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`)
    const reader = r.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        const content = (JSON.parse(line) as { message?: { content?: string } }).message?.content
        if (content) emit({ id, type: 'token', data: content })
      }
    }
    emit({ id, type: 'done' })
  } catch (e) {
    emit({ id, type: 'error', data: e instanceof Error ? e.message : String(e) })
  }
}
