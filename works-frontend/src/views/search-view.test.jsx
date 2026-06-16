import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchView from './search-view';

// ---- mock useSearch -------------------------------------------------------
vi.mock('@/hooks/queries/useSearch', () => ({
  useSearch: vi.fn(),
  searchKeys: { results: (w, q, f) => ['search', w, q, f] },
}));

import { useSearch } from '@/hooks/queries/useSearch';

// Helper — fresh QueryClient per test to prevent cache bleed.
function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const noop = () => {};
const BASE = { workspaceId: 'WS-1', onSelectItem: noop, onSelectArticle: noop };

const WI_RESULTS = [
  { id: 'WI-1', title: 'Fix login bug', type: 'Bug', priority: 'HIGH', status: 'Open', statusCategory: 'todo', projectName: 'Alpha' },
  { id: 'WI-2', title: 'Add dark mode', type: 'Feature', priority: 'MEDIUM', status: 'In Progress', statusCategory: 'in_progress' },
];

const ARTICLE_RESULTS = [
  { id: 'ART-1', title: 'Onboarding guide', spaceName: 'Engineering', excerpt: 'How to get started' },
  { id: 'ART-2', title: 'API reference', spaceName: 'Docs' },
];

// Type into the search box so the SearchView doesn't show the "type to search" prompt.
function typeQuery(value = 'test') {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value } });
}

beforeEach(() => {
  useSearch.mockReset();
  // Default: idle / no results.
  useSearch.mockReturnValue({ data: undefined, isLoading: false, isError: false });
});

// ---------------------------------------------------------------------------
describe('SearchView', () => {
  it('renders the search input', () => {
    renderWith(<SearchView {...BASE} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('autofocuses the search input on mount', () => {
    renderWith(<SearchView {...BASE} />);
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('shows "Type to search" prompt when query is empty', () => {
    renderWith(<SearchView {...BASE} />);
    expect(screen.getByText(/type to search/i)).toBeInTheDocument();
  });

  it('shows skeleton rows while loading', () => {
    useSearch.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderWith(<SearchView {...BASE} />);
    typeQuery('login');
    // ListSkeleton renders an aria-busy container
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('shows empty state when there are no results', () => {
    useSearch.mockReturnValue({ data: { workItems: [], articles: [], total: 0 }, isLoading: false, isError: false });
    renderWith(<SearchView {...BASE} />);
    typeQuery('xyz');
    // EmptyState "no results" renders an h3
    const h3 = document.querySelector('h3');
    expect(h3).toBeTruthy();
    expect(h3.textContent).toMatch(/no results/i);
  });

  it('renders work item results with title', () => {
    useSearch.mockReturnValue({ data: { workItems: WI_RESULTS, articles: [], total: 2 }, isLoading: false, isError: false });
    renderWith(<SearchView {...BASE} />);
    typeQuery('login');
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    expect(screen.getByText('Add dark mode')).toBeInTheDocument();
  });

  it('renders article results with title', () => {
    useSearch.mockReturnValue({ data: { workItems: [], articles: ARTICLE_RESULTS, total: 2 }, isLoading: false, isError: false });
    renderWith(<SearchView {...BASE} />);
    typeQuery('guide');
    expect(screen.getByText('Onboarding guide')).toBeInTheDocument();
    expect(screen.getByText('API reference')).toBeInTheDocument();
  });

  it('calls onSelectItem when a work item row is clicked', () => {
    const onSelectItem = vi.fn();
    useSearch.mockReturnValue({ data: { workItems: WI_RESULTS, articles: [], total: 2 }, isLoading: false, isError: false });
    renderWith(<SearchView {...BASE} onSelectItem={onSelectItem} />);
    typeQuery('login');
    fireEvent.click(screen.getByText('Fix login bug'));
    expect(onSelectItem).toHaveBeenCalledWith(WI_RESULTS[0]);
  });

  it('calls onSelectArticle when an article row is clicked', () => {
    const onSelectArticle = vi.fn();
    useSearch.mockReturnValue({ data: { workItems: [], articles: ARTICLE_RESULTS, total: 2 }, isLoading: false, isError: false });
    renderWith(<SearchView {...BASE} onSelectArticle={onSelectArticle} />);
    typeQuery('guide');
    fireEvent.click(screen.getByText('Onboarding guide'));
    expect(onSelectArticle).toHaveBeenCalledWith(ARTICLE_RESULTS[0]);
  });

  it('shows error state when search fails', () => {
    useSearch.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderWith(<SearchView {...BASE} />);
    typeQuery('test');
    expect(screen.getByText(/search unavailable/i)).toBeInTheDocument();
  });

  it('tab filter switches active facet — Work Items tab shows selected', () => {
    useSearch.mockReturnValue({ data: { workItems: WI_RESULTS, articles: ARTICLE_RESULTS, total: 4 }, isLoading: false, isError: false });
    renderWith(<SearchView {...BASE} />);
    fireEvent.click(screen.getByRole('tab', { name: /work items/i }));
    expect(screen.getByRole('tab', { name: /work items/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /all/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('switches to Articles tab correctly', () => {
    renderWith(<SearchView {...BASE} />);
    fireEvent.click(screen.getByRole('tab', { name: /articles/i }));
    expect(screen.getByRole('tab', { name: /articles/i })).toHaveAttribute('aria-selected', 'true');
  });
});
