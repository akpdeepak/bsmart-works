import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VirtualCardStack } from './virtual-card-stack';
import { estimateCardHeight } from '@/lib/card-virtualization';
import { useVirtualList } from '@/hooks/use-virtual-list';

vi.mock('@/hooks/use-virtual-list', () => ({
  useVirtualList: vi.fn(({ count, estimateSize }) => ({
    parentRef: { current: null },
    virtualRows: Array.from({ length: Math.min(count, 3) }, (_, index) => ({
      index,
      start: index * estimateSize,
      size: estimateSize,
    })),
    totalSize: count * estimateSize,
    measureElement: vi.fn(),
  })),
}));

const items = (count) => Array.from({ length: count }, (_, index) => ({
  id: `WI-${index}`,
  title: `Work item ${index}`,
}));

describe('VirtualCardStack', () => {
  it('renders a normal stack below the virtualization threshold', () => {
    render(
      <VirtualCardStack
        items={items(2)}
        renderItem={(item) => <article>{item.title}</article>}
      />,
    );

    expect(screen.getByText('Work item 0')).toBeInTheDocument();
    expect(screen.getByText('Work item 1')).toBeInTheDocument();
    expect(document.querySelector('[data-virtualized="false"]')).toBeInTheDocument();
  });

  it('renders only virtual rows for large stacks', () => {
    render(
      <VirtualCardStack
        items={items(120)}
        renderItem={(item) => <article>{item.title}</article>}
      />,
    );

    expect(document.querySelector('[data-virtualized-card-stack]')).toBeInTheDocument();
    expect(screen.getByText('Work item 0')).toBeInTheDocument();
    expect(screen.getByText('Work item 2')).toBeInTheDocument();
    expect(screen.queryByText('Work item 119')).not.toBeInTheDocument();
    expect(useVirtualList).toHaveBeenCalledWith(expect.objectContaining({ count: 120 }));
  });

  it('uses stable density estimates', () => {
    expect(estimateCardHeight('compact')).toBeLessThan(estimateCardHeight('comfortable'));
    expect(estimateCardHeight('spacious')).toBeGreaterThan(estimateCardHeight('comfortable'));
    expect(estimateCardHeight('unknown')).toBe(estimateCardHeight('comfortable'));
  });
});
