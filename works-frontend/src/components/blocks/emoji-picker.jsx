// Know Studio — lightweight emoji / sticker picker. Dependency-free (a curated unicode set, no emoji
// library), so it stays small and offline. Used by the sticker block, whiteboard notes, and anywhere
// the editor wants a quick visual accent. Keyboard-operable popover, token styling (RB-30 §6).

import { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EMOJI_GROUPS } from '@/lib/block-kit';

export function EmojiPicker({ onPick, triggerLabel = 'Pick emoji', buttonClassName }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onClick);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onClick); };
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={triggerLabel}
        className={cn('inline-flex items-center justify-center text-neutral-500 hover:text-brand-navy rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40', buttonClassName)}
      >
        <Smile aria-hidden="true" className="h-4 w-4" />
      </button>
      {open && (
        <div role="dialog" aria-label="Emoji picker" className="absolute left-0 top-7 z-dropdown w-64 max-h-64 overflow-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-2">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.name} className="mb-1.5">
              <p className="text-2xs uppercase tracking-wide font-semibold text-neutral-400 px-1 mb-1">{group.name}</p>
              <div className="grid grid-cols-6 gap-0.5">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => { onPick(emoji); setOpen(false); }}
                    aria-label={`Emoji ${emoji}`}
                    className="h-8 w-8 flex items-center justify-center text-lg rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
