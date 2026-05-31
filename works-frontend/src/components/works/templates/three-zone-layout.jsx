import { cn } from '@/lib/utils';

// Template — the mandatory three-zone shell (CLAUDE.md §4.6). It owns structure only: no
// business logic, no data. Compose pages by passing the zones in:
//
//   <ThreeZoneLayout
//     sidebar={<SidebarNav collapsed={railOnly} />}
//     header={<PageHeader title="Sprints" actions={<Button>New</Button>} />}
//     panel={<WorkItemDetail item={selected} />}
//     panelOpen={Boolean(selected)}
//     onPanelClose={() => setSelected(null)}
//   >
//     <WorkItemList ... />
//   </ThreeZoneLayout>
//
// Zones: navy sidebar (collapses to an icon rail via `sidebarCollapsed`), neutral-50 main with
// an optional sticky header and a single scroll container, and a right contextual panel that
// OVERLAYS the content (never reflows it) and slides in/out. Tokens only: w-sidebar / w-panel
// and the z-index scale come from tailwind.config.js (§4.6, §4.21).
export function ThreeZoneLayout({
  sidebar,
  sidebarCollapsed = false,
  header,
  children,
  panel,
  panelOpen = false,
  onPanelClose,
  className,
}) {
  return (
    <div className={cn('flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-900', className)}>
      {sidebar && (
        <aside
          className={cn(
            'shrink-0 overflow-y-auto bg-brand-navy text-white transition-[width] duration-200 ease-out',
            sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
          )}
        >
          {sidebar}
        </aside>
      )}

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {header && (
          <div className="sticky top-0 z-sticky border-b border-neutral-200 bg-neutral-50/95 px-6 py-3 backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95">
            {header}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </main>

      {panel && (
        <>
          {/* click-catcher so clicking outside closes the panel without dimming content */}
          {panelOpen && onPanelClose && (
            <button
              type="button"
              aria-label="Close panel"
              onClick={onPanelClose}
              className="absolute inset-0 z-panel cursor-default bg-transparent"
            />
          )}
          <aside
            aria-hidden={!panelOpen}
            inert={!panelOpen ? true : undefined}
            className={cn(
              'absolute right-0 top-0 z-panel h-full w-panel border-l border-neutral-200 bg-white shadow-lg transition-transform duration-200 ease-out dark:border-neutral-700 dark:bg-neutral-800',
              panelOpen ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            {panel}
          </aside>
        </>
      )}
    </div>
  );
}
