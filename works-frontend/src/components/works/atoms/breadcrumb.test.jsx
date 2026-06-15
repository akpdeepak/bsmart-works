import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from './breadcrumb';

const ITEMS = [
  { label: 'Workspace', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'Alpha Sprint' },
];

describe('Breadcrumb', () => {
  it('renders a nav with aria-label="Breadcrumb"', () => {
    render(<Breadcrumb items={ITEMS} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('renders each item label', () => {
    render(<Breadcrumb items={ITEMS} />);
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Alpha Sprint')).toBeInTheDocument();
  });

  it('marks the last item with aria-current="page"', () => {
    render(<Breadcrumb items={ITEMS} />);
    expect(screen.getByText('Alpha Sprint').closest('[aria-current]')).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark non-last items with aria-current', () => {
    render(<Breadcrumb items={ITEMS} />);
    expect(screen.queryByText('Workspace')?.closest('[aria-current]')).toBeFalsy();
  });

  it('renders href items as anchor tags', () => {
    render(<Breadcrumb items={ITEMS} />);
    expect(screen.getByRole('link', { name: 'Workspace' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
  });

  it('renders the last item as a non-link span', () => {
    render(<Breadcrumb items={ITEMS} />);
    expect(screen.queryByRole('link', { name: 'Alpha Sprint' })).not.toBeInTheDocument();
  });

  it('renders with empty items without crashing', () => {
    render(<Breadcrumb items={[]} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });
});
