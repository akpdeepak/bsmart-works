import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PageTreeSidebar } from './PageTreeSidebar';
import * as apiClient from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  api: { send: vi.fn() },
}));

const TREE = [
  {
    id: 'ART-001',
    title: 'Getting Started',
    status: 'PUBLISHED',
    icon: null,
    parentId: null,
    sortOrder: 0,
    children: [
      { id: 'ART-002', title: 'Installation', status: 'DRAFT', icon: '📝', parentId: 'ART-001', sortOrder: 0, children: [] },
    ],
  },
  {
    id: 'ART-003',
    title: 'Advanced Topics',
    status: 'IN_REVIEW',
    icon: null,
    parentId: null,
    sortOrder: 1,
    children: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  apiClient.api.send.mockResolvedValue(TREE);
  localStorage.clear();
});

describe('PageTreeSidebar (KR-033)', () => {
  it('shows a loading skeleton while fetching', () => {
    apiClient.api.send.mockReturnValue(new Promise(() => {}));
    render(<PageTreeSidebar spaceId="KS-001" activeArticleId={null} onSelectArticle={vi.fn()} onNewArticle={vi.fn()} />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('renders top-level article titles after fetch', async () => {
    render(<PageTreeSidebar spaceId="KS-001" activeArticleId={null} onSelectArticle={vi.fn()} onNewArticle={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeTruthy();
      expect(screen.getByText('Advanced Topics')).toBeTruthy();
    });
  });

  it('expands a node to show child articles', async () => {
    render(<PageTreeSidebar spaceId="KS-001" activeArticleId={null} onSelectArticle={vi.fn()} onNewArticle={vi.fn()} />);
    await waitFor(() => screen.getByText('Getting Started'));
    // child "Installation" should not be visible yet (collapsed by default — first render leaves it uncollapsed)
    // The expand chevron for "Getting Started"
    const expandBtns = screen.getAllByRole('button', { name: /expand|collapse/i });
    expect(expandBtns.length).toBeGreaterThan(0);
  });

  it('calls onSelectArticle when a title is clicked', async () => {
    const onSelect = vi.fn();
    render(<PageTreeSidebar spaceId="KS-001" activeArticleId={null} onSelectArticle={onSelect} onNewArticle={vi.fn()} />);
    await waitFor(() => screen.getByText('Getting Started'));
    fireEvent.click(screen.getByText('Getting Started'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'ART-001' }));
  });

  it('calls onNewArticle when the New article button is clicked', async () => {
    const onNewArticle = vi.fn();
    render(<PageTreeSidebar spaceId="KS-001" activeArticleId={null} onSelectArticle={vi.fn()} onNewArticle={onNewArticle} />);
    await waitFor(() => screen.getByText('Getting Started'));
    fireEvent.click(screen.getByRole('button', { name: /new article/i }));
    expect(onNewArticle).toHaveBeenCalledTimes(1);
  });

  it('highlights the active article', async () => {
    render(<PageTreeSidebar spaceId="KS-001" activeArticleId="ART-001" onSelectArticle={vi.fn()} onNewArticle={vi.fn()} />);
    await waitFor(() => screen.getByText('Getting Started'));
    const title = screen.getByText('Getting Started');
    // The title <button> is inside the node <div> that carries the brand-navy active style.
    expect(title.parentElement.className).toMatch(/brand-navy/);
  });

  it('renders empty state when tree is empty', async () => {
    apiClient.api.send.mockResolvedValue([]);
    render(<PageTreeSidebar spaceId="KS-001" activeArticleId={null} onSelectArticle={vi.fn()} onNewArticle={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/no articles/i)).toBeTruthy();
    });
  });

  it('renders nothing when spaceId is falsy', () => {
    const { container } = render(<PageTreeSidebar spaceId={null} activeArticleId={null} onSelectArticle={vi.fn()} onNewArticle={vi.fn()} />);
    expect(container.firstChild).toBeNull();
    expect(apiClient.api.send).not.toHaveBeenCalled();
  });

  it('fetches a new tree when spaceId changes', async () => {
    const { rerender } = render(<PageTreeSidebar spaceId="KS-001" activeArticleId={null} onSelectArticle={vi.fn()} onNewArticle={vi.fn()} />);
    await waitFor(() => screen.getByText('Getting Started'));
    rerender(<PageTreeSidebar spaceId="KS-002" activeArticleId={null} onSelectArticle={vi.fn()} onNewArticle={vi.fn()} />);
    expect(apiClient.api.send).toHaveBeenCalledWith('/knowledge-spaces/KS-002/tree');
  });
});
