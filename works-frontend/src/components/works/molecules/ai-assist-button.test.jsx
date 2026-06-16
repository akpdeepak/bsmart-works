// Tests for AiAssistButton (WI-27).
// Verifies all three visual states (idle / suggesting / fallback) and interaction behavior.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiAssistButton } from './ai-assist-button';

describe('AiAssistButton', () => {
  // ── Idle state ──────────────────────────────────────────────────────────────

  it('renders the button in idle state', () => {
    render(<AiAssistButton onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'AI assist' })).toBeInTheDocument();
  });

  it('shows the default label when idle', () => {
    render(<AiAssistButton onClick={() => {}} />);
    expect(screen.getByText('AI assist')).toBeInTheDocument();
  });

  it('shows a custom label when provided', () => {
    render(<AiAssistButton onClick={() => {}} label="AI suggest" />);
    expect(screen.getByText('AI suggest')).toBeInTheDocument();
  });

  it('calls onClick when clicked in idle state', () => {
    const fn = vi.fn();
    render(<AiAssistButton onClick={fn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // ── Suggesting state ────────────────────────────────────────────────────────

  it('renders "Thinking…" text when suggesting=true', () => {
    render(<AiAssistButton onClick={() => {}} suggesting />);
    expect(screen.getByText('Thinking…')).toBeInTheDocument();
  });

  it('has aria-label "AI is thinking…" when suggesting', () => {
    render(<AiAssistButton onClick={() => {}} suggesting />);
    expect(screen.getByRole('button', { name: 'AI is thinking…' })).toBeInTheDocument();
  });

  it('is disabled while suggesting', () => {
    render(<AiAssistButton onClick={() => {}} suggesting />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when clicked while suggesting', () => {
    const fn = vi.fn();
    render(<AiAssistButton onClick={fn} suggesting />);
    // button is disabled — click should not fire the handler
    fireEvent.click(screen.getByRole('button'));
    expect(fn).not.toHaveBeenCalled();
  });

  // ── Fallback state (AI off / unavailable) ──────────────────────────────────

  it('returns null when fallback=true (deterministic fallback: button absent)', () => {
    const { container } = render(<AiAssistButton onClick={() => {}} fallback />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing even with suggesting=true and fallback=true (fallback takes precedence)', () => {
    const { container } = render(<AiAssistButton onClick={() => {}} fallback suggesting />);
    expect(container).toBeEmptyDOMElement();
  });

  // ── Disabled prop ───────────────────────────────────────────────────────────

  it('is disabled when disabled=true', () => {
    render(<AiAssistButton onClick={() => {}} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when disabled', () => {
    const fn = vi.fn();
    render(<AiAssistButton onClick={fn} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(fn).not.toHaveBeenCalled();
  });

  // ── className passthrough ───────────────────────────────────────────────────

  it('applies extra className to the button', () => {
    render(<AiAssistButton onClick={() => {}} className="my-class" />);
    expect(screen.getByRole('button')).toHaveClass('my-class');
  });
});
