import { Modal } from '@/components/works/molecules/modal';
import { Button } from '@/components/works/button';

// Molecule — confirmation dialog. Thin wrapper over Modal that adds a standard two-button
// footer (confirm + cancel) and a danger variant for destructive actions. The modal's built-in
// focus-trap, Escape, backdrop-click-to-close, and aria wiring are inherited for free.
// loading: disables both buttons and shows a spinner on the confirm action while the async
// operation is in flight (prevents double-submit without hiding the dialog).

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  size = 'sm',
}) {
  if (!open) return null;

  return (
    <Modal title={title} onClose={onClose} size={size}>
      {message && (
        <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-6">{message}</p>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
          disabled={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
