import * as React from 'react';
import { cn } from '@/lib/utils';

// Popover — generic anchored overlay triggered by click.
// Closes on Escape, outside click, and blur-out. `side` controls which side of the trigger
// the panel opens on; `align` positions it along the cross-axis. Uses z-dropdown so it
// floats above inline content but below modals (RB-30 §9).
//
// Usage:
//   <Popover trigger={<Button>Open</Button>}>
//     <p>Popover content</p>
//   </Popover>
const SIDE_ALIGN = {
  'top-start':    'bottom-full left-0 mb-2',
  'top-end':      'bottom-full right-0 mb-2',
  'top-center':   'bottom-full left-1/2 -translate-x-1/2 mb-2',
  'bottom-start': 'top-full left-0 mt-2',
  'bottom-end':   'top-full right-0 mt-2',
  'bottom-center':'top-full left-1/2 -translate-x-1/2 mt-2',
};

export function Popover({
  trigger,
  children,
  side = 'bottom',
  align = 'start',
  className,
  contentClassName,
}) {
  const key = `${side}-${align}`;
  const posClass = SIDE_ALIGN[key] ?? SIDE_ALIGN['bottom-start'];
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const contentId = React.useId();

  const toggle = () => setOpen((o) => !o);
  const close = () => setOpen(false);

  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      {React.cloneElement(React.Children.only(trigger), {
        onClick: toggle,
        'aria-expanded': open,
        'aria-haspopup': 'dialog',
        'aria-controls': open ? contentId : undefined,
      })}
      {open && (
        <div
          id={contentId}
          role="dialog"
          aria-modal="false"
          className={cn(
            'absolute z-dropdown min-w-48 rounded-xl border border-neutral-200 dark:border-neutral-700',
            'bg-white dark:bg-neutral-800 shadow-xl',
            posClass,
            contentClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
