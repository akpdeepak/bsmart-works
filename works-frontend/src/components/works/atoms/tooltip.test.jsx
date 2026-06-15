import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Tooltip } from './tooltip';

describe('Tooltip', () => {
  it('does not show tooltip content initially', () => {
    render(
      <Tooltip content="Helper text">
        <button type="button">Hover me</button>
      </Tooltip>
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip after delay on mouseenter', () => {
    vi.useFakeTimers();
    render(
      <Tooltip content="Tooltip text" delay={350}>
        <button type="button">Trigger</button>
      </Tooltip>
    );
    const wrapper = screen.getByRole('button').parentElement;
    fireEvent.mouseEnter(wrapper);
    // Before delay elapses — not visible yet
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tooltip text');
    vi.useRealTimers();
  });

  it('hides tooltip on mouseleave', () => {
    vi.useFakeTimers();
    render(
      <Tooltip content="Tooltip text" delay={0}>
        <button type="button">Trigger</button>
      </Tooltip>
    );
    const wrapper = screen.getByRole('button').parentElement;
    fireEvent.mouseEnter(wrapper);
    act(() => vi.advanceTimersByTime(50));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('does not fire immediately before delay elapses', () => {
    vi.useFakeTimers();
    render(
      <Tooltip content="Delayed" delay={500}>
        <button type="button">Trigger</button>
      </Tooltip>
    );
    const wrapper = screen.getByRole('button').parentElement;
    fireEvent.mouseEnter(wrapper);
    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('renders with a custom side prop', () => {
    vi.useFakeTimers();
    render(
      <Tooltip content="Bottom tooltip" side="bottom" delay={0}>
        <button type="button">Trigger</button>
      </Tooltip>
    );
    const wrapper = screen.getByRole('button').parentElement;
    fireEvent.mouseEnter(wrapper);
    act(() => vi.advanceTimersByTime(10));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Bottom tooltip');
    vi.useRealTimers();
  });
});
