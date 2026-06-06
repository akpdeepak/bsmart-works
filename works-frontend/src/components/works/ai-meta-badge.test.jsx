import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiMetaBadge } from './ai-meta-badge';

describe('AiMetaBadge', () => {
  it('renders nothing without meta', () => {
    const { container } = render(<AiMetaBadge meta={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels a deterministic fallback', () => {
    render(<AiMetaBadge meta={{ fallback: true }} />);
    expect(screen.getByText('Deterministic fallback')).toBeInTheDocument();
  });

  it('labels a cached AI response with its tier', () => {
    render(<AiMetaBadge meta={{ cacheHit: true, tier: 'haiku' }} />);
    expect(screen.getByText('AI · cached (haiku)')).toBeInTheDocument();
  });

  it('flags a degraded policy state and shows the narrative', () => {
    render(<AiMetaBadge meta={{ tier: 'sonnet', policyState: 'DEGRADED' }} narrative="Budget at 85%" />);
    expect(screen.getByText('AI · sonnet (degraded)')).toBeInTheDocument();
    expect(screen.getByText('Budget at 85%')).toBeInTheDocument();
  });
});
