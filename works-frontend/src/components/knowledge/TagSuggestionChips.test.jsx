// KR-075: TagSuggestionChips unit tests.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagSuggestionChips } from './TagSuggestionChips';

describe('TagSuggestionChips (KR-075)', () => {
  it('renders nothing when suggestions array is empty', () => {
    const { container } = render(
      <TagSuggestionChips suggestions={[]} onAccept={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a chip for each suggestion', () => {
    render(
      <TagSuggestionChips
        suggestions={['kubernetes', 'deployment']}
        onAccept={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText('kubernetes')).toBeInTheDocument();
    expect(screen.getByText('deployment')).toBeInTheDocument();
  });

  it('calls onAccept with the tag name when Accept is clicked', async () => {
    const onAccept = vi.fn();
    const user = userEvent.setup();
    render(
      <TagSuggestionChips
        suggestions={['kubernetes']}
        onAccept={onAccept}
        onDismiss={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /accept tag "kubernetes"/i }));
    expect(onAccept).toHaveBeenCalledWith('kubernetes');
  });

  it('calls onDismiss with the tag name when Dismiss is clicked', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <TagSuggestionChips
        suggestions={['kubernetes']}
        onAccept={vi.fn()}
        onDismiss={onDismiss}
      />,
    );
    await user.click(screen.getByRole('button', { name: /dismiss tag "kubernetes"/i }));
    expect(onDismiss).toHaveBeenCalledWith('kubernetes');
  });

  it('renders multiple chips and all are accessible', () => {
    render(
      <TagSuggestionChips
        suggestions={['kubernetes', 'deployment', 'production']}
        onAccept={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button', { name: /accept tag/i })).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: /dismiss tag/i })).toHaveLength(3);
  });
});
