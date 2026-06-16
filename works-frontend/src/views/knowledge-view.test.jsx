import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import { api } from '@/lib/apiClient';
import KnowledgeView from './knowledge-view';

vi.mock('@/lib/apiClient', () => ({ api: { send: vi.fn() } }));

const noop = () => {};

const baseProps = {
  knowledgeSearch: '',
  knowledgeTab: 'spaces',
  knowledgeSpaces: [],
  selectedSpace: null,
  selectedArticle: null,
  editingArticle: false,
  articlePanel: null,
  knowledgeSearchResults: [],
  knowledgeArticles: [],
  articleVersions: [],
  articleComments: [],
  articleAnalytics: null,
  newArticleComment: '',
  can: () => false,
  setKnowledgeSearch: noop,
  setKnowledgeTab: noop,
  setSelectedSpace: noop,
  setSelectedArticle: noop,
  setEditingArticle: noop,
  setArticlePanel: noop,
  setNewArticleComment: noop,
  setIsSpaceFormOpen: noop,
  setIsArticleFormOpen: noop,
  setArticleForm: noop,
  searchKnowledge: noop,
  fetchKnowledgeArticles: noop,
  deleteKnowledgeSpace: noop,
  updateArticle: noop,
  submitArticleForReview: noop,
  publishArticle: noop,
  archiveArticle: noop,
  restoreArticle: noop,
  deleteArticle: noop,
  addArticleComment: noop,
  toggleArticleComment: noop,
  deleteArticleComment: noop,
  openArticlePanel: noop,
  rejectArticle: noop,
};

describe('KnowledgeView', () => {
  it('renders the Knowledge Spaces sidebar heading', () => {
    render(<KnowledgeView {...baseProps} />);
    expect(screen.getByRole('heading', { name: /^knowledge spaces$/i, level: 2 })).toBeInTheDocument();
  });

  it('shows empty spaces message when no spaces exist', () => {
    render(<KnowledgeView {...baseProps} />);
    expect(screen.getByText(/no spaces yet/i)).toBeInTheDocument();
  });

  it('renders All Articles shortcut button', () => {
    render(<KnowledgeView {...baseProps} />);
    expect(screen.getByRole('button', { name: /all articles/i })).toBeInTheDocument();
  });

  it('gives the article search input an accessible name', () => {
    render(<KnowledgeView {...baseProps} />);
    expect(screen.getByRole('combobox', { name: /search articles/i })).toBeInTheDocument();
  });

  it('gives the comment composer an accessible name', () => {
    render(
      <KnowledgeView {...baseProps} articlePanel="comments"
        selectedSpace={{ id: 'S1', name: 'Ops' }}
        selectedArticle={{ id: 'A1', title: 'Doc', status: 'DRAFT', content: 'hi' }} />,
    );
    expect(screen.getByRole('textbox', { name: /add a comment/i })).toBeInTheDocument();
  });

  // ── UAT: Know Studio editing flow ──────────────────────────────────────────────

  it('opens a block-format article in the block editor (always uses block editor)', () => {
    const blocks = JSON.stringify([{ id: 'b1', type: 'heading1', content: 'My Heading', metadata: {} }]);
    render(
      <KnowledgeView {...baseProps} editingArticle
        selectedSpace={{ id: 'S1', name: 'Ops' }}
        selectedArticle={{ id: 'A1', title: 'Doc', status: 'DRAFT', contentFormat: 'blocks', contentBlocks: blocks }} />,
    );
    // The block editor is always rendered — content from the article's blocks is visible.
    expect(screen.getByLabelText('Block editor')).toBeInTheDocument();
  });

  it('autosaves block edits quietly after a debounce, not on every keystroke', () => {
    vi.useFakeTimers();
    try {
      const updateArticle = vi.fn(() => Promise.resolve({}));
      const blocks = JSON.stringify([{ id: 'b1', type: 'paragraph', content: '', metadata: {} }]);
      render(
        <KnowledgeView {...baseProps} editingArticle
          updateArticle={updateArticle}
          selectedSpace={{ id: 'S1', name: 'Ops' }}
          selectedArticle={{ id: 'A1', title: 'Doc', status: 'DRAFT', contentFormat: 'blocks', contentBlocks: blocks }} />,
      );
      const para = screen.getByLabelText('Paragraph content');
      fireEvent.change(para, { target: { value: 'h' } });
      fireEvent.change(para, { target: { value: 'he' } });
      fireEvent.change(para, { target: { value: 'hel' } });
      // Debounced: no PUT yet despite three keystrokes, and the status shows progress.
      expect(updateArticle).not.toHaveBeenCalled();
      expect(screen.getByText('Saving…')).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(900); });
      // Exactly one quiet (silent) save, marked as block format.
      expect(updateArticle).toHaveBeenCalledTimes(1);
      expect(updateArticle).toHaveBeenCalledWith('A1', expect.objectContaining({ contentFormat: 'blocks' }), { silent: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it('fetches full article detail on open (so views/analytics are tracked)', () => {
    const fetchArticleDetail = vi.fn();
    const setSelectedArticle = vi.fn();
    render(
      <KnowledgeView {...baseProps} knowledgeTab="all"
        setSelectedArticle={setSelectedArticle} fetchArticleDetail={fetchArticleDetail}
        knowledgeArticles={[{ id: 'A1', title: 'Runbook', status: 'PUBLISHED', versionNumber: 1 }]} />,
    );
    fireEvent.click(screen.getByText('Runbook'));
    expect(setSelectedArticle).toHaveBeenCalledWith(expect.objectContaining({ id: 'A1' }));
    expect(fetchArticleDetail).toHaveBeenCalledWith('A1');
  });

  it('shows skeletons (not the empty state) while spaces/articles load', () => {
    render(<KnowledgeView {...baseProps} knowledgeTab="all" knowledgeSpacesLoading knowledgeArticlesLoading />);
    expect(screen.getByLabelText('Loading spaces')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading articles')).toBeInTheDocument();
    expect(screen.queryByText(/no spaces yet/i)).not.toBeInTheDocument();
  });

  it('renders block-format articles in read mode via BlockRenderer', () => {
    const blocks = JSON.stringify([{ id: 'b1', type: 'callout', content: 'Heads up', metadata: { variant: 'info' } }]);
    render(
      <KnowledgeView {...baseProps} editingArticle={false}
        selectedSpace={{ id: 'S1', name: 'Ops' }}
        selectedArticle={{ id: 'A1', title: 'Doc', status: 'PUBLISHED', contentFormat: 'blocks', contentBlocks: blocks }} />,
    );
    expect(screen.getByText('Heads up')).toBeInTheDocument();
  });

  it('has no serious a11y violations on the spaces list', async () => {
    const { container } = render(
      <KnowledgeView {...baseProps} can={() => true}
        knowledgeSpaces={[{ id: 'S1', name: 'Ops', visibility: 'TEAM' }]} />,
    );
    await expectNoA11yViolations(container);
  });

  it('has no serious a11y violations on the article detail + comments panel', async () => {
    const { container } = render(
      <KnowledgeView {...baseProps} can={() => true} knowledgeTab="space" articlePanel="comments"
        selectedSpace={{ id: 'S1', name: 'Ops' }}
        selectedArticle={{ id: 'A1', title: 'Doc', status: 'DRAFT', content: 'hi', versionNumber: 1 }}
        articleComments={[{ id: 'C1', body: 'note', authorName: 'A', resolved: false }]} />,
    );
    await expectNoA11yViolations(container);
  });
});

// ── KR-041 / KR-042: Full-text search + excerpt highlights ────────────────────

describe('FTS search (KR-041 / KR-042)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call the search API immediately on keystroke (debounce)', () => {
    api.send.mockResolvedValue([]);
    render(<KnowledgeView {...baseProps} />);
    fireEvent.change(screen.getByLabelText('Search articles'), { target: { value: 'runbook' } });
    expect(api.send).not.toHaveBeenCalled();
  });

  it('calls /articles/search with the query after the 300ms debounce fires', async () => {
    api.send.mockResolvedValue([]);
    render(<KnowledgeView {...baseProps} />);
    fireEvent.change(screen.getByLabelText('Search articles'), { target: { value: 'runbook' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(api.send).toHaveBeenCalledWith('/articles/search?q=runbook');
  });

  it('shows the results listbox when the API returns matches', async () => {
    api.send.mockResolvedValue([
      { id: 'A1', title: 'Runbook Alpha', spaceId: 'S1', status: 'PUBLISHED', excerpt: '' },
    ]);
    render(<KnowledgeView {...baseProps} />);
    fireEvent.change(screen.getByLabelText('Search articles'), { target: { value: 'runbook' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    await act(async () => {});
    expect(screen.getByRole('listbox', { name: /search results/i })).toBeInTheDocument();
    expect(screen.getByText('Runbook Alpha')).toBeInTheDocument();
  });

  it('renders excerpt <mark> highlights inside the dropdown', async () => {
    api.send.mockResolvedValue([
      { id: 'A1', title: 'Runbook Alpha', spaceId: 'S1', status: 'PUBLISHED',
        excerpt: 'Deploy the <mark>runbook</mark> config.' },
    ]);
    render(<KnowledgeView {...baseProps} />);
    fireEvent.change(screen.getByLabelText('Search articles'), { target: { value: 'runbook' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    await act(async () => {});
    const mark = document.querySelector('mark');
    expect(mark).toBeInTheDocument();
    expect(mark.textContent).toBe('runbook');
  });

  it('hides the listbox when Escape is pressed', async () => {
    api.send.mockResolvedValue([
      { id: 'A1', title: 'Runbook Alpha', spaceId: 'S1', status: 'PUBLISHED', excerpt: '' },
    ]);
    render(<KnowledgeView {...baseProps} />);
    const input = screen.getByLabelText('Search articles');
    fireEvent.change(input, { target: { value: 'runbook' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    await act(async () => {});
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not call the API when the query is whitespace-only', async () => {
    api.send.mockResolvedValue([]);
    render(<KnowledgeView {...baseProps} />);
    fireEvent.change(screen.getByLabelText('Search articles'), { target: { value: '   ' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(api.send).not.toHaveBeenCalled();
  });

  it('does not fire a second API call when the user retypes within the debounce window', async () => {
    api.send.mockResolvedValue([]);
    render(<KnowledgeView {...baseProps} />);
    const input = screen.getByLabelText('Search articles');
    fireEvent.change(input, { target: { value: 'run' } });
    await act(async () => { vi.advanceTimersByTime(200); });
    fireEvent.change(input, { target: { value: 'runbook' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(api.send).toHaveBeenCalledTimes(1);
    expect(api.send).toHaveBeenCalledWith('/articles/search?q=runbook');
  });
});
