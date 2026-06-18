import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/works/button';
import { IconButton } from '@/components/works/atoms/icon-button';
import { completeTour, isTourCompleted } from '@/lib/first-use-tour';

export function FirstUseTour({ tourId, title, steps = [], onDone }) {
  if (!tourId || isTourCompleted(tourId) || steps.length === 0) return null;

  const finish = () => {
    completeTour(tourId);
    onDone?.();
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800" aria-label={`${title} tour`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-subheading text-neutral-900 dark:text-neutral-100">{title}</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">A quick orientation for this workspace.</p>
        </div>
        <IconButton aria-label="Dismiss tour" size="xs" onClick={finish}>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </IconButton>
      </div>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={step.id ?? step.title} className="flex gap-2 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-navy text-2xs font-bold text-white">{index + 1}</span>
            <span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{step.title}</span>
              {step.body && <span className="block text-neutral-600 dark:text-neutral-400">{step.body}</span>}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex justify-end">
        <Button type="button" variant="action" size="sm" onClick={finish}>
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Got it
        </Button>
      </div>
    </section>
  );
}
