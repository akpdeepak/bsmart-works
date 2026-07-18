// useKnowledgeState.js — Knowledge Repository domain state (TD-003 Phase 4)
// Extracted from AppShell: spaces, articles, versions, comments, analytics,
// workflow transitions, search, and all associated CRUD.
import { useState } from 'react';

/**
 * @param {Object}   api
 * @param {string}   activeWorkspaceId
 * @param {Function} showToast
 * @param {Function} reportError
 */
export function useKnowledgeState(api, activeWorkspaceId, showToast, reportError) {
  const [knowledgeSpaces, setKnowledgeSpaces]           = useState([]);
  const [knowledgeArticles, setKnowledgeArticles]       = useState([]);
  const [knowledgeSpacesLoading, setKnowledgeSpacesLoading] = useState(false);
  const [knowledgeArticlesLoading, setKnowledgeArticlesLoading] = useState(false);
  const [selectedSpace, setSelectedSpace]               = useState(null);
  const [selectedArticle, setSelectedArticle]           = useState(null);
  const [articleVersions, setArticleVersions]           = useState([]);
  const [knowledgeSearch, setKnowledgeSearch]           = useState('');
  const [knowledgeSearchResults, setKnowledgeSearchResults] = useState([]);
  const [knowledgeTab, setKnowledgeTab]                 = useState('spaces');
  const [spaceForm, setSpaceForm]                       = useState({ name: '', description: '', visibility: 'TEAM' });
  const [articleForm, setArticleForm]                   = useState({ title: '', content: '', templateType: 'KB', status: 'DRAFT' });
  const [isSpaceFormOpen, setIsSpaceFormOpen]           = useState(false);
  const [isArticleFormOpen, setIsArticleFormOpen]       = useState(false);
  const [editingArticle, setEditingArticle]             = useState(false);
  const [articlePanel, setArticlePanel]                 = useState(null);
  const [articleComments, setArticleComments]           = useState([]);
  const [articleChildren, setArticleChildren]           = useState([]);
  const [newArticleComment, setNewArticleComment]       = useState('');
  const [articleAnalytics, setArticleAnalytics]         = useState(null);

  function fetchKnowledgeSpaces() {
    setKnowledgeSpacesLoading(true);
    api.raw(`/knowledge-spaces`).then(r => r.json()).then(d => setKnowledgeSpaces(Array.isArray(d) ? d : []))
      .catch(reportError).finally(() => setKnowledgeSpacesLoading(false));
  }

  function fetchKnowledgeArticles(spaceId) {
    const url = spaceId ? `/knowledge-spaces/${spaceId}/articles` : `/articles`;
    setKnowledgeArticlesLoading(true);
    api.raw(url).then(r => r.json()).then(d => setKnowledgeArticles(Array.isArray(d) ? d : []))
      .catch(reportError).finally(() => setKnowledgeArticlesLoading(false));
  }

  function fetchArticleDetail(articleId) {
    if (!articleId) return;
    api.raw(`/articles/${articleId}`).then(r => r.json())
      .then(d => { if (d && d.id) setSelectedArticle(d); }).catch(reportError);
  }

  function fetchArticleVersions(articleId) {
    api.raw(`/articles/${articleId}/versions`)
      .then(r => r.json()).then(d => setArticleVersions(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function createKnowledgeSpace() {
    if (!spaceForm.name) { showToast('Space name is required', 'error'); return; }
    api.send(`/knowledge-spaces`, { method: 'POST', body: JSON.stringify({ ...spaceForm, workspaceId: activeWorkspaceId }) })
      .then(() => { showToast('Space created'); setIsSpaceFormOpen(false); setSpaceForm({ name: '', description: '', visibility: 'TEAM' }); fetchKnowledgeSpaces(); })
      .catch(() => showToast('Failed to create space', 'error'));
  }

  function deleteKnowledgeSpace(id) {
    api.send(`/knowledge-spaces/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Space deleted'); if (selectedSpace?.id === id) { setSelectedSpace(null); setKnowledgeArticles([]); } fetchKnowledgeSpaces(); })
      .catch(() => showToast('Failed to delete space', 'error'));
  }

  function createArticle() {
    if (!articleForm.title) { showToast('Title is required', 'error'); return; }
    api.send(`/articles`, { method: 'POST', body: JSON.stringify({ ...articleForm, spaceId: selectedSpace?.id, workspaceId: activeWorkspaceId }) })
      .then(() => { showToast('Article created'); setIsArticleFormOpen(false); setArticleForm({ title: '', content: '', templateType: 'KB', status: 'DRAFT' }); fetchKnowledgeArticles(selectedSpace?.id); })
      .catch(() => showToast('Failed to create article', 'error'));
  }

  function updateArticle(id, patch, opts = {}) {
    return api.send(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
      .then(d => { if (!opts.silent) { setSelectedArticle(d); showToast('Article saved'); fetchKnowledgeArticles(selectedSpace?.id); } return d; })
      .catch((e) => { if (!opts.silent) showToast('Failed to save article', 'error'); throw e; });
  }

  function articleWorkflow(id, action, successMsg) {
    api.send(`/articles/${id}/${action}`, { method: 'PUT' })
      .then(d => { setSelectedArticle(d); showToast(successMsg); fetchKnowledgeArticles(selectedSpace?.id); })
      .catch(e => showToast(e.message || 'Action failed', 'error'));
  }
  const submitArticleForReview = id => articleWorkflow(id, 'submit',  'Submitted for review');
  const publishArticle        = id => articleWorkflow(id, 'publish', 'Article published');
  const rejectArticle         = id => articleWorkflow(id, 'reject',  'Returned to draft');
  const archiveArticle        = id => articleWorkflow(id, 'archive', 'Article archived');
  const restoreArticle        = id => articleWorkflow(id, 'restore', 'Article restored to draft');

  function fetchArticleComments(articleId) {
    api.raw(`/articles/${articleId}/comments`)
      .then(r => r.json()).then(d => setArticleComments(Array.isArray(d) ? d : [])).catch(reportError);
  }

  function addArticleComment(articleId) {
    const body = newArticleComment.trim();
    if (!body) return;
    api.send(`/articles/${articleId}/comments`, { method: 'POST', body: JSON.stringify({ body }) })
      .then(() => { setNewArticleComment(''); fetchArticleComments(articleId); })
      .catch(() => showToast('Failed to add comment', 'error'));
  }

  function toggleArticleComment(articleId, commentId, resolved) {
    api.send(`/articles/${articleId}/comments/${commentId}/resolve`, { method: 'PUT', body: JSON.stringify({ resolved }) })
      .then(() => fetchArticleComments(articleId))
      .catch(() => showToast('Failed to update comment', 'error'));
  }

  function deleteArticleComment(articleId, commentId) {
    api.send(`/articles/${articleId}/comments/${commentId}`, { method: 'DELETE' })
      .then(() => fetchArticleComments(articleId))
      .catch(() => showToast('Failed to delete comment', 'error'));
  }

  function fetchArticleAnalytics(articleId) {
    api.raw(`/articles/${articleId}/analytics`)
      .then(r => r.json()).then(d => setArticleAnalytics(d)).catch(() => setArticleAnalytics(null));
  }

  function fetchArticleChildren(articleId) {
    api.raw(`/articles/${articleId}/children`)
      .then(r => r.json()).then(d => setArticleChildren(Array.isArray(d) ? d : [])).catch(() => setArticleChildren([]));
  }

  function openArticlePanel(panel) {
    setArticlePanel(prev => {
      const next = prev === panel ? null : panel;
      if (next === 'history' && selectedArticle) fetchArticleVersions(selectedArticle.id);
      if (next === 'comments' && selectedArticle) fetchArticleComments(selectedArticle.id);
      if (next === 'analytics' && selectedArticle) fetchArticleAnalytics(selectedArticle.id);
      return next;
    });
  }

  function deleteArticle(id) {
    api.send(`/articles/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Article deleted'); setSelectedArticle(null); setEditingArticle(false); fetchKnowledgeArticles(selectedSpace?.id); })
      .catch(() => showToast('Failed to delete article', 'error'));
  }

  function searchKnowledge() {
    if (!knowledgeSearch.trim()) return;
    api.raw(`/articles?search=${encodeURIComponent(knowledgeSearch.trim())}`)
      .then(r => r.json()).then(d => setKnowledgeSearchResults(Array.isArray(d) ? d : [])).catch(reportError);
  }

  return {
    knowledgeSpaces, knowledgeArticles,
    knowledgeSpacesLoading, knowledgeArticlesLoading,
    selectedSpace, setSelectedSpace,
    selectedArticle, setSelectedArticle,
    articleVersions, setArticleVersions,
    knowledgeSearch, setKnowledgeSearch,
    knowledgeSearchResults, setKnowledgeSearchResults,
    knowledgeTab, setKnowledgeTab,
    spaceForm, setSpaceForm,
    articleForm, setArticleForm,
    isSpaceFormOpen, setIsSpaceFormOpen,
    isArticleFormOpen, setIsArticleFormOpen,
    editingArticle, setEditingArticle,
    articlePanel, setArticlePanel,
    articleComments, setArticleComments,
    articleChildren, setArticleChildren,
    newArticleComment, setNewArticleComment,
    articleAnalytics, setArticleAnalytics,
    fetchKnowledgeSpaces, fetchKnowledgeArticles,
    fetchArticleDetail, fetchArticleVersions,
    createKnowledgeSpace, deleteKnowledgeSpace,
    createArticle, updateArticle, deleteArticle,
    submitArticleForReview, publishArticle, rejectArticle, archiveArticle, restoreArticle,
    fetchArticleComments, addArticleComment, toggleArticleComment, deleteArticleComment,
    fetchArticleAnalytics, fetchArticleChildren,
    openArticlePanel, searchKnowledge,
  };
}
