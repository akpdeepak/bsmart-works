import * as React from 'react';
import { cn } from '@/lib/utils';

// Tooltip — shows a short label on hover/focus-visible with a 350ms delay.
// Wraps the trigger in a positioned container; the tooltip bubble floats above/below
// via the `side` prop. The trigger child gets aria-describedby pointing to the bubble
// so screen readers announce it. Works with keyboard focus (focus-visible) and mouse.
// z-dropdown ensures the tooltip sits above all inline content (RB-30 §9).
const SIDE = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full  left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full  top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({ content, side = 'top', delay = 350, children, className }) {
  const id = React.useId();
  const [visible, setVisible] = React.useState(false);
  const timer = React.useRef(null);

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setVisible(false);
  };

  React.useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {React.cloneElement(
        React.Children.only(children),
        { 'aria-describedby': visible ? id : undefined }
      )}
      {visible && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-dropdown whitespace-nowrap rounded-md',
            'bg-neutral-900 dark:bg-neutral-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm',
            SIDE[side] ?? SIDE.top
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
