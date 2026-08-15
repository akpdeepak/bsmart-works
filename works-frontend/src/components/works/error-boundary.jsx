import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/works/button';

// The last line of defense: a render error anywhere below shows a calm, on-brand fallback
// instead of a blank white screen (CLAUDE.md §6 error state — say what happened + what to do).
// Tokens + Lucide only. No stack trace or PII is shown to the user (RB-40); diagnostics go to
// the console for developers. Must be a class — only class components can be error boundaries.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-900"
      >
        <div className="glass-card flex max-w-md flex-col items-center gap-4 p-8 text-center animate-scale-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-semantic-danger-surface">
            <AlertTriangle aria-hidden="true" className="h-8 w-8 text-semantic-danger" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Something went wrong
            </h1>
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              An unexpected error interrupted this view. Your work is saved — reloading usually
              fixes it. If it keeps happening, contact your workspace admin.
            </p>
          </div>
          <div className="mt-2">
            <Button variant="primary" onClick={this.handleReload}>
              Reload Application
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
