import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Code, Code2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

/**
 * WYSIWYG rich-text editor built on TipTap / ProseMirror.
 * Stores and emits HTML. Props: value / onChange / onBlur / placeholder.
 *
 * When swapping the item being edited (e.g. switching selectedItem in a detail panel),
 * add key={item.id} on the parent so TipTap mounts fresh rather than relying on the
 * external-sync effect below.
 */
export function RichTextEditor({ value, onChange, onBlur, placeholder }) {
  // Track the last HTML we emitted so the sync effect doesn't echo our own changes back
  const lastEmittedRef = useRef(value ?? '');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value || '',
    onUpdate({ editor }) {
      const html = editor.getHTML();
      lastEmittedRef.current = html;
      onChange(html);
    },
    onBlur({ editor }) {
      const html = editor.getHTML();
      lastEmittedRef.current = html;
      onChange(html);
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: [
          'min-h-[100px] max-h-64 overflow-y-auto px-3 py-2 outline-none',
          'text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800',
          '[&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-1',
          '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
          '[&_li]:mb-0.5',
          '[&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through',
          '[&_code]:bg-neutral-100 dark:[&_code]:bg-neutral-900 [&_code]:rounded [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs',
          '[&_pre]:bg-neutral-100 dark:[&_pre]:bg-neutral-900 [&_pre]:rounded-md [&_pre]:px-3 [&_pre]:py-2 [&_pre]:my-1 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:overflow-x-auto',
          '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        ].join(' '),
      },
    },
  });

  // Sync when value changes externally (e.g. parent loads a different record).
  // Skipped when value matches lastEmittedRef to avoid echoing our own updates back.
  useEffect(() => {
    if (!editor || value === lastEmittedRef.current) return;
    lastEmittedRef.current = value ?? '';
    editor.commands.setContent(value || '', false);
  }, [value, editor]);

  if (!editor) return null;

  const Btn = ({ onClick, active, title, children }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
        active
          ? 'bg-brand-navy text-white'
          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
      }`}
    >
      {children}
    </button>
  );

  const Sep = () => <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1" />;

  return (
    <div className="border border-neutral-200 dark:border-neutral-600 rounded-lg overflow-hidden focus-within:border-brand-navy transition-colors">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex-wrap">
        <Btn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        ><strong>B</strong></Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        ><em>I</em></Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        ><u>U</u></Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        ><s>S</s></Btn>
        <Sep />
        <Btn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        ><span className="font-bold text-[10px]">H2</span></Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        ><span className="font-bold text-[10px]">H3</span></Btn>
        <Sep />
        <Btn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        ><span className="text-[11px]">• —</span></Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        ><span className="text-[11px]">1.</span></Btn>
        <Sep />
        <Btn
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline code"
        ><Code className="h-3.5 w-3.5" /></Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code block"
        ><Code2 className="h-3.5 w-3.5" /></Btn>
        <Sep />
        <Btn
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          active={false}
          title="Clear formatting"
        ><span className="text-[10px]">✕</span></Btn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
