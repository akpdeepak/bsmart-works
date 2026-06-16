// Floating text-formatting toolbar — shown above an active text selection in any text-bearing
// block (paragraph, heading, quote, callout). Rendered as a React portal so it is never clipped
// by overflow:hidden ancestors. Buttons call onWrap(startSyntax, endSyntax) which the editor
// applies via the KR-001 wrapSyntax helpers. KR-002 · P0 · RB-30 §7 · RB-10.

import { createPortal } from 'react-dom';
import { useRef, useLayoutEffect } from 'react';
import { Bold, Italic, Strikethrough, Code, Link2 } from 'lucide-react';

// Each tool defines the asymmetric syntax pair — startSyntax wraps before the selection,
// endSyntax wraps after. Symmetric marks use the same string for both sides.
const TOOLS = [
  { label: 'Bold',          Icon: Bold,          start: '**',  end: '**'   },
  { label: 'Italic',        Icon: Italic,         start: '*',   end: '*'    },
  { label: 'Strikethrough', Icon: Strikethrough,  start: '~~',  end: '~~'   },
  { label: 'Code',          Icon: Code,           start: '`',   end: '`'    },
  { label: 'Link',          Icon: Link2,          start: '[',   end: ']()'  },
];

/**
 * @param {{ rect: DOMRect|null, onWrap: (start:string, end:string)=>void, onDismiss: ()=>void }} props
 * rect — bounding box of the selection (viewport-relative); null = hidden.
 */
export function SelectionToolbar({ rect, onWrap, onDismiss }) {
  const ref = useRef(null);

  // Position the toolbar above the selection after it mounts; starts offscreen so there is no
  // layout flash while offsetWidth/Height are being measured.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !rect) return;
    const tw = el.offsetWidth;
    const th = el.offsetHeight;
    const top = rect.top - th - 8;
    const left = rect.left + rect.width / 2 - tw / 2;
    el.style.top = `${Math.max(4, top)}px`;
    el.style.left = `${Math.max(4, Math.min(left, window.innerWidth - tw - 4))}px`;
    el.style.opacity = '1';
  }, [rect]);

  if (!rect) return null;

  return createPortal(
    <div
      ref={ref}
      role="toolbar"
      aria-label="Text formatting"
      style={{ position: 'fixed', top: -9999, left: -9999, opacity: 0 }}
      className="z-dropdown flex items-center gap-0.5 rounded-md bg-neutral-900 px-1.5 py-1 shadow-lg"
    >
      {TOOLS.map(({ label, Icon, start, end }) => (
        <button
          key={label}
          type="button"
          title={label}
          aria-label={label}
          // preventDefault stops the textarea from losing focus before onClick fires (KR-002 §6).
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onWrap(start, end)}
          className="rounded p-1.5 text-neutral-200 hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>,
    document.body,
  );
}
