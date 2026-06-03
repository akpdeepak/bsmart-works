import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/dom';
import { SearchInput } from './search-input';

afterEach(() => vi.restoreAllMocks());

describe('SearchInput', () => {
  it('renders with placeholder', () => {
    render(<SearchInput placeholder="Search work items…" />);
    expect(screen.getByPlaceholderText('Search work items…')).toBeInTheDocument();
  });

  it('shows clear button only when there is input', async () => {
    const user = userEvent.setup();
    render(<SearchInput />);
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'hello');
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('clears input on clear button click', async () => {
    const user = userEvent.setup();
    render(<SearchInput debounceMs={0} />);
    await user.type(screen.getByRole('searchbox'), 'hello');
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('calls onSearch after debounce delay using fake timers', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} debounceMs={250} />);
    const input = screen.getByRole('searchbox');

    act(() => {
      fireEvent.change(input, { target: { value: 'abc' } });
    });
    expect(onSearch).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(250); });
    expect(onSearch).toHaveBeenCalledWith('abc');
    vi.useRealTimers();
  });

  it('calls onSearch with empty string when cleared', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} debounceMs={250} />);
    const input = screen.getByRole('searchbox');

    act(() => { fireEvent.change(input, { target: { value: 'abc' } }); });
    act(() => { vi.advanceTimersByTime(250); });
    onSearch.mockClear();

    // clear button appears after value is set
    const clear = screen.getByRole('button', { name: /clear/i });
    act(() => { fireEvent.click(clear); });
    expect(onSearch).toHaveBeenCalledWith('');
    vi.useRealTimers();
  });

  it('is keyboard accessible: clear button focusable and activatable', async () => {
    const user = userEvent.setup();
    render(<SearchInput debounceMs={0} />);
    await user.type(screen.getByRole('searchbox'), 'test');
    const clear = screen.getByRole('button', { name: /clear/i });
    clear.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
});
