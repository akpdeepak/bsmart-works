// Tests for StreamingText (WI-27).
// Verifies text rendering, streaming cursor presence, and accessibility attributes.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamingText } from './streaming-text';

describe('StreamingText', () => {
  // ── Text rendering ──────────────────────────────────────────────────────────

  it('renders the provided text', () => {
    render(<StreamingText text="Hello world" />);
    expect(screen.getByText(/Hello world/)).toBeInTheDocument();
  });

  it('renders empty text without error', () => {
    const { container } = render(<StreamingText text="" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  // ── Streaming cursor ────────────────────────────────────────────────────────

  it('shows the blinking cursor when streaming=true', () => {
    const { container } = render(<StreamingText text="AI is writ" streaming />);
    // The cursor is a hidden <span> with animate-pulse
    const cursor = container.querySelector('[aria-hidden="true"]');
    expect(cursor).toBeInTheDocument();
    expect(cursor).toHaveClass('animate-pulse');
  });

  it('does not show the cursor when streaming=false', () => {
    const { container } = render(<StreamingText text="Done" streaming={false} />);
    const cursor = container.querySelector('[aria-hidden="true"]');
    expect(cursor).toBeNull();
  });

  it('does not show the cursor when streaming is omitted (defaults to false)', () => {
    const { container } = render(<StreamingText text="Static" />);
    const cursor = container.querySelector('[aria-hidden="true"]');
    expect(cursor).toBeNull();
  });

  // ── Accessibility ───────────────────────────────────────────────────────────

  it('has aria-live="polite" for progressive content announcement', () => {
    const { container } = render(<StreamingText text="Hello" />);
    expect(container.firstChild).toHaveAttribute('aria-live', 'polite');
  });

  it('sets aria-label to "AI is writing…" while streaming', () => {
    const { container } = render(<StreamingText text="..." streaming />);
    expect(container.firstChild).toHaveAttribute('aria-label', 'AI is writing…');
  });

  it('does not set aria-label when not streaming', () => {
    const { container } = render(<StreamingText text="Done" />);
    expect(container.firstChild).not.toHaveAttribute('aria-label');
  });

  // ── className passthrough ───────────────────────────────────────────────────

  it('applies className to the wrapper span', () => {
    const { container } = render(<StreamingText text="t" className="font-mono" />);
    expect(container.firstChild).toHaveClass('font-mono');
  });
});
