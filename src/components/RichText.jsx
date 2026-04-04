import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  hasRichTextContent,
  normalizeRichTextValue,
  sanitizeRichTextHtml,
  toRichTextHtml,
} from '../lib/rich-text.js'

function ToolbarButton({ active = false, disabled = false, onClick, children, title }) {
  return (
    <button
      type="button"
      className={active ? 'rich-text-toolbar-button active' : 'rich-text-toolbar-button'}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  onSubmitShortcut,
  placeholder = '',
  minHeight = '7rem',
  ariaLabel = 'Rich text editor',
  className = '',
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
      }),
    ],
    content: toRichTextHtml(value),
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content',
        'aria-label': ariaLabel,
      },
      handleKeyDown(_view, event) {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault()
          onSubmitShortcut?.()
          return true
        }

        return false
      },
    },
    onUpdate({ editor: nextEditor }) {
      onChange?.(normalizeRichTextValue(nextEditor.getHTML()))
    },
    onBlur() {
      onBlur?.()
    },
  })

  useEffect(() => {
    if (!editor) return

    const nextContent = toRichTextHtml(value)
    const currentContent = normalizeRichTextValue(editor.getHTML())

    if (currentContent !== normalizeRichTextValue(nextContent)) {
      editor.commands.setContent(nextContent, false)
    }
  }, [editor, value])

  if (!editor) {
    return (
      <div
        className={className ? `rich-text-shell ${className}` : 'rich-text-shell'}
        style={{ '--editor-min-height': minHeight }}
      >
        <div className="rich-text-loading">{placeholder || 'Szerkesztő betöltése...'}</div>
      </div>
    )
  }

  return (
    <div
      className={className ? `rich-text-shell ${className}` : 'rich-text-shell'}
      style={{ '--editor-min-height': minHeight }}
    >
      <div className="rich-text-toolbar" aria-label="Szövegformázó eszközök">
        <ToolbarButton
          title="Félkövér"
          active={editor.isActive('bold')}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          title="Dőlt"
          active={editor.isActive('italic')}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          title="Felsorolás"
          active={editor.isActive('bulletList')}
          disabled={!editor.can().chain().focus().toggleBulletList().run()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          title="Számozott lista"
          active={editor.isActive('orderedList')}
          disabled={!editor.can().chain().focus().toggleOrderedList().run()}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          title="Formázás törlése"
          disabled={!hasRichTextContent(editor.getHTML())}
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          Tx
        </ToolbarButton>
      </div>

      <div className="rich-text-editor-frame">
        {!hasRichTextContent(editor.getHTML()) && placeholder ? (
          <div className="rich-text-placeholder" aria-hidden="true">{placeholder}</div>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export function RichTextContent({ value, className = '', fallback = '', ...props }) {
  const html = sanitizeRichTextHtml(value)

  if (!html) {
    return fallback ? <p className={className} {...props}>{fallback}</p> : null
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} {...props} />
}
