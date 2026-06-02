import { render, screen } from '@testing-library/react';
import { BarChart } from './bar-chart';

const data = [
  { label: 'High', value: 6 },
  { label: 'Medium', value: 4 },
  { label: 'Low', value: 1 },
];

describe('BarChart', () => {
  it('renders a bar row with label and value for each entry', () => {
    render(<BarChart data={data} />);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('exposes an accessible image label summarising the data (not colour-alone)', () => {
    render(<BarChart data={data} />);
    expect(screen.getByRole('img', { name: /High 6, Medium 4, Low 1/ })).toBeInTheDocument();
  });

  it('ignores zero-value entries', () => {
    render(<BarChart data={[{ label: 'High', value: 2 }, { label: 'None', value: 0 }]} />);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.queryByText('None')).not.toBeInTheDocument();
  });

  it('shows an empty hint when there is no data', () => {
    render(<BarChart data={[]} />);
    expect(screen.getByText('No matching items.')).toBeInTheDocument();
  });
});
