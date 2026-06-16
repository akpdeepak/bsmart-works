import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArticleIconPicker, TEMPLATE_ICONS } from './ArticleIconPicker';

describe('ArticleIconPicker (KR-010)', () => {
  it('renders the default template icon when icon is null', () => {
    render(<ArticleIconPicker icon={null} templateType="KB" onPick={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /article icon: default/i });
    expect(btn).toBeTruthy();
  });

  it('renders an emoji when icon is an emoji string', () => {
    render(<ArticleIconPicker icon="📝" templateType="KB" onPick={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /article icon: 📝/i });
    expect(btn).toBeTruthy();
  });

  it('opens the picker popover on click', () => {
    render(<ArticleIconPicker icon={null} templateType="KB" onPick={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: /article icon/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: /choose article icon/i })).toBeTruthy();
  });

  it('calls onPick with an emoji and closes the picker', () => {
    const onPick = vi.fn();
    render(<ArticleIconPicker icon={null} templateType="KB" onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: /article icon/i }));
    const emojiBtn = screen.getByRole('button', { name: '📝' });
    fireEvent.click(emojiBtn);
    expect(onPick).toHaveBeenCalledWith('📝');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('switches to the Icons tab and calls onPick with a lucide key', () => {
    const onPick = vi.fn();
    render(<ArticleIconPicker icon={null} templateType="KB" onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: /article icon/i }));
    fireEvent.click(screen.getByRole('tab', { name: 'Icons' }));
    const iconBtn = screen.getByRole('button', { name: 'FileText' });
    fireEvent.click(iconBtn);
    expect(onPick).toHaveBeenCalledWith('lucide:FileText');
  });

  it('calls onPick(null) when Clear is clicked', () => {
    const onPick = vi.fn();
    render(<ArticleIconPicker icon="📝" templateType="KB" onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: /article icon/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onPick).toHaveBeenCalledWith(null);
  });

  it('closes on Escape key', () => {
    render(<ArticleIconPicker icon={null} templateType="KB" onPick={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /article icon/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('TEMPLATE_ICONS has an entry for every template type', () => {
    const types = ['KB', 'RUNBOOK', 'ADR', 'POSTMORTEM', 'ONBOARDING', 'TROUBLESHOOTING', 'CUSTOM'];
    types.forEach(t => expect(TEMPLATE_ICONS[t]).toBeTruthy());
  });
});
