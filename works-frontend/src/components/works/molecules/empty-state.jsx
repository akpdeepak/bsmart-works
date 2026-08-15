import { Inbox } from 'lucide-react';
import { Button } from '@/components/works/button';

export function EmptyState({ 
  icon: Icon = Inbox, 
  title = 'No items found', 
  description = 'There is nothing to display here right now.', 
  actionLabel, 
  onAction 
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 border-dashed bg-white/50 p-12 text-center animate-fade-in-up">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy-tint/10">
        <Icon className="h-8 w-8 text-brand-navy-tint" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}
