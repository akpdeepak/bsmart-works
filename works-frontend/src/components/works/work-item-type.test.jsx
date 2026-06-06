import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypeBadge, TypeIcon } from './work-item-type';
import { resolveTypeIcon, TYPES } from '@/lib/work-item-types';

describe('TypeBadge', () => {
  it('renders the type label and a decorative icon', () => {
    const { container } = render(<TypeBadge type="Bug" />);
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('omits the icon in compact mode', () => {
    const { container } = render(<TypeBadge type="Task" compact />);
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('falls back to the Task style for an unknown type', () => {
    const { container } = render(<TypeBadge type="Mystery" />);
    expect(screen.getByText('Mystery')).toBeInTheDocument();
    expect(container.querySelector('span').className).toContain(TYPES.Task.color);
  });
});

describe('resolveTypeIcon', () => {
  it('maps a legacy emoji to a Lucide component', () => {
    expect(resolveTypeIcon('🐛')).toBe(resolveTypeIcon('bug'));
  });

  it('returns a default for empty input and null for unknown keys', () => {
    expect(resolveTypeIcon('')).toBeTruthy();
    expect(resolveTypeIcon('not-a-key')).toBeNull();
  });
});

describe('TypeIcon', () => {
  it('renders an svg for a known key and a text fallback for an unknown one', () => {
    const known = render(<TypeIcon value="rocket" />);
    expect(known.container.querySelector('svg')).toBeInTheDocument();
    const unknown = render(<TypeIcon value="???" />);
    expect(unknown.getByText('???')).toBeInTheDocument();
  });
});
