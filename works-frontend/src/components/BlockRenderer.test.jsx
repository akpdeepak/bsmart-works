import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlockRenderer } from '@/components/BlockRenderer';

const block = (type, content = '', metadata = {}) => ({ id: `${type}-1`, type, content, metadata });

describe('BlockRenderer', () => {
  it('renders nothing for empty / invalid input', () => {
    const { container } = render(<BlockRenderer blocks={[]} />);
    expect(container.firstChild).toBeNull();
    const { container: c2 } = render(<BlockRenderer blocks={'not json'} />);
    expect(c2.firstChild).toBeNull();
  });

  it('parses a content_blocks JSON string', () => {
    render(<BlockRenderer blocks={JSON.stringify([block('heading1', 'Hello')])} />);
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument();
  });

  it('renders a callout with its icon and text', () => {
    render(<BlockRenderer blocks={[block('callout', 'Heads up', { variant: 'warning' })]} />);
    expect(screen.getByText('Heads up')).toBeInTheDocument();
  });

  it('renders a checklist with checked state', () => {
    render(<BlockRenderer blocks={[block('checklist', '', { items: [{ text: 'Done item', done: true }, { text: 'Open item', done: false }] })]} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).not.toBeChecked();
  });

  it('evaluates a sheet block and shows the computed total', () => {
    render(<BlockRenderer blocks={[block('sheet', '', { rows: [['10'], ['20'], ['=SUM(A1:A2)']], cols: 1 })]} />);
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders a chart block from its rows', () => {
    render(<BlockRenderer blocks={[block('chart', '', { chartType: 'bar', rows: [['A', '3'], ['B', '5']] })]} />);
    expect(screen.getByRole('img', { name: /Bar chart/ })).toBeInTheDocument();
  });

  it('builds an auto table of contents from headings', () => {
    render(<BlockRenderer blocks={[
      block('toc'),
      block('heading1', 'Overview'),
      block('heading2', 'Setup'),
    ]} />);
    const nav = screen.getByRole('navigation', { name: 'Table of contents' });
    expect(nav).toHaveTextContent('Overview');
    expect(nav).toHaveTextContent('Setup');
  });

  it('renders a work-item reference and a bookmark link', () => {
    render(<BlockRenderer blocks={[
      block('workitem', 'WRK-42', { title: 'Fix login', status: 'In Progress' }),
      block('bookmark', 'https://example.com', { title: 'Runbook' }),
    ]} />);
    expect(screen.getByText('WRK-42')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Runbook/ })).toHaveAttribute('href', 'https://example.com');
  });

  it('renders a sticker emoji and a type-aware file card', () => {
    render(<BlockRenderer blocks={[
      block('sticker', '🚀', { size: 'xl' }),
      block('file', 'https://files.example.com/q3.pdf', { fileName: 'Q3-report.pdf' }),
    ]} />);
    expect(screen.getByRole('img', { name: 'Sticker' })).toHaveTextContent('🚀');
    const fileLink = screen.getByRole('link', { name: /Q3-report\.pdf/ });
    expect(fileLink).toHaveAttribute('href', 'https://files.example.com/q3.pdf');
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });
});
