import React, { useRef, useEffect } from 'react';

/**
 * WYSIWYG Rich Text Editor using contentEditable + execCommand.
 * Formatting is applied and rendered immediately — no preview mode.
 * Stores and emits HTML.
 */
export function RichTextEditor({ value, onChange, onBlur, placeholder }) {
  const editorRef = useRef(null);
  const isComposing = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, []); // mount-only; ongoing changes come from user input

  const exec = (cmd, arg = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(editorRef.current?.innerHTML || '');
  };

  const handleInput = () => {
    if (!isComposing.current) onChange(editorRef.current?.innerHTML || '');
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); exec('bold'); }
      if (e.key === 'i') { e.preventDefault(); exec('italic'); }
      if (e.key === 'u') { e.preventDefault(); exec('underline'); }
    }
  };

  const handleBlur = () => {
    onChange(editorRef.current?.innerHTML || '');
    onBlur?.();
  };

  const ToolBtn = ({ cmd, arg, title, children }) => (
    <button type="button" title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd, arg); }}
      className="w-7 h-7 flex items-center justify-center rounded text-xs transition-colors text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700">
      {children}
    </button>
  );

  return (
    <div className="border border-neutral-200 dark:border-neutral-600 rounded-lg overflow-hidden focus-within:border-brand-navy transition-colors dark:bg-neutral-800">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex-wrap">
        <ToolBtn cmd="bold"          title="Bold (Ctrl+B)"><strong>B</strong></ToolBtn>
        <ToolBtn cmd="italic"        title="Italic (Ctrl+I)"><em>I</em></ToolBtn>
        <ToolBtn cmd="underline"     title="Underline (Ctrl+U)"><u>U</u></ToolBtn>
        <ToolBtn cmd="strikeThrough" title="Strikethrough"><s>S</s></ToolBtn>
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"/>
        <ToolBtn cmd="formatBlock" arg="h2" title="Heading 2"><span className="font-bold text-[10px]">H2</span></ToolBtn>
        <ToolBtn cmd="formatBlock" arg="h3" title="Heading 3"><span className="font-bold text-[10px]">H3</span></ToolBtn>
        <ToolBtn cmd="formatBlock" arg="p"  title="Paragraph"><span className="text-[10px]">¶</span></ToolBtn>
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"/>
        <ToolBtn cmd="insertUnorderedList" title="Bullet list"><span className="text-[11px]">• —</span></ToolBtn>
        <ToolBtn cmd="insertOrderedList"   title="Numbered list"><span className="text-[11px]">1.</span></ToolBtn>
        <ToolBtn cmd="indent"              title="Indent"><span className="text-[11px]">→</span></ToolBtn>
        <ToolBtn cmd="outdent"             title="Outdent"><span className="text-[11px]">←</span></ToolBtn>
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"/>
        <ToolBtn cmd="removeFormat" title="Clear formatting"><span className="text-[10px]">✕</span></ToolBtn>
        <span className="ml-auto text-[9px] text-neutral-300 pr-1">WYSIWYG</span>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
        data-placeholder={placeholder}
        className="min-h-[100px] max-h-64 overflow-y-auto px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none bg-white dark:bg-neutral-800
          [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
          [&_li]:mb-0.5 [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through
          empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-300"
      />
    </div>
  );
}
