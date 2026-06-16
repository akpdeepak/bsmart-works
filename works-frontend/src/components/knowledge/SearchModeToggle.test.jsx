import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchModeToggle, SEARCH_MODE_KEY } from '@/components/knowledge/SearchModeToggle';

// ── localStorage stub ──────────────────────────────────────────────────────────
const storage = {};
const storageMock = {
  getItem: (k) => storage[k] ?? null,
  setItem: (k, v) => { storage[k] = v; },
  removeItem: (k) => { delete storage[k]; },
};

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true });
  Object.keys(storage).forEach((k) => delete storage[k]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SearchModeToggle', () => {
  it('renders both Keyword and AI buttons', () => {
    render(<SearchModeToggle mode="keyword" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Keyword' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI' })).toBeInTheDocument();
  });

  it('marks the active mode button as pressed', () => {
    render(<SearchModeToggle mode="ai" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'AI' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Keyword' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with "ai" and writes to localStorage when AI is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchModeToggle mode="keyword" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'AI' }));
    expect(onChange).toHaveBeenCalledWith('ai');
    expect(storage[SEARCH_MODE_KEY]).toBe('ai');
  });

  it('calls onChange with "keyword" and writes to localStorage when Keyword is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchModeToggle mode="ai" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Keyword' }));
    expect(onChange).toHaveBeenCalledWith('keyword');
    expect(storage[SEARCH_MODE_KEY]).toBe('keyword');
  });

  it('has an accessible group label', () => {
    render(<SearchModeToggle mode="keyword" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: 'Search mode' })).toBeInTheDocument();
  });
});
