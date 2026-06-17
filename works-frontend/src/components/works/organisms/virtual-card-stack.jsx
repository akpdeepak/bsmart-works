import { Fragment, useMemo } from 'react';
import { useVirtualList } from '@/hooks/use-virtual-list';
import { estimateCardHeight } from '@/lib/card-virtualization';
import { cn } from '@/lib/utils';

export function VirtualCardStack({
  items,
  density = 'comfortable',
  renderItem,
  getKey = (item) => item.id,
  emptyState = null,
  className,
  virtualizeAt = 50,
  overscan = 8,
  'aria-label': ariaLabel = 'Virtualized cards',
}) {
  const shouldVirtualize = items.length >= virtualizeAt;
  const estimateSize = useMemo(() => estimateCardHeight(density), [density]);
  const { parentRef, virtualRows, totalSize, measureElement } = useVirtualList({
    count: shouldVirtualize ? items.length : 0,
    estimateSize,
    overscan,
  });

  if (items.length === 0) return emptyState;

  if (!shouldVirtualize) {
    return (
      <div className={cn('space-y-2 flex-1', className)} data-virtualized="false">
        {items.map((item, index) => (
          <Fragment key={getKey(item)}>{renderItem(item, index)}</Fragment>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('flex-1 min-h-48 overflow-y-auto pr-1', className)}
      data-virtualized="true"
      data-virtualized-card-stack
      aria-label={ariaLabel}
      role="list"
      style={{ maxHeight: 'min(68vh, 720px)' }}
    >
      <div className="relative w-full" style={{ height: `${totalSize}px` }}>
        {virtualRows.map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;
          return (
            <div
              key={getKey(item)}
              ref={measureElement}
              data-index={virtualRow.index}
              role="listitem"
              className="absolute left-0 top-0 w-full pb-2"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
