import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, Layers, Bug, Shuffle, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/works/button';
import { useWorkspaceSetup } from '@/hooks/queries/useWorkspaceSetup';
import { workspaceSetupKeys } from '@/hooks/queries/keys';
import { configClient } from '@/lib/customization';
import { cn } from '@/lib/utils';

// ── Template card data ────────────────────────────────────────────────────────

const TEMPLATE_META = {
  'TPL-ONBOARD-SCRUM': {
    icon: Layers,
    color: 'text-brand-navy',
    bg: 'bg-brand-navy/10',
    tagline: 'Sprint-based delivery with backlogs, stories and velocity tracking.',
  },
  'TPL-ONBOARD-KANBAN': {
    icon: Shuffle,
    color: 'text-semantic-success',
    bg: 'bg-semantic-success/10',
    tagline: 'Continuous-flow board — cards move at their own pace with no sprint pressure.',
  },
  'TPL-ONBOARD-BUG': {
    icon: Bug,
    color: 'text-semantic-danger',
    bg: 'bg-semantic-danger/10',
    tagline: 'Defect lifecycle — triage, reproduce, fix and verify bugs end to end.',
  },
  'TPL-ONBOARD-RAID': {
    icon: AlertTriangle,
    color: 'text-semantic-warning',
    bg: 'bg-semantic-warning/10',
    tagline: 'RAID log — track risks, assumptions, issues and dependencies.',
  },
};

// ── Step progress dots ────────────────────────────────────────────────────────

function Steps({ current, total }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-base',
            i < current ? 'w-6 bg-brand-navy' : i === current ? 'w-6 bg-brand-orange' : 'w-3 bg-neutral-200',
          )}
        />
      ))}
    </div>
  );
}

// ── Step 1: Choose a workflow template ────────────────────────────────────────

function ChooseTemplate({ templates, onSelect, applying, selected }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Pick a workflow that matches how your team works. You can change it any time from Settings.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => {
          const meta = TEMPLATE_META[t.id] ?? {};
          const Icon = meta.icon ?? Layers;
          const isSelected = selected === t.id;
          return (
            <li key={t.id} className="relative">
              {/* eslint-disable-next-line works-view/no-raw-button -- card-button pattern: full-card interactive affordance, no Button variant fits */}
              <button
                type="button"
                disabled={applying}
                onClick={() => onSelect(t.id)}
                aria-pressed={isSelected}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-all duration-fast',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
                  'hover:border-brand-navy/40 active:translate-y-px disabled:opacity-50',
                  isSelected
                    ? 'border-brand-navy bg-brand-navy/5 ring-1 ring-brand-navy'
                    : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800',
                )}
              >
                <span className="flex items-start gap-3">
                  <span className={cn('mt-0.5 rounded-lg p-2', meta.bg ?? 'bg-neutral-100')}>
                    <Icon className={cn('h-4 w-4', meta.color ?? 'text-neutral-600')} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {t.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-500">
                      {meta.tagline ?? t.description}
                    </span>
                  </span>
                </span>
              </button>
              {isSelected && (
                <CheckCircle2
                  className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-brand-navy"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Step 2: Completeness checklist ────────────────────────────────────────────

function ChecklistStep({ steps, score, onCreateItem, onInvite, onDone }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="-rotate-90 h-14 w-14" aria-hidden="true">
            <circle cx="18" cy="18" r="15.9" fill="none" pathLength="100"
              className="stroke-neutral-100 dark:stroke-neutral-700" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" pathLength="100"
              className="stroke-brand-orange" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${score} 100`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{score}%</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Setup {score === 100 ? 'complete!' : 'in progress'}
          </p>
          <p className="text-xs text-neutral-500">
            Complete these steps to get the most out of bSmart Works.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id}
            className={cn(
              'flex items-center justify-between rounded-lg border px-4 py-3 text-sm',
              step.done
                ? 'border-semantic-success/30 bg-semantic-success/5'
                : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800',
            )}
          >
            <span className="flex items-center gap-3">
              <CheckCircle2 className={cn('h-4 w-4 flex-shrink-0',
                step.done ? 'text-semantic-success' : 'text-neutral-300')}
                aria-hidden="true" />
              <span className={step.done ? 'text-neutral-500 line-through' : 'text-neutral-900 dark:text-neutral-100'}>
                {step.label}
              </span>
            </span>
            {!step.done && step.id === 'first_item' && (
              <Button variant="link" size="sm" rightIcon={ChevronRight} onClick={onCreateItem}>
                Create
              </Button>
            )}
            {!step.done && step.id === 'teammate' && (
              <Button variant="link" size="sm" rightIcon={ChevronRight} onClick={onInvite}>
                Invite
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Button
        variant={score === 100 ? 'action' : 'secondary'}
        fullWidth
        onClick={onDone}
      >
        {score === 100 ? 'Get started →' : 'Skip for now'}
      </Button>
    </div>
  );
}

// ── Root wizard ───────────────────────────────────────────────────────────────

/**
 * First-run onboarding wizard (WI-12).
 *
 * Rendered as a centered modal overlay when a new workspace member's setup status
 * has needsWizard = true. The wizard guides through: (1) choose a workflow template,
 * (2) completeness checklist (create first item, invite teammate).
 *
 * Props:
 *   workspaceId  — the active workspace
 *   onDone       — called when the user finishes or skips the wizard
 *   onCreateItem — called when user clicks "Create" in the checklist
 *   onInvite     — called when user clicks "Invite" in the checklist
 */
export default function OnboardingWizard({ workspaceId, onDone, onCreateItem, onInvite }) {
  const { data: setup } = useWorkspaceSetup(workspaceId);
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [applying, setApplying] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  if (!setup?.needsWizard) return null;

  const templates = setup.templates ?? [];
  const steps     = setup.steps ?? [];
  const score     = setup.score ?? 0;

  async function handleTemplateSelect(templateId) {
    setSelected(templateId);
    setError(null);
    setApplying(true);
    try {
      await configClient.applyTemplate(workspaceId, templateId);
      await queryClient.invalidateQueries({ queryKey: workspaceSetupKeys.status(workspaceId) });
      setStep(1);
    } catch {
      setError('Could not apply the template — please try again.');
    } finally {
      setApplying(false);
    }
  }

  const TITLES = ['Choose your workflow', 'Set up your workspace'];
  const TOTAL  = TITLES.length;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-neutral-900/60 p-4"
      role="dialog" aria-modal="true" aria-labelledby="wizard-title">
      {/* eslint-disable-next-line works-view/no-inline-card-chrome, works-view/sanctioned-page-widths */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-neutral-900">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-5 dark:border-neutral-700">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Getting started
            </p>
            <h2 id="wizard-title" className="text-xl font-bold text-brand-navy dark:text-white">
              {TITLES[step]}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onDone} aria-label="Close setup wizard">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {step === 0 && (
            <ChooseTemplate
              templates={templates}
              selected={selected}
              applying={applying}
              onSelect={handleTemplateSelect}
            />
          )}
          {step === 1 && (
            <ChecklistStep
              steps={steps}
              score={score}
              onCreateItem={onCreateItem}
              onInvite={onInvite}
              onDone={onDone}
            />
          )}
          {error && (
            <p role="alert" className="mt-3 text-xs text-semantic-danger">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-4 dark:border-neutral-700">
          <Steps current={step} total={TOTAL} />
          {step === 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              Skip template
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
