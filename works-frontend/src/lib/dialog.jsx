// bSmart Works — in-app dialog runtime. Replaces the browser-native window.alert / confirm /
// prompt (which can't be styled and break the design system, RB-30) with the canonical Modal
// molecule, so confirmations and quick text captures look and behave like the rest of the app:
// brand tokens, dark mode, focus trap, Escape/backdrop to cancel, and WCAG-AA labelling.
//
// Promise-based, so call sites stay almost identical to the native ones:
//   const { confirm, prompt, alert } = useDialog();
//   if (!(await confirm({ title, message, confirmLabel: 'Delete', variant: 'danger' }))) return;
//   const name = await prompt({ title: 'New dashboard', label: 'Dashboard name' });
//   if (!name) return;                       // null when cancelled, like window.prompt
//
// confirm → resolves true/false · prompt → resolves the string, or null when cancelled ·
// alert → resolves when dismissed. A bare string arg is accepted as the message/label.

import * as React from 'react';
import { Modal } from '@/components/works/molecules/modal';
import { Button } from '@/components/works/button';
import { Input } from '@/components/works/atoms/input';
import { FormField } from '@/components/works/molecules/form-field';
import { cn } from '@/lib/utils';

const DialogContext = React.createContext(null);

function normalize(kind, arg) {
  if (typeof arg === 'string') return kind === 'prompt' ? { label: arg } : { message: arg };
  return arg || {};
}

export function DialogProvider({ children }) {
  const [request, setRequest] = React.useState(null); // { kind, options, resolve }

  const close = React.useCallback((result) => {
    setRequest((cur) => {
      cur?.resolve(result);
      return null;
    });
  }, []);

  const open = React.useCallback(
    (kind, arg) =>
      new Promise((resolve) => {
        setRequest({ kind, options: normalize(kind, arg), resolve });
      }),
    []
  );

  const api = React.useMemo(
    () => ({
      confirm: (arg) => open('confirm', arg),
      prompt: (arg) => open('prompt', arg),
      alert: (arg) => open('alert', arg),
    }),
    [open]
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      {request && (
        <DialogHost key={request.kind + (request.options.title || '')} request={request} onClose={close} />
      )}
    </DialogContext.Provider>
  );
}

function DialogHost({ request, onClose }) {
  const { kind, options } = request;
  const isPrompt = kind === 'prompt';
  const isAlert = kind === 'alert';

  const [value, setValue] = React.useState(isPrompt ? options.defaultValue ?? '' : '');
  const inputRef = React.useRef(null);
  const fieldId = React.useId();

  // Cancelling (Cancel button, Escape, backdrop) resolves like the native call it replaces:
  // null for prompt, false for confirm, undefined for alert. Memoised so the identity passed to
  // Modal's onClose stays stable across keystrokes — otherwise Modal's focus effect re-runs on
  // every render and steals focus back out of the input.
  const cancelResult = isPrompt ? null : isAlert ? undefined : false;
  const handleCancel = React.useCallback(() => onClose(cancelResult), [onClose, cancelResult]);

  const required = isPrompt && options.required !== false;
  const trimmed = value.trim();
  const blocked = required && !trimmed;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isPrompt) {
      if (blocked) {
        inputRef.current?.focus();
        return;
      }
      onClose(value);
    } else {
      onClose(isAlert ? undefined : true);
    }
  };

  const title =
    options.title || (isPrompt ? 'Enter a value' : isAlert ? 'Notice' : 'Are you sure?');
  const confirmLabel = options.confirmLabel || (isPrompt ? 'Save' : isAlert ? 'OK' : 'Confirm');
  const confirmVariant = ['danger', 'action', 'primary', 'secondary'].includes(options.variant)
    ? options.variant
    : 'primary';

  return (
    <Modal
      title={title}
      onClose={handleCancel}
      size={options.size || 'sm'}
      initialFocus={isPrompt ? inputRef : undefined}
    >
      <form onSubmit={handleSubmit}>
        {options.message && (
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {options.message}
          </p>
        )}

        {isPrompt && (
          <FormField
            id={fieldId}
            label={options.label}
            helpText={options.helpText}
            required={required}
            className={cn(options.message && 'mt-4')}
          >
            <Input
              ref={inputRef}
              id={fieldId}
              type={options.inputType || 'text'}
              value={value}
              placeholder={options.placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
          </FormField>
        )}

        <div className="mt-6 flex justify-end gap-3">
          {!isAlert && (
            <Button type="button" variant="secondary" onClick={handleCancel}>
              {options.cancelLabel || 'Cancel'}
            </Button>
          )}
          <Button type="submit" variant={confirmVariant} disabled={blocked}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Safe default so components still render (and don't crash) outside a provider — e.g. isolated
// component tests. Mirrors useI18n's fallback. confirm→false, prompt→null, alert→resolved.
const FALLBACK = {
  confirm: () => Promise.resolve(false),
  prompt: () => Promise.resolve(null),
  alert: () => Promise.resolve(),
};

// eslint-disable-next-line react-refresh/only-export-components
export function useDialog() {
  return React.useContext(DialogContext) || FALLBACK;
}
