import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageLayout } from './page-layout';

describe('PageLayout', () => {
  it('renders a PageHeader with the given title', () => {
    render(<PageLayout title="Sprint Cockpit" />);
    expect(screen.getByRole('heading', { name: 'Sprint Cockpit', level: 1 })).toBeInTheDocument();
  });

  it('renders description in PageHeader when provided', () => {
    render(<PageLayout title="Dashboard" description="Overview of your workspace" />);
    expect(screen.getByText('Overview of your workspace')).toBeInTheDocument();
  });

  it('renders actions slot in PageHeader when provided', () => {
    render(<PageLayout title="Items" actions={<button>New item</button>} />);
    expect(screen.getByRole('button', { name: 'New item' })).toBeInTheDocument();
  });

  it('renders breadcrumb in PageHeader when provided', () => {
    render(<PageLayout title="View" breadcrumb={<span>Projects / Alpha</span>} />);
    expect(screen.getByText('Projects / Alpha')).toBeInTheDocument();
  });

  it('renders children after the header', () => {
    render(
      <PageLayout title="Page">
        <p>Page content</p>
      </PageLayout>
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders no heading when title is not provided', () => {
    render(
      <PageLayout>
        <p>Content only</p>
      </PageLayout>
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders custom header node when header prop is given', () => {
    render(<PageLayout title="Ignored" header={<h2>Custom header</h2>} />);
    expect(screen.queryByRole('heading', { name: 'Ignored' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Custom header' })).toBeInTheDocument();
  });

  it('renders no header when header={null} even with a title', () => {
    render(<PageLayout title="Should not appear" header={null} />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('applies max-w-7xl for dashboard width (default)', () => {
    const { container } = render(<PageLayout title="Page" />);
    expect(container.firstChild).toHaveClass('max-w-7xl');
  });

  it('applies max-w-reading for reading width', () => {
    const { container } = render(<PageLayout title="Page" width="reading" />);
    expect(container.firstChild).toHaveClass('max-w-reading');
  });

  it('falls back to max-w-7xl for an unknown width', () => {
    const { container } = render(<PageLayout title="Page" width="unknown" />);
    expect(container.firstChild).toHaveClass('max-w-7xl');
  });

  it('applies canonical padding by default', () => {
    const { container } = render(<PageLayout title="Page" />);
    expect(container.firstChild).toHaveClass('px-6', 'py-6');
  });

  it('prevents document-level horizontal overflow from page content', () => {
    const { container } = render(<PageLayout title="Page" />);
    expect(container.firstChild).toHaveClass('overflow-x-hidden');
  });

  it('omits padding when noPadding is true', () => {
    const { container } = render(<PageLayout title="Page" noPadding />);
    expect(container.firstChild).not.toHaveClass('px-6');
    expect(container.firstChild).not.toHaveClass('py-6');
  });

  it('merges custom className onto the wrapper', () => {
    const { container } = render(<PageLayout title="Page" className="my-custom" />);
    expect(container.firstChild).toHaveClass('my-custom');
  });
});
