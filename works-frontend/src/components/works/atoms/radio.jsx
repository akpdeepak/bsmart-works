import * as React from 'react';
import { cn } from '@/lib/utils';

// Atom — radio button with optional label + RadioGroup context for controlled groups.
// Native <input type="radio"> is overlaid on the styled visual; the RadioGroup wrapper
// manages the selected value and propagates onChange.

const RadioGroupContext = React.createContext(null);

export function RadioGroup({ value, defaultValue, onChange, name, children, className, ...props }) {
  const uid = React.useId();
  const groupName = name || uid;
  const [internal, setInternal] = React.useState(defaultValue ?? '');
  const selected = value !== undefined ? value : internal;

  const handleChange = React.useCallback((v) => {
    if (value === undefined) setInternal(v);
    onChange?.(v);
  }, [value, onChange]);

  return (
    <RadioGroupContext.Provider value={{ selected, onChange: handleChange, name: groupName }}>
      <div role="radiogroup" className={cn('flex flex-col gap-2', className)} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export const Radio = React.forwardRef(
  ({ className, value, disabled, invalid, id: propId, children, onChange: propOnChange, checked: propChecked, ...props }, ref) => {
    const uid = React.useId();
    const id = propId || uid;
    const ctx = React.useContext(RadioGroupContext);

    const isChecked = ctx ? ctx.selected === value : propChecked;
    const name = ctx?.name;
    const handleChange = (e) => {
      ctx?.onChange(value);
      propOnChange?.(e);
    };

    const dotClass = cn(
      'pointer-events-none flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors duration-fast',
      invalid ? 'border-semantic-danger' : 'border-neutral-300 dark:border-neutral-600',
      isChecked && !invalid && 'border-brand-navy',
      isChecked && invalid && 'border-semantic-danger',
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
            ref={ref}
            id={id}
            type="radio"
            value={value}
            name={name}
            checked={isChecked}
            onChange={handleChange}
            disabled={disabled}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            {...props}
          />
          <span className={dotClass}>
            {isChecked && (
              <span className={cn(
                'h-2 w-2 rounded-full',
                invalid ? 'bg-semantic-danger' : 'bg-brand-navy'
              )} aria-hidden="true" />
            )}
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
Radio.displayName = 'Radio';
