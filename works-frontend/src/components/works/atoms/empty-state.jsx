import { isIconComponent } from '@/lib/utils';

// Empty-state primitive (RB-30 §6): explains why a surface is empty and what to do next. `icon`
// accepts a Lucide component, an already-created element, or a string; `action` is an optional CTA
// node. The illustration uses the neutral-300 placeholder tone, which is the one sanctioned use of
// neutral-300 (RB-30 §2/§6).
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-10 w-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-300 mb-4">
        {isIconComponent(Icon) ? <Icon aria-hidden="true" className="h-5 w-5" /> : Icon}
      </div>
      <h3 className="text-base font-semibold text-neutral-700 mb-1">{title}</h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5 max-w-xs">{subtitle}</p>
      {action}
    </div>
  );
}
