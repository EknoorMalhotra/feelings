import { forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import '../styles/editor.css'

const TOOLBAR_BUTTONS = [
  { label: 'B', command: 'toggleBold', mark: 'bold', style: { fontWeight: 700 } },
  { label: 'I', command: 'toggleItalic', mark: 'italic', style: { fontStyle: 'italic' } },
  { label: 'U', command: 'toggleUnderline', mark: 'underline', style: { textDecoration: 'underline' } },
]

// Tiptap-backed replacement for the prototype's contenteditable +
// document.execCommand formatting toolbar. Body is stored as Tiptap JSON.
const WritingEditor = forwardRef(function WritingEditor({ onContentChange }, ref) {
  const editor = useEditor({
    extensions: [StarterKit],
    onUpdate: ({ editor }) => onContentChange(!editor.isEmpty),
  })

  useImperativeHandle(ref, () => ({
    getJSON: () => editor?.getJSON(),
    isEmpty: () => editor?.isEmpty ?? true,
  }))

  if (!editor) return null

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 26, paddingBottom: 22, borderBottom: '1px solid rgba(59,70,81,0.1)' }}>
        {TOOLBAR_BUTTONS.map(({ label, command, mark, style }) => (
          <button
            key={command}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus()[command]().run()
            }}
            style={{
              fontFamily: "'Inter', sans-serif",
              width: 34,
              height: 34,
              borderRadius: 8,
              border: 'none',
              background: editor.isActive(mark) ? 'rgba(59,70,81,0.16)' : 'rgba(59,70,81,0.06)',
              cursor: 'pointer',
              color: '#3B4651',
              ...style,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="tiptap-editor" style={{ position: 'relative', flex: 1 }}>
        {editor.isEmpty && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              fontFamily: "'Courier Prime', monospace",
              fontSize: 17,
              lineHeight: 1.85,
              color: 'rgba(59,70,81,0.3)',
              pointerEvents: 'none',
            }}
          >
            Start writing...
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </>
  )
})

export default WritingEditor
