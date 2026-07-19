import { Breadcrumb } from '@/components/works/atoms/breadcrumb';
import { breadcrumbTrail } from '@/lib/nav-model';
import { useI18n } from '@/lib/i18n';

// Persistent shell orientation. Individual views keep their own page headings; this compact band
// answers where the active surface lives without making every feature reconstruct the nav model.
export function ShellBreadcrumbs({ view, entityLabel }) {
  const { t } = useI18n();
  const items = breadcrumbTrail(view, entityLabel).map((item) => ({
    ...item,
    label: item.labelKey ? t(item.labelKey) : item.label,
  }));

  return (
    <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-700 dark:bg-neutral-900 md:px-6">
      <Breadcrumb items={items} />
    </div>
  );
}
