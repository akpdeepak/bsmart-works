import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleBadge } from './role-badge';

// RoleBadge's domain prop is named `role` (the workspace role key), which collides with the ARIA
// `role` attribute name — passing it as a literal JSX attribute trips jsx-a11y/aria-role even though
// this is a component prop, not a DOM role. Spreading the props avoids the false positive without
// changing the component API (the unified <Badge> work, A4, will revisit this naming).
function renderBadge(props) {
  return render(<RoleBadge {...props} />);
}

describe('RoleBadge', () => {
  it('renders a known role label', () => {
    renderBadge({ role: 'ADMIN' });
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('resolves by tier when role is unknown', () => {
    renderBadge({ role: '???', tier: 5 });
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it('falls back to Member when nothing matches', () => {
    renderBadge({ role: '???' });
    expect(screen.getByText('Member')).toBeInTheDocument();
  });
});
