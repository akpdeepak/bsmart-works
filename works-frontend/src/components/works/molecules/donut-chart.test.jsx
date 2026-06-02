import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DonutChart } from './donut-chart';

const data = [
  { label: 'Todo', value: 5 },
  { label: 'In Progress', value: 3 },
  { label: 'Done', value: 2 },
];

describe('DonutChart', () => {
  it('renders a legend row with label and value for each slice', () => {
    render(<DonutChart data={data} />);
    expect(screen.getByText('Todo')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('computes the percentage of the total per slice', () => {
    render(<DonutChart data={data} />);
    expect(screen.getByText('50%')).toBeInTheDocument(); // 5 of 10
    expect(screen.getByText('30%')).toBeInTheDocument(); // 3 of 10
  });

  it('exposes an accessible image label summarising the data (not colour-alone)', () => {
    render(<DonutChart data={data} />);
    expect(screen.getByRole('img', { name: /Todo 5, In Progress 3, Done 2/ })).toBeInTheDocument();
  });

  it('ignores zero-value slices', () => {
    render(<DonutChart data={[{ label: 'Todo', value: 4 }, { label: 'Empty', value: 0 }]} />);
    expect(screen.getByText('Todo')).toBeInTheDocument();
    expect(screen.queryByText('Empty')).not.toBeInTheDocument();
  });

  it('shows an empty hint when there is no data', () => {
    render(<DonutChart data={[]} />);
    expect(screen.getByText('No matching items.')).toBeInTheDocument();
  });

  it('renders legend rows as buttons and calls onSelect with the slice on click', async () => {
    const onSelect = vi.fn();
    render(<DonutChart data={data} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /Todo: 5/ }));
    expect(onSelect).toHaveBeenCalledWith({ label: 'Todo', value: 5 });
  });

  it('renders legend rows as non-interactive when onSelect is omitted', () => {
    render(<DonutChart data={data} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
