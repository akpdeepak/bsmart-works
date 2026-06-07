import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShortcutsHelp } from './shortcuts-help';

describe('ShortcutsHelp', () => {
  it('lists shortcuts grouped, with formatted bindings', () => {
    render(<ShortcutsHelp onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    expect(screen.getByText('Open command palette')).toBeInTheDocument();
    expect(screen.getByText('Navigate')).toBeInTheDocument();
    // a sequence binding is rendered as "G then B"
    expect(screen.getByText('G then B')).toBeInTheDocument();
  });

  it('marks a user-customized binding', () => {
    render(<ShortcutsHelp onClose={vi.fn()} overrides={{ 'create-item': 'n' }} />);
    expect(screen.getByText('(custom)')).toBeInTheDocument();
  });
});
