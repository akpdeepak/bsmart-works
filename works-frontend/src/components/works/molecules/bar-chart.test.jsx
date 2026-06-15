import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarChart } from './bar-chart';

const data = [
  { label: 'High', value: 6 },
  { label: 'Medium', value: 4 },
  { label: 'Low', value: 1 },
];

describe('BarChart', () => {
  it('renders a bar row with label and value for each entry', () => {
    render(<BarChart data={data} />);
    // Text appears in both the sr-only data table and the visual bar row (WCAG 1.4.1 SR fallback)
    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Medium').length).toBeGreaterThan(0);
    expect(screen.getAllByText('6').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('exposes an accessible image label summarising the data (not colour-alone)', () => {
    render(<BarChart data={data} />);
    expect(screen.getByRole('img', { name: /High 6, Medium 4, Low 1/ })).toBeInTheDocument();
  });

  it('ignores zero-value entries', () => {
    render(<BarChart data={[{ label: 'High', value: 2 }, { label: 'None', value: 0 }]} />);
    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
    expect(screen.queryByText('None')).not.toBeInTheDocument();
  });

  it('shows an empty hint when there is no data', () => {
    render(<BarChart data={[]} />);
    expect(screen.getByText('No matching items.')).toBeInTheDocument();
  });

  it('renders bars as buttons and calls onSelect with the entry on click', async () => {
    const onSelect = vi.fn();
    render(<BarChart data={data} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /High: 6/ }));
    expect(onSelect).toHaveBeenCalledWith({ label: 'High', value: 6 });
  });
});
