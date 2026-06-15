import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Atom — checkbox with optional label. Controlled (checked prop) or uncontrolled (defaultChecked).
// The native <input type="checkbox"> is positioned over the custom visual so it captures all
// pointer/keyboard events while the styled box responds to React-state changes (no peer-CSS tricks
// needed). aria-invalid wires the danger border + aria-invalid for screen readers.
export const Checkbox = React.forwardRef(
  ({ className, checked, defaultChecked, onChange, disabled, invalid, indeterminate, id: propId, children, ...props }, ref) => {
    const uid = React.useId();
    const id = propId || uid;
    const inputRef = React.useRef(null);
    const combinedRef = (node) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

    // Sync the native indeterminate property (not controllable via HTML attribute).
    React.useEffect(() => {
      if (inputRef.current) inputRef.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);

    const isChecked = checked !== undefined ? checked : undefined;
    const isVisuallyChecked = isChecked ?? defaultChecked ?? false;

    const boxClass = cn(
      'pointer-events-none flex h-4 w-4 items-center justify-center rounded border-2 transition-colors duration-fast',
      invalid
        ? 'border-semantic-danger'
        : 'border-neutral-300 dark:border-neutral-600',
      (isVisuallyChecked || indeterminate) && !invalid && 'border-brand-navy bg-brand-navy',
      (isVisuallyChecked || indeterminate) && invalid && 'border-semantic-danger bg-semantic-danger',
    );

    return (
      <label
        htmlFor={id}
        className={cn(
          'inline-flex items-start gap-2',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className
        )}
      >
        <span className="relative mt-0.5 h-4 w-4 shrink-0">
          <input
            ref={combinedRef}
            id={id}
            type="checkbox"
            checked={isChecked}
            defaultChecked={isChecked === undefined ? defaultChecked : undefined}
            onChange={onChange}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            {...props}
          />
          <span className={boxClass}>
            {indeterminate
              ? <Minus className="h-2.5 w-2.5 text-white" aria-hidden="true" />
              : isVisuallyChecked
                ? <Check className="h-2.5 w-2.5 text-white" aria-hidden="true" />
                : null}
          </span>
        </span>
        {children && (
          <span className="select-none text-sm leading-snug text-neutral-900 dark:text-neutral-100">
            {children}
          </span>
        )}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';
