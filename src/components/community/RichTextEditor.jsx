import { useEffect, useRef } from 'react'

function RichTextEditor({ value, onChange, placeholder = '내용을 입력하세요.' }) {
  const editorRef = useRef(null)

  useEffect(() => {
    if (!editorRef.current) return
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const applyCommand = (command, commandValue = null) => {
    editorRef.current?.focus()
    document.execCommand(command, false, commandValue)
    onChange(editorRef.current?.innerHTML ?? '')
  }

  return (
    <div className="community-editor-wrap">
      <div className="community-editor-toolbar">
        <button type="button" onClick={() => applyCommand('bold')}>
          B
        </button>
        <button type="button" onClick={() => applyCommand('italic')}>
          I
        </button>
        <button type="button" onClick={() => applyCommand('underline')}>
          U
        </button>
        <button type="button" onClick={() => applyCommand('insertUnorderedList')}>
          • List
        </button>
      </div>
      <div
        ref={editorRef}
        className="community-editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={() => onChange(editorRef.current?.innerHTML ?? '')}
      />
    </div>
  )
}

export default RichTextEditor
