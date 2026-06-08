import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
