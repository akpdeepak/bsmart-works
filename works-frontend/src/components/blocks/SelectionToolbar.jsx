// Floating text-formatting toolbar — shown above an active text selection in any text-bearing
// block (paragraph, heading, quote, callout). Rendered as a React portal so it is never clipped
// by overflow:hidden ancestors. Buttons call onWrap(startSyntax, endSyntax) which the editor
// applies via the KR-001 wrapSyntax helpers. KR-002 · P0 · RB-30 §7 · RB-10.
// KR-005: text-color and highlight sub-palettes added; colours stored as <span class="..."> marks.

import { createPortal } from 'react-dom';
import { useRef, useLayoutEffect, useState } from 'react';
import { Bold, Italic, Strikethrough, Code, Link2, Type, Highlighter } from 'lucide-react';

// Each tool defines the asymmetric syntax pair — startSyntax wraps before the selection,
// endSyntax wraps after. Symmetric marks use the same string for both sides.
const TOOLS = [
  { label: 'Bold',          Icon: Bold,          start: '**',  end: '**'   },
  { label: 'Italic',        Icon: Italic,         start: '*',   end: '*'    },
  { label: 'Strikethrough', Icon: Strikethrough,  start: '~~',  end: '~~'   },
  { label: 'Code',          Icon: Code,           start: '`',   end: '`'    },
  { label: 'Link',          Icon: Link2,          start: '[',   end: ']()'  },
];

// KR-005: text color palette — 8 design-token colours.
// `cls` is the class stored in <span class="...">, `swatch` is the class used on the picker swatch.
const TEXT_COLORS = [
  { label: 'Red',    cls: 'text-semantic-danger',   swatch: 'bg-semantic-danger'   },
  { label: 'Amber',  cls: 'text-semantic-warning',  swatch: 'bg-semantic-warning'  },
  { label: 'Green',  cls: 'text-semantic-success',  swatch: 'bg-semantic-success'  },
  { label: 'Navy',   cls: 'text-brand-navy',        swatch: 'bg-brand-navy'        },
  { label: 'Orange', cls: 'text-brand-orange',      swatch: 'bg-brand-orange'      },
  { label: 'Gray',   cls: 'text-neutral-600',       swatch: 'bg-neutral-600'       },
  { label: 'Purple', cls: 'text-purple-600',        swatch: 'bg-purple-600'        },
  { label: 'Muted',  cls: 'text-neutral-400',       swatch: 'bg-neutral-400'       },
];

// KR-005: highlight (background) palette — 8 light/dark-aware highlight colours.
const HIGHLIGHT_COLORS = [
  { label: 'Yellow',  cls: 'bg-yellow-100 dark:bg-yellow-900/30',  swatch: 'bg-yellow-200'  },
  { label: 'Blue',    cls: 'bg-blue-100 dark:bg-blue-900/30',      swatch: 'bg-blue-200'    },
  { label: 'Green',   cls: 'bg-green-100 dark:bg-green-900/30',    swatch: 'bg-green-200'   },
  { label: 'Red',     cls: 'bg-red-100 dark:bg-red-900/30',        swatch: 'bg-red-200'     },
  { label: 'Orange',  cls: 'bg-orange-100 dark:bg-orange-900/30',  swatch: 'bg-orange-200'  },
  { label: 'Purple',  cls: 'bg-purple-100 dark:bg-purple-900/30',  swatch: 'bg-purple-200'  },
  { label: 'Pink',    cls: 'bg-pink-100 dark:bg-pink-900/30',      swatch: 'bg-pink-200'    },
  { label: 'Neutral', cls: 'bg-neutral-100 dark:bg-neutral-700',   swatch: 'bg-neutral-300' },
];

/**
 * @param {{ rect: DOMRect|null, onWrap: (start:string, end:string)=>void }} props
 * rect — bounding box of the selection (viewport-relative); null = hidden.
 */
export function SelectionToolbar({ rect, onWrap }) {
  const ref = useRef(null);
  const [palette, setPalette] = useState(null); // 'text' | 'bg' | null

  // Position the toolbar above the selection after it mounts; starts offscreen so there is no
  // layout flash while offsetWidth/Height are being measured. Re-runs when palette opens (height
  // changes) so the toolbar doesn't shift out of view when a sub-palette row appears.
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
  }, [rect, palette]);

  if (!rect) return null;

  const paletteColors = palette === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS;

  return createPortal(
    <div
      ref={ref}
      role="toolbar"
      aria-label="Text formatting"
      style={{ position: 'fixed', top: -9999, left: -9999, opacity: 0 }}
      className="z-dropdown rounded-md bg-neutral-900 shadow-lg"
    >
      {/* Primary formatting buttons row */}
      <div className="flex items-center gap-0.5 px-1.5 py-1">
        {TOOLS.map(({ label, Icon, start, end }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onWrap(start, end); setPalette(null); }}
            className="rounded p-1.5 text-neutral-200 hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        ))}

        {/* Separator */}
        <span aria-hidden="true" className="w-px h-3.5 bg-neutral-700 mx-0.5 flex-shrink-0" />

        {/* Text color toggle */}
        <button
          type="button"
          title="Text color"
          aria-label="Text color"
          aria-haspopup="true"
          aria-expanded={palette === 'text'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPalette((p) => (p === 'text' ? null : 'text'))}
          className="rounded p-1.5 text-neutral-200 hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Type aria-hidden="true" className="h-3.5 w-3.5" />
        </button>

        {/* Highlight toggle */}
        <button
          type="button"
          title="Highlight"
          aria-label="Highlight color"
          aria-haspopup="true"
          aria-expanded={palette === 'bg'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPalette((p) => (p === 'bg' ? null : 'bg'))}
          className="rounded p-1.5 text-neutral-200 hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Highlighter aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* KR-005: color/highlight palette sub-row */}
      {palette && (
        <div
          role="group"
          aria-label={palette === 'text' ? 'Text color palette' : 'Highlight color palette'}
          className="flex items-center gap-1 px-1.5 pb-1.5"
        >
          {paletteColors.map(({ label, cls, swatch }) => (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={`${palette === 'text' ? 'Text' : 'Highlight'}: ${label}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onWrap(`<span class="${cls}">`, '</span>');
                setPalette(null);
              }}
              className={`h-4 w-4 rounded-sm ${swatch} ring-1 ring-white/10 hover:ring-2 hover:ring-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
