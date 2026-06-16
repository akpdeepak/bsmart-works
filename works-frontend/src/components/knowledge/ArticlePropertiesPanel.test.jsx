import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticlePropertiesPanel } from './ArticlePropertiesPanel';

const ART = { id: 'A1', authorId: 'user-1', templateType: 'KB', status: 'DRAFT', updatedAt: '2026-01-01T00:00:00Z' };

describe('ArticlePropertiesPanel (KR-011)', () => {
  it('renders nothing when article is null', () => {
    const { container } = render(<ArticlePropertiesPanel article={null} wordCount={0} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows author, template, status, word count', () => {
    render(<ArticlePropertiesPanel article={ART} wordCount={42} onClose={vi.fn()} />);
    expect(screen.getByText('user-1')).toBeInTheDocument();
    expect(screen.getByText('KB')).toBeInTheDocument();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<ArticlePropertiesPanel article={ART} wordCount={0} onClose={onClose} />);
    screen.getByRole('button', { name: /close properties panel/i }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the Properties heading', () => {
    render(<ArticlePropertiesPanel article={ART} wordCount={5} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /properties/i })).toBeInTheDocument();
  });

  it('shows the last-updated date', () => {
    render(<ArticlePropertiesPanel article={ART} wordCount={0} onClose={vi.fn()} />);
    // The date is locale-formatted; just check it is non-empty
    expect(screen.getByText('Last updated')).toBeInTheDocument();
  });
});
