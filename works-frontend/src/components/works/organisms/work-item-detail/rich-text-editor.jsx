import { useRef, useEffect } from 'react';
import { X, IndentIncrease, IndentDecrease } from 'lucide-react';

export function RichTextEditor({ id, value, onChange, onBlur, placeholder }) {
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

  const renderToolBtn = ({ cmd, arg, title, children, active }) => (
    <button key={`${cmd}-${arg || 'default'}`} type="button" title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd, arg); }}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors
        ${active ? 'bg-brand-navy text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>
      {children}
    </button>
  );

  return (
    <div className="border border-neutral-200 dark:border-neutral-600 rounded-lg overflow-hidden focus-within:border-brand-navy transition-colors dark:bg-neutral-800">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex-wrap">
        {renderToolBtn({ cmd: 'bold',                title: 'Bold (Ctrl+B)',       children: <strong>B</strong> })}
        {renderToolBtn({ cmd: 'italic',              title: 'Italic (Ctrl+I)',     children: <em>I</em> })}
        {renderToolBtn({ cmd: 'underline',           title: 'Underline (Ctrl+U)',  children: <u>U</u> })}
        {renderToolBtn({ cmd: 'strikeThrough',       title: 'Strikethrough',       children: <s>S</s> })}
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"/>
        {renderToolBtn({ cmd: 'formatBlock', arg: 'h2', title: 'Heading 2',   children: <span className="font-bold text-xs">H2</span> })}
        {renderToolBtn({ cmd: 'formatBlock', arg: 'h3', title: 'Heading 3',   children: <span className="font-bold text-xs">H3</span> })}
        {renderToolBtn({ cmd: 'formatBlock', arg: 'p',  title: 'Paragraph',   children: <span className="text-xs">¶</span> })}
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"/>
        {renderToolBtn({ cmd: 'insertUnorderedList', title: 'Bullet list',  children: <span className="text-xs">{'• —'}</span> })}
        {renderToolBtn({ cmd: 'insertOrderedList',   title: 'Numbered list',children: <span className="text-xs">1.</span> })}
        {renderToolBtn({ cmd: 'indent',              title: 'Indent',       children: <IndentIncrease className="h-4 w-4" aria-hidden="true" /> })}
        {renderToolBtn({ cmd: 'outdent',             title: 'Outdent',      children: <IndentDecrease className="h-4 w-4" aria-hidden="true" /> })}
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-600 mx-1"/>
        {renderToolBtn({ cmd: 'removeFormat',        title: 'Clear formatting', children: <X className="h-4 w-4" aria-hidden="true" /> })}
        <span className="ml-auto text-xs text-neutral-300 pr-1">WYSIWYG</span>
      </div>
      <div
        id={id}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        tabIndex={0}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
        data-placeholder={placeholder}
        className="min-h-24 max-h-64 overflow-y-auto px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none bg-white dark:bg-neutral-800
          [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
          [&_li]:mb-0.5 [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through
          empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-300"
      />
    </div>
  );
}
