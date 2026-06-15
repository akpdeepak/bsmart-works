import { render, screen } from '@testing-library/react';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('renders title as h1', () => {
    render(<PageHeader title="My Page" />);
    expect(screen.getByRole('heading', { level: 1, name: 'My Page' })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<PageHeader title="Page" description="A helpful description" />);
    expect(screen.getByText('A helpful description')).toBeInTheDocument();
  });

  it('does not render description element when omitted', () => {
    render(<PageHeader title="Page" />);
    expect(screen.queryByRole('paragraph')).toBeNull();
  });

  it('renders breadcrumb slot above the title', () => {
    render(<PageHeader title="Page" breadcrumb={<span>Home / Section</span>} />);
    expect(screen.getByText('Home / Section')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    render(<PageHeader title="Page" actions={<button>Save</button>} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('does not render actions when not provided', () => {
    render(<PageHeader title="Page" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('merges extra className', () => {
    const { container } = render(<PageHeader title="Page" className="mt-8" />);
    expect(container.firstChild).toHaveClass('mt-8');
  });

  it('applies dark-mode classes on the heading', () => {
    render(<PageHeader title="Page" />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.className).toMatch(/dark:/);
  });
});
