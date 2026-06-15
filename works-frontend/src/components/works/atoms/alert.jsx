import * as React from 'react';
import { cva } from 'class-variance-authority';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Inline alert banner (RB-30 §6 — one of the five states: error/warning/success/info).
// Uses the same semantic tone vocabulary as semantic-* tokens. The dismiss button is
// optional; when provided the caller manages visibility (controlled) — the alert never
// hides itself. aria-live="polite" so dynamic insertions are announced (WCAG 4.1.3).
const alertVariants = cva(
  'relative flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
  {
    variants: {
      tone: {
        info:    'border-brand-navy-tint/30 bg-brand-navy-tint/5  text-brand-navy      dark:text-neutral-100',
        success: 'border-semantic-success/30  bg-semantic-success/5  text-semantic-success',
        warning: 'border-semantic-warning/30  bg-semantic-warning/5  text-semantic-warning',
        danger:  'border-semantic-danger/30   bg-semantic-danger/5   text-semantic-danger',
      },
    },
    defaultVariants: { tone: 'info' },
  }
);

const ICONS = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger:  AlertCircle,
};

export const Alert = React.forwardRef(
  ({ tone = 'info', title, children, onDismiss, className, ...props }, ref) => {
    const Icon = ICONS[tone] ?? Info;
    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn(alertVariants({ tone }), className)}
        {...props}
      >
        <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          {title && <p className="font-semibold mb-0.5">{title}</p>}
          {children && <div className="text-sm opacity-90">{children}</div>}
        </div>
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = 'Alert';
