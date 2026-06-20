import { PageHeader } from '@/components/works/atoms/page-header';
import { cn } from '@/lib/utils';

// Template — the mandatory content wrapper for every view surface (RB-30 §4, A-WS2).
// Composes PageHeader + content zone with:
//   • two sanctioned widths: "dashboard" max-w-workspace · "reading" max-w-reading
//   • one canonical padding rhythm: px-6 py-6 md:px-8
//
// Usage:
//   <PageLayout title="Sprint Cockpit" width="dashboard" actions={<Button>New item</Button>}>
//     {/* list, board, tabs, etc. */}
//   </PageLayout>
//
// Props:
//   title / description / breadcrumb / actions  — forwarded to PageHeader
//   header   — node; replaces PageHeader entirely (pass null to render no header at all)
//   width    — "dashboard" (default) | "reading"
//   noPadding — true for full-bleed surfaces (e.g. Board) that manage their own edge spacing
//   className — merged onto the outer wrapper (the width-constrained div)

const WIDTHS = {
  dashboard: 'max-w-workspace',
  reading: 'max-w-reading',
};

export function PageLayout({
  title,
  description,
  breadcrumb,
  actions,
  header,
  width = 'dashboard',
  noPadding = false,
  className,
  children,
  ...props
}) {
  const headerNode = header !== undefined
    ? header
    : title != null && (
        <PageHeader
          title={title}
          description={description}
          breadcrumb={breadcrumb}
          actions={actions}
        />
      );

  return (
    <div
      className={cn(
        'mx-auto w-full overflow-x-hidden',
        WIDTHS[width] ?? WIDTHS.dashboard,
        !noPadding && 'px-6 py-6 md:px-8',
        className
      )}
      {...props}
    >
      {headerNode}
      {children}
    </div>
  );
}
