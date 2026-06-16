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
  // Default mock so components that call api.send() in useEffect (e.g. RelatedArticles, AiTextAssist)
  // get a resolved promise instead of crashing with "Cannot read properties of undefined".
  // Individual tests that need specific return values override this with their own mockResolvedValue.
  beforeEach(() => {
    api.send.mockResolvedValue([]);
  });

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

  // KR-012: Focus mode
  it('Ctrl+Shift+F toggles focus mode and hides the sidebar (KR-012)', () => {
    render(
      <KnowledgeView {...baseProps} editingArticle={false}
        selectedArticle={{ id: 'A1', title: 'Doc', status: 'DRAFT', content: 'hi' }} />,
    );
    // Sidebar should be visible initially
    expect(screen.getByRole('heading', { name: /knowledge spaces/i })).toBeInTheDocument();
    // Fire Ctrl+Shift+F to enter focus mode
    fireEvent.keyDown(document, { key: 'F', ctrlKey: true, shiftKey: true });
    // Sidebar should now be hidden (has 'hidden' class)
    const sidebar = screen.getByRole('heading', { name: /knowledge spaces/i }).closest('.hidden');
    expect(sidebar).not.toBeNull();
  });

  it('renders the Exit focus button in focus mode (KR-012)', () => {
    render(
      <KnowledgeView {...baseProps}
        selectedArticle={{ id: 'A1', title: 'Doc', status: 'DRAFT', content: 'hi' }} />,
    );
    fireEvent.keyDown(document, { key: 'F', ctrlKey: true, shiftKey: true });
    expect(screen.getByRole('button', { name: /exit focus mode/i })).toBeInTheDocument();
  });

  // KR-036: Recently viewed
  it('shows recently viewed section when articles have been opened (KR-036)', () => {
    // Pre-seed localStorage
    localStorage.setItem('know-recent-ws1', JSON.stringify([
      { id: 'A1', title: 'My Article', icon: null },
    ]));
    render(<KnowledgeView {...baseProps} workspaceId="ws1" />);
    expect(screen.getByRole('region', { name: /recently viewed/i })).toBeInTheDocument();
    expect(screen.getByText('My Article')).toBeInTheDocument();
    localStorage.removeItem('know-recent-ws1');
  });

  // KR-011: Properties panel toggle
  it('Properties button shows and hides the properties panel (KR-011)', () => {
    render(
      <KnowledgeView {...baseProps}
        selectedArticle={{ id: 'A1', title: 'Doc', status: 'DRAFT', content: 'hi', templateType: 'KB' }} />,
    );
    const propertiesBtn = screen.getByRole('button', { name: /properties/i });
    expect(propertiesBtn).toBeInTheDocument();
    fireEvent.click(propertiesBtn);
    expect(screen.getByRole('complementary', { name: /article properties/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close properties panel/i }));
    expect(screen.queryByRole('complementary', { name: /article properties/i })).not.toBeInTheDocument();
  });

  // ── KR-022: Duplicate article ──────────────────────────────────────────────

  it('shows a Duplicate button in the article header (KR-022)', () => {
    render(
      <KnowledgeView {...baseProps} workspaceId="ws-1"
        selectedSpace={{ id: 'S1', name: 'Ops' }}
        selectedArticle={{ id: 'A1', title: 'Doc', status: 'DRAFT', content: 'hi' }} />,
    );
    expect(screen.getByRole('button', { name: /duplicate this article/i })).toBeInTheDocument();
  });

  it('calls the duplicate API and navigates to the new article (KR-022)', async () => {
    const newArt = { id: 'ART-NEW', title: 'Doc (copy)', status: 'DRAFT' };
    api.send.mockResolvedValue(newArt);
    const fetchKnowledgeArticles = vi.fn().mockResolvedValue([]);
    const setSelectedArticle = vi.fn();

    render(
      <KnowledgeView {...baseProps} workspaceId="ws-1"
        fetchKnowledgeArticles={fetchKnowledgeArticles}
        setSelectedArticle={setSelectedArticle}
        selectedSpace={{ id: 'S1', name: 'Ops' }}
        selectedArticle={{ id: 'A1', title: 'Doc', status: 'DRAFT', content: 'hi' }} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /duplicate this article/i }));
    });

    expect(api.send).toHaveBeenCalledWith(
      expect.stringContaining('/articles/A1/duplicate'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchKnowledgeArticles).toHaveBeenCalled();
  });

  // ── KR-038: Bulk operations ────────────────────────────────────────────────

  it('shows checkboxes on article cards in the list view (KR-038)', () => {
    render(
      <KnowledgeView {...baseProps} knowledgeTab="all"
        knowledgeArticles={[
          { id: 'A1', title: 'First', status: 'DRAFT', versionNumber: 1 },
          { id: 'A2', title: 'Second', status: 'PUBLISHED', versionNumber: 2 },
        ]} />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
  });

  it('shows the BulkActionBar when at least one article is selected (KR-038)', async () => {
    render(
      <KnowledgeView {...baseProps} knowledgeTab="all"
        knowledgeArticles={[
          { id: 'A1', title: 'First', status: 'DRAFT', versionNumber: 1 },
        ]} />,
    );
    const [checkbox] = screen.getAllByRole('checkbox');
    await act(async () => { fireEvent.click(checkbox); });
    expect(screen.getByRole('toolbar', { name: /bulk actions for 1/i })).toBeInTheDocument();
  });

  it('calls bulk-archive API when Archive is clicked (KR-038)', async () => {
    api.send.mockResolvedValue({ processed: ['A1'], skipped: [] });
    const fetchKnowledgeArticles = vi.fn().mockResolvedValue([]);

    render(
      <KnowledgeView {...baseProps} workspaceId="ws-1" knowledgeTab="all"
        fetchKnowledgeArticles={fetchKnowledgeArticles}
        knowledgeArticles={[{ id: 'A1', title: 'First', status: 'DRAFT', versionNumber: 1 }]} />,
    );

    const [checkbox] = screen.getAllByRole('checkbox');
    await act(async () => { fireEvent.click(checkbox); });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /archive 1/i }));
    });

    expect(api.send).toHaveBeenCalledWith(
      expect.stringContaining('bulk-archive'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchKnowledgeArticles).toHaveBeenCalled();
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
