import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { Annotation, EditorState } from '@codemirror/state'
import { EditorView, drawSelection, keymap } from '@codemirror/view'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { livePreview } from '../editor/livePreview'

export interface EditorHandle {
  getText(): string
}

interface Props {
  /** Changes when another note is opened; the content is then swapped without firing onChange. */
  docKey: string
  initialText: string
  onChange(text: string): void
  onOpenNote(name: string): void
}

const External = Annotation.define<boolean>()

const Editor = forwardRef<EditorHandle, Props>(function Editor(
  { docKey, initialText, onChange, onOpenNote },
  ref
) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onOpenRef = useRef(onOpenNote)
  onChangeRef.current = onChange
  onOpenRef.current = onOpenNote

  useImperativeHandle(ref, () => ({ getText: () => view.current?.state.doc.toString() ?? '' }))

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: initialText,
        extensions: [
          history(),
          drawSelection(),
          markdown(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          livePreview((name) => onOpenRef.current(name)),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && !u.transactions.some((t) => t.annotation(External)))
              onChangeRef.current(u.state.doc.toString())
          })
        ]
      })
    })
    view.current = v
    return () => v.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const v = view.current
    if (!v) return
    v.dispatch({
      changes: { from: 0, to: v.state.doc.length, insert: initialText },
      selection: { anchor: 0 },
      annotations: [External.of(true)]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey])

  return <div className="editor-host" ref={host} />
})

export default Editor
