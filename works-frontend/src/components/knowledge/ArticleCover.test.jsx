import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleCover, COVER_GRADIENTS } from './ArticleCover';

describe('ArticleCover (KR-009)', () => {
  it('renders nothing when image is null', () => {
    const { container } = render(<ArticleCover image={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a gradient div for a gradient key', () => {
    const { container } = render(<ArticleCover image="gradient:navy-to-orange" />);
    const el = container.firstChild;
    expect(el.tagName).toBe('DIV');
    expect(el.getAttribute('role')).toBe('img');
    const cls = COVER_GRADIENTS['navy-to-orange'];
    cls.split(' ').forEach(c => expect(el.className).toContain(c));
  });

  it('falls back to a default gradient for an unknown gradient key', () => {
    const { container } = render(<ArticleCover image="gradient:nonexistent-key" />);
    const el = container.firstChild;
    expect(el.tagName).toBe('DIV');
    expect(el.className).toContain('from-neutral-300');
  });

  it('renders an img for an https URL', () => {
    render(<ArticleCover image="https://example.com/cover.jpg" />);
    const img = screen.getByRole('presentation');
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBe('https://example.com/cover.jpg');
  });

  it('blocks javascript: scheme URLs (XSS prevention)', () => {
    const { container } = render(<ArticleCover image="javascript:alert(1)" />);
    expect(container.firstChild).toBeNull();
  });
});
