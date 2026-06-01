import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>In Progress</Badge>);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('applies neutral tone classes by default', () => {
    const { container } = render(<Badge>3</Badge>);
    expect(container.firstChild).toHaveClass('bg-neutral-200');
    expect(container.firstChild).toHaveClass('text-neutral-700');
  });

  it('applies danger tone classes', () => {
    const { container } = render(<Badge tone="danger">Blocked</Badge>);
    expect(container.firstChild).toHaveClass('bg-semantic-danger-surface');
    expect(container.firstChild).toHaveClass('text-semantic-danger');
  });

  it('applies success tone classes', () => {
    const { container } = render(<Badge tone="success">Done</Badge>);
    expect(container.firstChild).toHaveClass('bg-semantic-success-surface');
    expect(container.firstChild).toHaveClass('text-semantic-success');
  });

  it('applies brand tone classes', () => {
    const { container } = render(<Badge tone="brand">New</Badge>);
    expect(container.firstChild).toHaveClass('bg-brand-navy');
    expect(container.firstChild).toHaveClass('text-white');
  });

  it('merges extra className', () => {
    const { container } = render(<Badge className="ml-2">Tag</Badge>);
    expect(container.firstChild).toHaveClass('ml-2');
  });

  it('is a span element', () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText('Label').tagName).toBe('SPAN');
  });
});
