import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Molecule — label + field slot + helper text + inline error (CLAUDE.md §4.11, §4.17).
// Stateless: pass `error` to trigger the danger state; `helpText` shows when no error.
// Usage:
//   <FormField id="title" label="Title" error={errors.title} required helpText="Max 200 chars">
//     <Input id="title" invalid={!!errors.title} />
//   </FormField>
export function FormField({ id, label, error, helpText, required, className, children }) {
  const descId = React.useId();
  const hasDesc = Boolean(error || helpText);

  const childWithDesc = React.isValidElement(children)
    ? React.cloneElement(children, {
        'aria-describedby': hasDesc ? descId : undefined,
        ...(error && !children.props['aria-invalid'] ? { 'aria-invalid': true } : {}),
      })
    : children;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-semibold text-neutral-700 dark:text-neutral-200"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-1 text-semantic-danger">
              *
            </span>
          )}
        </label>
      )}

      {childWithDesc}

      {hasDesc && (
        <p
          id={descId}
          className={cn(
            'flex items-center gap-1 text-xs',
            error ? 'text-semantic-danger' : 'text-neutral-600 dark:text-neutral-400'
          )}
        >
          {error && <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
          {error || helpText}
        </p>
      )}
    </div>
  );
}
