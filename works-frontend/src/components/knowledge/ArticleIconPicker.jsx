// Article icon / emoji picker — KR-010 · P0.
// Displays a clickable icon slot beside the article title. Opens a popover with two tabs:
// a flat emoji grid (40 common emoji) and a small Lucide icon grid. "Clear" resets to the
// template-type default icon. RB-30 §7 minimal UX; WCAG 2.1 AA (all elements labelled).
import { useState, useRef, useEffect } from 'react';
import {
  BookOpen, Terminal, Scale, AlertTriangle, Users, Wrench, FileText,
  LayoutTemplate,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Default icon per article template type (Lucide component).
export const TEMPLATE_ICONS = {
  KB:               BookOpen,
  RUNBOOK:          Terminal,
  ADR:              Scale,
  POSTMORTEM:       AlertTriangle,
  ONBOARDING:       Users,
  TROUBLESHOOTING:  Wrench,
  CUSTOM:           FileText,
};

const LUCIDE_OPTIONS = [
  { key: 'lucide:FileText',    Icon: FileText },
  { key: 'lucide:BookOpen',    Icon: BookOpen },
  { key: 'lucide:Terminal',    Icon: Terminal },
  { key: 'lucide:Scale',       Icon: Scale },
  { key: 'lucide:AlertTriangle', Icon: AlertTriangle },
  { key: 'lucide:Users',       Icon: Users },
  { key: 'lucide:Wrench',      Icon: Wrench },
  { key: 'lucide:LayoutTemplate', Icon: LayoutTemplate },
];

const COMMON_EMOJI = [
  '📝','📄','📋','📌','📎','🔖','📚','📖',
  '💡','⭐','🔥','✅','❌','⚠️','🚀','🎯',
  '🛠️','🔧','🔍','💬','📊','📈','🗓️','🔔',
  '👥','🤝','💼','🏆','🎉','🧩','🧪','🌐',
  '☁️','🔒','🔑','📡','💾','🖥️','📱','⚡',
];

/**
 * @param {{ icon: string|null, templateType: string, onPick: (icon:string|null)=>void }} props
 */
export function ArticleIconPicker({ icon, templateType, onPick }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('emoji');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown); };
  }, [open]);

  const DefaultIcon = TEMPLATE_ICONS[templateType] || FileText;

  const renderSlot = () => {
    if (!icon) return <DefaultIcon aria-hidden="true" className="h-6 w-6 text-neutral-400" />;
    if (icon.startsWith('lucide:')) {
      const found = LUCIDE_OPTIONS.find((o) => o.key === icon);
      const Icon = found ? found.Icon : FileText;
      return <Icon aria-hidden="true" className="h-6 w-6 text-brand-navy dark:text-brand-orange" />;
    }
    return <span className="text-2xl leading-none" aria-hidden="true">{icon}</span>;
  };

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Article icon: ${icon || 'default'}. Click to change.`}
        title="Change article icon"
        className="flex items-center justify-center h-9 w-9 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 transition-colors"
      >
        {renderSlot()}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose article icon"
          className="absolute left-0 top-full mt-1 z-dropdown w-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3 space-y-2"
        >
          <div className="flex items-center gap-2" role="tablist">
            {[{ id: 'emoji', label: 'Emoji' }, { id: 'icons', label: 'Icons' }].map(({ id, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'text-xs font-semibold px-2.5 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
                  tab === id
                    ? 'bg-brand-navy text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                )}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { onPick(null); setOpen(false); }}
              className="ml-auto text-xs text-neutral-500 hover:text-semantic-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 rounded"
            >
              Clear
            </button>
          </div>

          {tab === 'emoji' && (
            <div role="tabpanel" aria-label="Emoji" className="grid grid-cols-8 gap-1">
              {COMMON_EMOJI.map((em) => (
                <button
                  key={em}
                  type="button"
                  aria-label={em}
                  onClick={() => { onPick(em); setOpen(false); }}
                  className={cn(
                    'h-8 w-8 text-xl rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
                    icon === em && 'ring-2 ring-brand-navy',
                  )}
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          {tab === 'icons' && (
            <div role="tabpanel" aria-label="Icons" className="grid grid-cols-4 gap-1">
              {LUCIDE_OPTIONS.map(({ key, Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key.replace('lucide:', '')}
                  onClick={() => { onPick(key); setOpen(false); }}
                  className={cn(
                    'h-10 w-full flex items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40',
                    icon === key && 'ring-2 ring-brand-navy text-brand-navy',
                  )}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
