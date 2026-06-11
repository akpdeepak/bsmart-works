import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TodayCanvas } from './today-canvas';

const registry = {
  alpha: (ctx) => <div data-testid="alpha">alpha:{ctx.label}</div>,
  beta: () => <div data-testid="beta">beta</div>,
};

describe('TodayCanvas', () => {
  it('renders each widget through the registry, in layout order', () => {
    const layout = [
      { id: 'w1', type: 'alpha', span: 8 },
      { id: 'w2', type: 'beta', span: 4 },
    ];
    render(<TodayCanvas layout={layout} registry={registry} ctx={{ label: 'hi' }} />);
    expect(screen.getByTestId('alpha')).toHaveTextContent('alpha:hi');
    expect(screen.getByTestId('beta')).toBeInTheDocument();
  });

  it('maps spans to literal Tailwind col-span classes', () => {
    const layout = [
      { id: 'w1', type: 'alpha', span: 8, spanSm: 6 },
      { id: 'w2', type: 'beta', span: 4 },
    ];
    const { container } = render(<TodayCanvas layout={layout} registry={registry} ctx={{}} />);
    const cells = container.querySelectorAll(':scope > div > div');
    expect(cells[0].className).toContain('md:col-span-8');
    expect(cells[0].className).toContain('col-span-6');
    expect(cells[1].className).toContain('md:col-span-4');
    expect(cells[1].className).toContain('col-span-12'); // default mobile span
  });

  it('falls back to an honest message for an unknown widget type', () => {
    const layout = [{ id: 'w1', type: 'ghost', span: 6 }];
    render(<TodayCanvas layout={layout} registry={registry} ctx={{}} />);
    expect(screen.getByText(/Unknown widget "ghost"/)).toBeInTheDocument();
  });

  it('shows an empty-state prompt when the layout has no widgets', () => {
    render(<TodayCanvas layout={[]} registry={registry} ctx={{}} />);
    expect(screen.getByText(/No widgets yet/)).toBeInTheDocument();
  });
});
