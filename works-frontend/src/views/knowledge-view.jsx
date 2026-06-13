import { Search, Folder, FileText, File as FileIcon, ArrowLeft, BookOpen, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/works/button';
import { EmptyState } from '@/components/works/atoms/empty-state';
import { BlockEditor } from '@/components/BlockEditor';
import { onPressKey, renderMd } from '@/lib/utils';

/**
 * KnowledgeView — knowledge base: spaces, articles, editor, version history,
 * comments, and analytics.
 *
 * Extracted from App.jsx (TD-003). All state lives in App; this component is a
 * pure rendering shell that accepts handlers as props.
 *
 * Note: the "New Space" and "New Article" modals (isSpaceFormOpen / isArticleFormOpen)
 * remain in App.jsx because they live outside this block in the original code.
 */
export default function KnowledgeView({
  knowledgeSearch,
  knowledgeTab,
  knowledgeSpaces,
  selectedSpace,
  selectedArticle,
  editingArticle,
  articlePanel,
  knowledgeSearchResults,
  knowledgeArticles,
  articleVersions,
  articleComments,
  articleAnalytics,
  newArticleComment,
  articleContentFormat,
  can,
  setKnowledgeSearch,
  setKnowledgeTab,
  setSelectedSpace,
  setSelectedArticle,
  setEditingArticle,
  setArticlePanel,
  setNewArticleComment,
  setArticleContentFormat,
  setIsSpaceFormOpen,
  setIsArticleFormOpen,
  setArticleForm,
  searchKnowledge,
  fetchKnowledgeArticles,
  deleteKnowledgeSpace,
  updateArticle,
  submitArticleForReview,
  publishArticle,
  archiveArticle,
  restoreArticle,
  deleteArticle,
  addArticleComment,
  toggleArticleComment,
  deleteArticleComment,
  openArticlePanel,
  rejectArticle,
  articleChildren = [],
  fetchArticleChildren,
}) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar — spaces */}
      <div className="w-64 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Knowledge Spaces</h2>
            <button onClick={() => setIsSpaceFormOpen(true)} className="w-6 h-6 flex items-center justify-center rounded bg-brand-navy text-white text-sm hover:opacity-80 transition-opacity" title="New space">+</button>
          </div>
          {/* Search */}
          <div className="relative">
            <input type="text" aria-label="Search articles" placeholder="Search articles..." value={knowledgeSearch}
              onChange={e => setKnowledgeSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { searchKnowledge(); setKnowledgeTab('search'); } }}
              className="input text-xs pl-6 py-1.5 w-full" />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400"><Search className="h-3.5 w-3.5" aria-hidden="true" /></span>
          </div>
        </div>
        {/* All articles shortcut */}
        <div className="px-2 py-1">
          <button onClick={() => { setSelectedSpace(null); setSelectedArticle(null); setKnowledgeTab('all'); fetchKnowledgeArticles(null); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${knowledgeTab === 'all' && !selectedSpace ? 'bg-brand-navy/10 text-brand-navy' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
            <FileText className="inline-block h-3.5 w-3.5 mr-1.5 align-text-bottom" aria-hidden="true" />All Articles
          </button>
        </div>
        {/* Space list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {knowledgeSpaces.length === 0 && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center py-6">No spaces yet. Create one to get started.</p>
          )}
          {knowledgeSpaces.map(space => (
            <div key={space.id}>
              <button onClick={() => { setSelectedSpace(space); setSelectedArticle(null); setEditingArticle(false); setKnowledgeTab('space'); fetchKnowledgeArticles(space.id); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors group flex items-center justify-between ${selectedSpace?.id === space.id ? 'bg-brand-navy/10 text-brand-navy' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                <span className="flex items-center gap-1.5">
                  {space.icon ? <span>{space.icon}</span> : <Folder className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span className="truncate">{space.name}</span>
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${space.visibility === 'PUBLIC' ? 'bg-semantic-success-surface text-semantic-success' : space.visibility === 'PRIVATE' ? 'bg-semantic-danger-surface text-semantic-danger' : 'bg-brand-navy/10 text-brand-navy'}`}>
                  {space.visibility || 'TEAM'}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Article list panel */}
        {!selectedArticle && (
          <div className="flex-1 overflow-y-auto p-6">
            {knowledgeTab === 'search' ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-xl font-bold text-brand-navy dark:text-white">Search Results</h1>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{knowledgeSearchResults.length} results for "{knowledgeSearch}"</span>
                  <button onClick={() => { setKnowledgeTab('spaces'); setKnowledgeSearch(''); }} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 ml-auto">Clear</button>
                </div>
                {knowledgeSearchResults.length === 0 ? (
                  <EmptyState icon={Search} title="No results found" subtitle={`No articles match "${knowledgeSearch}". Try different keywords.`} />
                ) : (
                  <div className="space-y-2">
                    {knowledgeSearchResults.map(art => (
                      <div key={art.id} onClick={() => { setSelectedArticle(art); setEditingArticle(false); setArticlePanel(null); fetchArticleChildren?.(art.id); }} role="button" tabIndex={0} onKeyDown={onPressKey}
                        className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 cursor-pointer hover:border-brand-navy/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{art.title}</p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">{(art.content || '').substring(0, 120)}{(art.content || '').length > 120 ? '...' : ''}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${art.status === 'PUBLISHED' ? 'bg-semantic-success-surface text-semantic-success' : art.status === 'DRAFT' ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500' : 'bg-semantic-warning-surface text-semantic-warning'}`}>{art.status || 'DRAFT'}</span>
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">{art.templateType || 'KB'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (selectedSpace || knowledgeTab === 'all') ? (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    {selectedSpace && <button onClick={() => { setSelectedSpace(null); setKnowledgeTab('spaces'); }} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors"><ArrowLeft className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom" aria-hidden="true" />Spaces</button>}
                    <h1 className="text-xl font-bold text-brand-navy dark:text-white">{selectedSpace ? selectedSpace.name : 'All Articles'}</h1>
                    {selectedSpace?.description && <p className="text-xs text-neutral-600 dark:text-neutral-400">{selectedSpace.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedSpace && can('manage_projects') && (
                      <button onClick={() => deleteKnowledgeSpace(selectedSpace.id)} className="text-xs text-semantic-danger hover:underline">Delete Space</button>
                    )}
                    {selectedSpace && (
                      <Button variant="action" onClick={() => { setIsArticleFormOpen(true); setArticleForm({ title: '', content: '', templateType: 'KB', status: 'DRAFT' }); }}>+ New Article</Button>
                    )}
                  </div>
                </div>
                {knowledgeArticles.length === 0 ? (
                  <EmptyState icon={FileIcon} title={selectedSpace ? `No articles in ${selectedSpace.name}` : 'No articles'} subtitle="Create your first article to capture knowledge for the team."
                    action={selectedSpace && <Button variant="action" onClick={() => setIsArticleFormOpen(true)}>Write Article</Button>} />
                ) : (
                  <div className="space-y-2">
                    {knowledgeArticles.map(art => (
                      <div key={art.id} onClick={() => { setSelectedArticle(art); setEditingArticle(false); setArticlePanel(null); fetchArticleChildren?.(art.id); }} role="button" tabIndex={0} onKeyDown={onPressKey}
                        className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 cursor-pointer hover:border-brand-navy/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy-tint/40">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{art.title}</p>
                            </div>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">{(art.content || '').substring(0, 120)}{(art.content || '').length > 120 ? '...' : ''}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-neutral-600 dark:text-neutral-400">v{art.versionNumber || 1} · {art.authorName || 'Unknown'}</span>
                              {art.updatedAt && <span className="text-xs text-neutral-600 dark:text-neutral-400">{new Date(art.updatedAt).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${art.status === 'PUBLISHED' ? 'bg-semantic-success-surface text-semantic-success' : art.status === 'DRAFT' ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500' : art.status === 'ARCHIVED' ? 'bg-neutral-200 dark:bg-neutral-600 text-neutral-500' : 'bg-semantic-warning-surface text-semantic-warning'}`}>{art.status || 'DRAFT'}</span>
                            <span className="text-xs bg-brand-navy/10 text-brand-navy px-1.5 py-0.5 rounded font-mono">{art.templateType || 'KB'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState icon={BookOpen} title="Select a space" subtitle="Choose a knowledge space from the left sidebar to browse articles, or search for specific content." />
            )}
          </div>
        )}

        {/* Article detail / editor panel */}
        {selectedArticle && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Article header */}
            <div className="border-b border-neutral-200 dark:border-neutral-700 px-6 py-4 flex items-center justify-between bg-white dark:bg-neutral-800 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => { setSelectedArticle(null); setEditingArticle(false); setArticlePanel(null); }} className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-navy transition-colors flex-shrink-0" aria-label="Back"><ArrowLeft className="h-4 w-4" aria-hidden="true" /></button>
                <div className="min-w-0">
                  <h1 className="font-bold text-lg text-neutral-900 dark:text-white truncate">{selectedArticle.title}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${selectedArticle.status === 'PUBLISHED' ? 'bg-semantic-success-surface text-semantic-success' : selectedArticle.status === 'DRAFT' ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500' : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-500'}`}>{selectedArticle.status || 'DRAFT'}</span>
                    <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{selectedArticle.templateType || 'KB'}</span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">v{selectedArticle.versionNumber || 1}</span>
                    {selectedArticle.updatedAt && <span className="text-xs text-neutral-600 dark:text-neutral-400">Updated {new Date(selectedArticle.updatedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {[
                  { key: 'history',   label: `History (${articleVersions.length})` },
                  { key: 'comments',  label: 'Comments' },
                  { key: 'analytics', label: 'Analytics' },
                ].map(p => (
                  <button key={p.key} onClick={() => openArticlePanel(p.key)} aria-pressed={articlePanel === p.key}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${articlePanel === p.key ? 'bg-brand-navy text-white border-brand-navy' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-brand-navy'}`}>
                    {p.label}
                  </button>
                ))}
                {/* Status-aware publishing workflow — single primary action per state */}
                {selectedArticle.status === 'IN_REVIEW' && (
                  <button onClick={() => rejectArticle(selectedArticle.id)} className="text-xs text-semantic-warning hover:underline">Request changes</button>
                )}
                {(!selectedArticle.status || selectedArticle.status === 'DRAFT') && (
                  <Button variant="action" onClick={() => submitArticleForReview(selectedArticle.id)}>Submit for review</Button>
                )}
                {selectedArticle.status === 'IN_REVIEW' && (
                  <Button variant="action" onClick={() => publishArticle(selectedArticle.id)}>Publish</Button>
                )}
                {selectedArticle.status === 'PUBLISHED' && (
                  <Button variant="secondary" onClick={() => archiveArticle(selectedArticle.id)}>Archive</Button>
                )}
                {selectedArticle.status === 'ARCHIVED' && (
                  <Button variant="secondary" onClick={() => restoreArticle(selectedArticle.id)}>Restore</Button>
                )}
                <Button variant="secondary" onClick={() => setEditingArticle(e => !e)}>
                  {editingArticle ? 'View' : 'Edit'}
                </Button>
                <button onClick={() => deleteArticle(selectedArticle.id)} className="text-xs text-semantic-danger hover:underline">Delete</button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Content area */}
              <div className="flex-1 overflow-y-auto p-6">
                {editingArticle ? (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="article-title" className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Title</label>
                      <input id="article-title" className="input text-lg font-bold w-full" value={selectedArticle.title || ''}
                        onChange={e => setSelectedArticle(a => ({ ...a, title: e.target.value }))}
                        onBlur={() => updateArticle(selectedArticle.id, { title: selectedArticle.title, content: selectedArticle.content })} />
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <label htmlFor="article-template-type" className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Template Type</label>
                        <select id="article-template-type" className="input text-sm w-48" value={selectedArticle.templateType || 'KB'}
                          onChange={e => { const t = e.target.value; setSelectedArticle(a => ({ ...a, templateType: t })); updateArticle(selectedArticle.id, { templateType: t }); }}>
                          {['KB','RUNBOOK','ADR','POSTMORTEM','ONBOARDING','TROUBLESHOOTING','CUSTOM'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      {/* B09 — content format toggle: markdown ↔ blocks */}
                      <div className="flex-1 flex justify-end">
                        <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-600 overflow-hidden" role="group" aria-label="Content format">
                          {(['markdown', 'blocks']).map(fmt => (
                            <button key={fmt} type="button"
                              onClick={() => setArticleContentFormat(fmt)}
                              aria-pressed={articleContentFormat === fmt}
                              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40 ${articleContentFormat === fmt ? 'bg-brand-navy text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                              {fmt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {articleContentFormat === 'markdown' ? (
                      <div>
                        <label htmlFor="article-content" className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Content (Markdown supported)</label>
                        <textarea id="article-content" rows={20} className="input resize-none font-mono text-sm w-full"
                          value={selectedArticle.content || ''}
                          onChange={e => setSelectedArticle(a => ({ ...a, content: e.target.value }))}
                          onBlur={() => updateArticle(selectedArticle.id, { title: selectedArticle.title, content: selectedArticle.content, templateType: selectedArticle.templateType })}
                          placeholder="Write your article content here... Supports Markdown formatting." />
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">Content (Block editor)</span>
                        <BlockEditor
                          blocks={(() => { try { return JSON.parse(selectedArticle.contentBlocks || '[]'); } catch { return []; } })()}
                          onChange={blocks => {
                            const json = JSON.stringify(blocks);
                            setSelectedArticle(a => ({ ...a, contentBlocks: json }));
                            updateArticle(selectedArticle.id, { contentBlocks: json, templateType: selectedArticle.templateType });
                          }}
                        />
                      </div>
                    )}
                    <Button variant="action" onClick={() => updateArticle(selectedArticle.id, { title: selectedArticle.title, content: selectedArticle.content, contentBlocks: selectedArticle.contentBlocks, templateType: selectedArticle.templateType })}>
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {selectedArticle.content ? (
                      <div className="text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap text-sm"
                        dangerouslySetInnerHTML={{ __html: renderMd(selectedArticle.content) }} />
                    ) : (
                      <EmptyState icon={FileText} title="No content yet" subtitle="Click Edit to start writing." action={<Button variant="action" onClick={() => setEditingArticle(true)}>Start Writing</Button>} />
                    )}
                  </div>
                )}
              </div>

              {/* Sub-articles (hierarchy) */}
              {!editingArticle && articleChildren.length > 0 && (
                <div className="px-6 pb-4 border-t border-neutral-100 dark:border-neutral-700 pt-4">
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5" aria-hidden="true" />
                    Sub-articles ({articleChildren.length})
                  </h3>
                  <div className="space-y-1">
                    {articleChildren.map(child => (
                      <button key={child.id}
                        onClick={() => { setSelectedArticle(child); setEditingArticle(false); setArticlePanel(null); fetchArticleChildren?.(child.id); }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 text-sm text-brand-navy dark:text-blue-300 hover:underline">
                        <FileText className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" aria-hidden="true" />
                        <span className="truncate">{child.title}</span>
                        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${child.status === 'PUBLISHED' ? 'bg-semantic-success/10 text-semantic-success' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>{child.status || 'DRAFT'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contextual side panel — history / comments / analytics */}
              {articlePanel === 'history' && (
                <div className="w-64 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto p-4">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Version history</h3>
                  {articleVersions.length === 0 ? (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">No versions saved yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {articleVersions.map(v => (
                        <div key={v.id} className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-neutral-200 dark:border-neutral-700">
                          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Version {v.versionNumber}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{v.savedBy || 'Unknown'}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">{v.savedAt ? new Date(v.savedAt).toLocaleString() : '—'}</p>
                          <button onClick={() => setSelectedArticle(a => ({ ...a, content: v.content }))}
                            className="text-xs text-brand-navy hover:underline mt-1">Restore</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {articlePanel === 'comments' && (
                <div className="w-72 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto p-4 flex flex-col">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Comments ({articleComments.length})</h3>
                  <div className="flex-1 space-y-2">
                    {articleComments.length === 0 && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">No comments yet. Start the discussion below.</p>
                    )}
                    {articleComments.map(c => (
                      <div key={c.id} className={`rounded-lg p-3 border ${c.resolved ? 'bg-semantic-success-surface border-semantic-success/30' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{c.authorName || 'Unknown'}</span>
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</span>
                        </div>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{c.body}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <button onClick={() => toggleArticleComment(selectedArticle.id, c.id, !c.resolved)}
                            className="text-xs text-brand-navy hover:underline">{c.resolved ? 'Reopen' : 'Resolve'}</button>
                          <button onClick={() => deleteArticleComment(selectedArticle.id, c.id)}
                            className="text-xs text-semantic-danger hover:underline">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <textarea rows={3} aria-label="Add a comment" value={newArticleComment} onChange={e => setNewArticleComment(e.target.value)}
                      placeholder="Add a comment…" className="input resize-none text-xs w-full" />
                    <Button variant="action" className="mt-2 w-full" onClick={() => addArticleComment(selectedArticle.id)}>Comment</Button>
                  </div>
                </div>
              )}

              {articlePanel === 'analytics' && (
                <div className="w-64 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto p-4">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Analytics</h3>
                  {!articleAnalytics ? (
                    <div className="space-y-2 animate-pulse" aria-busy="true" aria-label="Loading article analytics">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex justify-between">
                          <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
                          <div className="h-3 w-6 bg-neutral-200 dark:bg-neutral-700 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[
                        { label: 'Views', value: articleAnalytics.viewCount },
                        { label: 'Helpful votes', value: articleAnalytics.helpfulVotes },
                        { label: 'Work-item citations', value: articleAnalytics.citationCount },
                        { label: 'Open comments', value: articleAnalytics.openComments },
                        { label: 'Versions', value: articleAnalytics.versionCount },
                        { label: 'Days since update', value: articleAnalytics.daysSinceUpdate },
                      ].map(m => (
                        <div key={m.label} className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">{m.label}</span>
                          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{m.value ?? '—'}</span>
                        </div>
                      ))}
                      {articleAnalytics.stale && (
                        <div className="bg-semantic-warning-surface border border-semantic-warning/30 rounded-lg p-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-semantic-warning flex-shrink-0" aria-hidden="true" />
                          <span className="text-xs text-semantic-warning font-medium">Stale — published over {90} days ago without an update.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
