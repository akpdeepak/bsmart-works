import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * useVirtualList — thin wrapper around @tanstack/react-virtual for fixed-height row lists.
 *
 * @param {object} opts
 * @param {number}   opts.count        — total number of rows
 * @param {number}   opts.estimateSize — estimated row height in px (default: 48)
 * @param {number}   [opts.overscan]   — rows to render outside viewport (default: 5)
 * @returns {{ parentRef, virtualRows, totalSize, measureElement }}
 *   parentRef: attach to the scroll container
 *   virtualRows: array of virtual row objects (index, start, size)
 *   totalSize: total height of the virtual list in px
 *   measureElement: attach to dynamic-height rows so the virtualizer can refine estimates
 */
export function useVirtualList({ count, estimateSize = 48, overscan = 5 }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return {
    parentRef,
    virtualRows: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    measureElement: virtualizer.measureElement,
  };
}
