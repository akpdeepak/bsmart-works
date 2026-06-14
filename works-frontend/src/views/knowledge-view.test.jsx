import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/a11y';
import KnowledgeView from './knowledge-view';

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
  articleContentFormat: 'markdown',
  can: () => false,
  setKnowledgeSearch: noop,
  setKnowledgeTab: noop,
  setSelectedSpace: noop,
  setSelectedArticle: noop,
  setEditingArticle: noop,
  setArticlePanel: noop,
  setNewArticleComment: noop,
  setArticleContentFormat: noop,
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
    expect(screen.getByRole('textbox', { name: /search articles/i })).toBeInTheDocument();
  });

  it('gives the comment composer an accessible name', () => {
    render(
      <KnowledgeView {...baseProps} articlePanel="comments"
        selectedSpace={{ id: 'S1', name: 'Ops' }}
        selectedArticle={{ id: 'A1', title: 'Doc', status: 'DRAFT', content: 'hi' }} />,
    );
    expect(screen.getByRole('textbox', { name: /add a comment/i })).toBeInTheDocument();
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
